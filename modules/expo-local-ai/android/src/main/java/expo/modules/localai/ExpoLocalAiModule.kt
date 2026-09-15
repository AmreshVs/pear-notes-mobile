package expo.modules.localai

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaRecorder
import android.os.Build
import android.os.StatFs
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

private const val MODULE_NAME = "ExpoLocalAi"
private const val MODELS_DIRECTORY = "local-ai"
private const val TARGET_SAMPLE_RATE = 16000
private const val CODEC_TIMEOUT_US = 10_000L
private const val PCM_SHORT_SCALE = 32768f

private const val STREAM_CHUNK_MS = 100
private const val STREAM_LEVEL_GAIN = 4.0
private const val STREAM_STOP_JOIN_MS = 500L
private const val MICROPHONE_UNAVAILABLE = "The microphone could not be started"

class AudioDecodeException(message: String) : CodedException(message)

class PcmStreamException(message: String) : CodedException(message)

private fun pcmLevel(chunk: ByteArray, length: Int): Double {
  val samples = length / 2
  if (samples == 0) return 0.0
  var sumSquares = 0.0
  for (index in 0 until samples) {
    val low = chunk[index * 2].toInt() and 0xff
    val high = chunk[index * 2 + 1].toInt()
    val sample = ((high shl 8) or low).toShort().toDouble() / PCM_SHORT_SCALE
    sumSquares += sample * sample
  }
  return minOf(1.0, Math.sqrt(sumSquares / samples) * STREAM_LEVEL_GAIN)
}

private class PcmStreamer(private val onChunk: (ByteArray, Double) -> Unit) {
  @Volatile private var running = false
  private var recorder: AudioRecord? = null
  private var worker: Thread? = null

  @SuppressLint("MissingPermission")
  fun start() {
    val chunkBytes = TARGET_SAMPLE_RATE * STREAM_CHUNK_MS / 1000 * 2
    val minBuffer = AudioRecord.getMinBufferSize(
      TARGET_SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    if (minBuffer <= 0) throw PcmStreamException(MICROPHONE_UNAVAILABLE)
    val record = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      TARGET_SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBuffer, chunkBytes * 2)
    )
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      throw PcmStreamException(MICROPHONE_UNAVAILABLE)
    }
    recorder = record
    running = true
    record.startRecording()
    worker = Thread {
      val buffer = ByteArray(chunkBytes)
      while (running) {
        val read = record.read(buffer, 0, buffer.size)
        if (read > 0) onChunk(buffer.copyOf(read), pcmLevel(buffer, read))
      }
    }.also { it.start() }
  }

  fun stop() {
    running = false
    worker?.join(STREAM_STOP_JOIN_MS)
    worker = null
    recorder?.let { record ->
      runCatching { record.stop() }
      record.release()
    }
    recorder = null
  }
}

private class MonoResampler(private val targetRate: Int) {
  private var inputIndex = -1L
  private var nextOutputTime = 0.0
  private var previous = 0f
  var writtenSamples = 0L
    private set

  fun write(buffer: ByteBuffer, channels: Int, sourceRate: Int, encoding: Int, out: OutputStream) {
    val isFloat = encoding == AudioFormat.ENCODING_PCM_FLOAT
    val bytesPerSample = if (isFloat) 4 else 2
    val safeChannels = channels.coerceAtLeast(1)
    val frameCount = buffer.remaining() / (bytesPerSample * safeChannels)
    val step = sourceRate.toDouble() / targetRate
    val output = ByteArray(((frameCount / step) + 2).toInt() * 2)
    var outputBytes = 0

    fun emit(value: Float) {
      val sample = (value * PCM_SHORT_SCALE).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
      if (outputBytes + 2 > output.size) return
      output[outputBytes++] = (sample and 0xff).toByte()
      output[outputBytes++] = ((sample shr 8) and 0xff).toByte()
      writtenSamples++
    }

    repeat(frameCount) {
      var sum = 0f
      repeat(safeChannels) {
        sum += if (isFloat) buffer.float else buffer.short / PCM_SHORT_SCALE
      }
      val current = sum / safeChannels
      inputIndex++
      if (inputIndex == 0L) {
        emit(current)
        nextOutputTime = step
      } else {
        while (nextOutputTime <= inputIndex) {
          val fraction = (nextOutputTime - (inputIndex - 1)).toFloat()
          emit(previous + (current - previous) * fraction)
          nextOutputTime += step
        }
      }
      previous = current
    }

    out.write(output, 0, outputBytes)
  }
}

