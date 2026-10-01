import AVFoundation
import ExpoModulesCore
import Foundation

private let modelsDirectoryName = "local-ai"
private let targetSampleRate: Double = 16000
private let decodeInputFrames: AVAudioFrameCount = 16384

internal final class ModelsDirectoryUnavailableException: Exception {
  override var reason: String {
    "The application support directory is unavailable"
  }
}

internal final class AudioDecodeException: Exception {
  override var reason: String {
    "The recording could not be decoded"
  }
}

private func applicationSupportDirectory() throws -> URL {
  guard let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
    throw ModelsDirectoryUnavailableException()
  }
  return directory
}

private func preparedModelsDirectory() throws -> URL {
  var directory = try applicationSupportDirectory().appendingPathComponent(modelsDirectoryName, isDirectory: true)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  var backupExclusion = URLResourceValues()
  backupExclusion.isExcludedFromBackup = true
  try directory.setResourceValues(backupExclusion)
  return directory
}

private func allocatedSize(of directory: URL, includeHidden: Bool = false) -> Double {
  let keys: [URLResourceKey] = [.isRegularFileKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey]
  guard let enumerator = FileManager.default.enumerator(
    at: directory,
    includingPropertiesForKeys: keys,
    options: includeHidden ? [] : [.skipsHiddenFiles]
  ) else { return 0 }

  var total: Double = 0
  for case let url as URL in enumerator {
    guard let values = try? url.resourceValues(forKeys: Set(keys)), values.isRegularFile == true else { continue }
    total += Double(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? 0)
  }
  return total
}

private func decodeToMonoPcm(inputPath: String, outputPath: String) throws -> [String: Double] {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: inputPath))
  let sourceFormat = file.processingFormat
  guard
    let outputFormat = AVAudioFormat(
      commonFormat: .pcmFormatInt16,
      sampleRate: targetSampleRate,
      channels: 1,
      interleaved: true
    ),
    let converter = AVAudioConverter(from: sourceFormat, to: outputFormat)
  else {
    throw AudioDecodeException()
  }

  FileManager.default.createFile(atPath: outputPath, contents: nil)
  guard let handle = FileHandle(forWritingAtPath: outputPath) else { throw AudioDecodeException() }
  defer { try? handle.close() }

  let outputCapacity = AVAudioFrameCount(Double(decodeInputFrames) * targetSampleRate / sourceFormat.sampleRate) + 1024
  var reachedEnd = false
  var writtenFrames: Double = 0

  while true {
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else {
      throw AudioDecodeException()
    }
    var conversionError: NSError?
    let status = converter.convert(to: outputBuffer, error: &conversionError) { _, inputStatus in
      if reachedEnd {
        inputStatus.pointee = .endOfStream
        return nil
      }
      guard let inputBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: decodeInputFrames) else {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      do {
        try file.read(into: inputBuffer)
      } catch {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      if inputBuffer.frameLength == 0 {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      inputStatus.pointee = .haveData
      return inputBuffer
    }

    if status == .error || conversionError != nil { throw AudioDecodeException() }
    if outputBuffer.frameLength > 0, let channel = outputBuffer.int16ChannelData {
      let byteCount = Int(outputBuffer.frameLength) * MemoryLayout<Int16>.size
      handle.write(Data(bytes: channel[0], count: byteCount))
      writtenFrames += Double(outputBuffer.frameLength)
    }
    if status == .endOfStream { break }
  }

  return [
    "durationMs": writtenFrames / targetSampleRate * 1000,
    "bytes": writtenFrames * Double(MemoryLayout<Int16>.size)
  ]
}

internal final class PcmStreamUnavailableException: Exception {
  override var reason: String {
    "The microphone could not be started"
  }
}

private let streamTapBufferSize: AVAudioFrameCount = 4096
private let streamLevelGain: Double = 4

private final class PcmStreamer {
  private let engine = AVAudioEngine()
  private var converter: AVAudioConverter?
  private let outputFormat = AVAudioFormat(
    commonFormat: .pcmFormatInt16,
    sampleRate: targetSampleRate,
    channels: 1,
    interleaved: true
  )
  var onChunk: ((Data, Double) -> Void)?

  func start() throws {
    guard let outputFormat else { throw PcmStreamUnavailableException() }
    let input = engine.inputNode
    let inputFormat = input.outputFormat(forBus: 0)
    guard inputFormat.sampleRate > 0,
          let converter = AVAudioConverter(from: inputFormat, to: outputFormat)
    else {
      throw PcmStreamUnavailableException()
    }
    self.converter = converter
    input.installTap(onBus: 0, bufferSize: streamTapBufferSize, format: inputFormat) { [weak self] buffer, _ in
      self?.convert(buffer)
    }
    engine.prepare()
    do {
      try engine.start()
    } catch {
      input.removeTap(onBus: 0)
      throw PcmStreamUnavailableException()
    }
  }

  func stop() {
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    converter = nil
  }

  private func convert(_ buffer: AVAudioPCMBuffer) {
    guard let converter, let outputFormat else { return }
    let capacity = AVAudioFrameCount(Double(buffer.frameLength) * targetSampleRate / buffer.format.sampleRate) + 64
    guard let output = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: capacity) else { return }
    var supplied = false
    var conversionError: NSError?
    converter.convert(to: output, error: &conversionError) { _, inputStatus in
      if supplied {
        inputStatus.pointee = .noDataNow
        return nil
      }
      supplied = true
      inputStatus.pointee = .haveData
      return buffer
    }
    guard conversionError == nil, output.frameLength > 0, let channel = output.int16ChannelData else { return }
    let frameCount = Int(output.frameLength)
    var sumSquares: Double = 0
    for index in 0..<frameCount {
      let sample = Double(channel[0][index]) / 32768
      sumSquares += sample * sample
    }
    let level = min(1, (sumSquares / Double(frameCount)).squareRoot() * streamLevelGain)
    onChunk?(Data(bytes: channel[0], count: frameCount * MemoryLayout<Int16>.size), level)
  }
}