private fun decodeToMonoPcm(inputPath: String, outputPath: String): Map<String, Double> {
  val extractor = MediaExtractor()
  extractor.setDataSource(inputPath)
  val trackIndex = (0 until extractor.trackCount).firstOrNull { index ->
    extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
  }
  if (trackIndex == null) {
    extractor.release()
    throw AudioDecodeException("The recording has no audio track")
  }
  extractor.selectTrack(trackIndex)
  val inputFormat = extractor.getTrackFormat(trackIndex)
  val mime = inputFormat.getString(MediaFormat.KEY_MIME) ?: run {
    extractor.release()
    throw AudioDecodeException("The recording format is not supported")
  }

  val codec = MediaCodec.createDecoderByType(mime)
  var sampleRate = inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
  var channels = inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
  var encoding = AudioFormat.ENCODING_PCM_16BIT
  val resampler = MonoResampler(TARGET_SAMPLE_RATE)
  val info = MediaCodec.BufferInfo()
  var inputDone = false

  try {
    codec.configure(inputFormat, null, null, 0)
    codec.start()
    BufferedOutputStream(FileOutputStream(outputPath)).use { out ->
      while (true) {
        if (!inputDone) {
          val inputIndex = codec.dequeueInputBuffer(CODEC_TIMEOUT_US)
          if (inputIndex >= 0) {
            val inputBuffer = codec.getInputBuffer(inputIndex) ?: throw AudioDecodeException("Decoder input unavailable")
            val size = extractor.readSampleData(inputBuffer, 0)
            if (size < 0) {
              codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              codec.queueInputBuffer(inputIndex, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }

        val outputIndex = codec.dequeueOutputBuffer(info, CODEC_TIMEOUT_US)
        if (outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          val format = codec.outputFormat
          sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
          channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
          if (format.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
            encoding = format.getInteger(MediaFormat.KEY_PCM_ENCODING)
          }
        } else if (outputIndex >= 0) {
          val outputBuffer = codec.getOutputBuffer(outputIndex)
          if (outputBuffer != null && info.size > 0) {
            outputBuffer.position(info.offset)
            outputBuffer.limit(info.offset + info.size)
            resampler.write(outputBuffer.slice().order(ByteOrder.nativeOrder()), channels, sampleRate, encoding, out)
          }
          codec.releaseOutputBuffer(outputIndex, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
        }
      }
    }
  } finally {
    runCatching { codec.stop() }
    codec.release()
    extractor.release()
  }

  return mapOf(
    "durationMs" to resampler.writtenSamples * 1000.0 / TARGET_SAMPLE_RATE,
    "bytes" to resampler.writtenSamples * 2.0
  )
}

class ExpoLocalAiModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var pcmStreamer: PcmStreamer? = null

  private fun modelsDirectory(): File = File(context.filesDir, MODELS_DIRECTORY)

  override fun definition() = ModuleDefinition {
    Name(MODULE_NAME)

    Events("onPcmChunk")

    OnDestroy {
      pcmStreamer?.stop()
      pcmStreamer = null
    }

    AsyncFunction("startPcmStream") {
      pcmStreamer?.stop()
      val streamer = PcmStreamer { data, level ->
        sendEvent(
          "onPcmChunk",
          mapOf("data" to Base64.encodeToString(data, Base64.NO_WRAP), "level" to level)
        )
      }
      streamer.start()
      pcmStreamer = streamer
    }

    AsyncFunction("stopPcmStream") {
      pcmStreamer?.stop()
      pcmStreamer = null
    }

    AsyncFunction("prepareModelsDirectory") {
      val directory = modelsDirectory()
      if (!directory.exists()) directory.mkdirs()
      directory.absolutePath
    }

    AsyncFunction("deleteModelsDirectory") {
      val directory = modelsDirectory()
      directory.exists() && directory.deleteRecursively()
    }

    AsyncFunction("getDiskSpace") {
      val stat = StatFs(context.filesDir.absolutePath)
      mapOf(
        "freeBytes" to stat.availableBytes.toDouble(),
        "totalBytes" to stat.totalBytes.toDouble()
      )
    }

    AsyncFunction("getDirectorySize") { path: String ->
      File(path).walkTopDown().filter { it.isFile }.sumOf { it.length() }.toDouble()
    }

    AsyncFunction("decodeAudioToPcm") { inputPath: String, outputPath: String ->
      decodeToMonoPcm(inputPath, outputPath)
    }

    Function("getSupportedAbis") {
      Build.SUPPORTED_ABIS.toList()
    }

    Function("is64BitProcess") {
      android.os.Process.is64Bit()
    }
  }
}