public class ExpoLocalAiModule: Module {
  private var pcmStreamer: PcmStreamer?

  public func definition() -> ModuleDefinition {
    Name("ExpoLocalAi")

    Events("onPcmChunk")

    OnDestroy {
      self.pcmStreamer?.stop()
      self.pcmStreamer = nil
    }

    AsyncFunction("prepareModelsDirectory") { () throws -> String in
      try preparedModelsDirectory().path
    }

    AsyncFunction("deleteModelsDirectory") { () throws -> Bool in
      let directory = try applicationSupportDirectory().appendingPathComponent(modelsDirectoryName, isDirectory: true)
      guard FileManager.default.fileExists(atPath: directory.path) else { return false }
      try FileManager.default.removeItem(at: directory)
      return true
    }

    AsyncFunction("getDiskSpace") { () throws -> [String: Double] in
      let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
      let values = try home.resourceValues(forKeys: [
        .volumeAvailableCapacityForImportantUsageKey,
        .volumeTotalCapacityKey
      ])
      return [
        "freeBytes": Double(values.volumeAvailableCapacityForImportantUsage ?? 0),
        "totalBytes": Double(values.volumeTotalCapacity ?? 0)
      ]
    }

    AsyncFunction("getStorageRoots") { () -> [String: Any] in
      let fileManager = FileManager.default
      let resolve = { (url: URL?) -> String in url?.resolvingSymlinksInPath().path ?? "" }
      var roots: [String: Any] = [
        "home": resolve(URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)),
        "documents": resolve(fileManager.urls(for: .documentDirectory, in: .userDomainMask).first),
        "caches": resolve(fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first),
        "models": resolve(try? applicationSupportDirectory().appendingPathComponent(modelsDirectoryName, isDirectory: true)),
        "appBytes": allocatedSize(of: Bundle.main.bundleURL, includeHidden: true)
      ]
      if let group = Bundle.main.object(forInfoDictionaryKey: "PearNotesAppGroupIdentifier") as? String,
         let container = fileManager.containerURL(forSecurityApplicationGroupIdentifier: group) {
        roots["shared"] = resolve(container)
      }
      return roots
    }

    AsyncFunction("listDirectorySizes") { (path: String) -> [[String: Any]] in
      let keys: [URLResourceKey] = [.isDirectoryKey, .isSymbolicLinkKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey]
      let directory = URL(fileURLWithPath: path, isDirectory: true)
      guard let children = try? FileManager.default.contentsOfDirectory(
        at: directory,
        includingPropertiesForKeys: keys,
        options: []
      ) else { return [] }
      return children.compactMap { url in
        guard let values = try? url.resourceValues(forKeys: Set(keys)), values.isSymbolicLink != true else { return nil }
        let isDirectory = values.isDirectory == true
        let bytes = isDirectory
          ? allocatedSize(of: url, includeHidden: true)
          : Double(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? 0)
        return ["name": url.lastPathComponent, "isDirectory": isDirectory, "bytes": bytes]
      }
    }

    AsyncFunction("getDirectorySize") { (path: String) -> Double in
      allocatedSize(of: URL(fileURLWithPath: path, isDirectory: true))
    }

    AsyncFunction("decodeAudioToPcm") { (inputPath: String, outputPath: String) throws -> [String: Double] in
      try decodeToMonoPcm(inputPath: inputPath, outputPath: outputPath)
    }

    Function("getSupportedAbis") { () -> [String] in
      ["arm64"]
    }

    Function("is64BitProcess") { () -> Bool in
      MemoryLayout<Int>.size == 8
    }

    AsyncFunction("startPcmStream") { () throws in
      self.pcmStreamer?.stop()
      let streamer = PcmStreamer()
      streamer.onChunk = { [weak self] data, level in
        self?.sendEvent("onPcmChunk", ["data": data.base64EncodedString(), "level": level])
      }
      try streamer.start()
      self.pcmStreamer = streamer
    }

    AsyncFunction("stopPcmStream") { () in
      self.pcmStreamer?.stop()
      self.pcmStreamer = nil
    }
  }
}
