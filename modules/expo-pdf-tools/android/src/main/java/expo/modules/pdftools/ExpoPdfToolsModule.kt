package expo.modules.pdftools

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import android.os.ext.SdkExtensions
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val PAGE_MAX_WIDTH = 612f
private const val PAGE_MAX_HEIGHT = 792f
private const val REENCODE_JPEG_QUALITY = 85
private const val REENCODE_MAX_DIMENSION = 2400
private const val THUMBNAIL_JPEG_QUALITY = 80
private const val DEFAULT_THUMBNAIL_MAX_WIDTH = 512.0
private const val GRAYSCALE_COMPONENTS = 1
private const val RGB_COMPONENTS = 3

private fun normalizedPath(value: String): String {
  if (!value.startsWith("file://")) return value
  return Uri.parse(value).path ?: value.removePrefix("file://")
}

private fun pageSizeFor(width: Int, height: Int): Pair<Int, Int> {
  if (width <= 0 || height <= 0) return PAGE_MAX_WIDTH.toInt() to PAGE_MAX_HEIGHT.toInt()
  val scale = min(PAGE_MAX_WIDTH / width, PAGE_MAX_HEIGHT / height)
  return max(1, (width * scale).roundToInt()) to max(1, (height * scale).roundToInt())
}

private fun rotationDegrees(file: File): Int = try {
  when (ExifInterface(file.absolutePath).getAttributeInt(
    ExifInterface.TAG_ORIENTATION,
    ExifInterface.ORIENTATION_NORMAL
  )) {
    ExifInterface.ORIENTATION_ROTATE_90 -> 90
    ExifInterface.ORIENTATION_ROTATE_180 -> 180
    ExifInterface.ORIENTATION_ROTATE_270 -> 270
    else -> 0
  }
} catch (_: Exception) {
  0
}

private fun sampleSizeFor(width: Int, height: Int): Int {
  var sampleSize = 1
  while (max(width, height) / sampleSize > REENCODE_MAX_DIMENSION) sampleSize *= 2
  return sampleSize
}

private fun reencodeToJpeg(file: File): PdfImagePage? {
  val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeFile(file.absolutePath, bounds)
  if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

  val options = BitmapFactory.Options().apply {
    inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight)
  }
  val decoded = BitmapFactory.decodeFile(file.absolutePath, options) ?: return null

  val rotation = rotationDegrees(file)
  val oriented = if (rotation == 0) {
    decoded
  } else {
    val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
    Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true).also {
      if (it != decoded) decoded.recycle()
    }
  }

  val stream = ByteArrayOutputStream()
  val compressed = oriented.compress(Bitmap.CompressFormat.JPEG, REENCODE_JPEG_QUALITY, stream)
  val width = oriented.width
  val height = oriented.height
  oriented.recycle()
  if (!compressed) return null

  val (pageWidth, pageHeight) = pageSizeFor(width, height)
  return PdfImagePage(
    jpegBytes = stream.toByteArray(),
    pixelWidth = width,
    pixelHeight = height,
    grayscale = false,
    pageWidth = pageWidth,
    pageHeight = pageHeight
  )
}

private fun loadPage(path: String): PdfImagePage? {
  val file = File(path)
  if (!file.isFile) return null

  val bytes = try {
    file.readBytes()
  } catch (_: Exception) {
    return null
  }

  val info = parseJpeg(bytes)
  val embeddable = info != null &&
    !info.progressive &&
    (info.components == GRAYSCALE_COMPONENTS || info.components == RGB_COMPONENTS) &&
    rotationDegrees(file) == 0

  if (embeddable) {
    val (pageWidth, pageHeight) = pageSizeFor(info!!.width, info.height)
    return PdfImagePage(
      jpegBytes = bytes,
      pixelWidth = info.width,
      pixelHeight = info.height,
      grayscale = info.components == GRAYSCALE_COMPONENTS,
      pageWidth = pageWidth,
      pageHeight = pageHeight
    )
  }

  return reencodeToJpeg(file)
}

class ExpoPdfToolsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPdfTools")

    AsyncFunction("createPdfFromImages") { options: Map<String, Any?> ->
      @Suppress("UNCHECKED_CAST")
      val imagePaths = options["imagePaths"] as? List<String>
        ?: throw IllegalArgumentException("imagePaths is required.")
      val outputPath = options["outputPath"] as? String
        ?: throw IllegalArgumentException("outputPath is required.")
      if (imagePaths.isEmpty()) throw IllegalArgumentException("imagePaths is empty.")

      val pages = imagePaths.mapNotNull { loadPage(normalizedPath(it)) }
      if (pages.isEmpty()) throw IllegalStateException("None of the supplied images could be read.")

      val output = File(normalizedPath(outputPath))
      writeJpegPdf(pages, output)

      mapOf(
        "uri" to Uri.fromFile(output).toString(),
        "pageCount" to pages.size
      )
    }

    AsyncFunction("getPdfText") { options: Map<String, Any?> ->
      val url = options["url"] as? String ?: throw IllegalArgumentException("url is required.")
      val maxPages = max(1, (options["maxPages"] as? Number)?.toInt() ?: 20)
      val maxChars = max(1, (options["maxChars"] as? Number)?.toInt() ?: 20000)
      val source = File(normalizedPath(url))
      if (!source.isFile) throw IllegalStateException("The PDF could not be opened.")
      ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          mapOf(
            "text" to if (canReadPdfText()) readPdfText(renderer, maxPages, maxChars) else "",
            "pageCount" to renderer.pageCount
          )
        }
      }
    }

    AsyncFunction("getPdfThumbnail") { options: Map<String, Any?> ->
      val url = options["url"] as? String ?: throw IllegalArgumentException("url is required.")
      val outputPath = options["outputPath"] as? String
        ?: throw IllegalArgumentException("outputPath is required.")
      val maxWidth = (options["maxWidth"] as? Number)?.toDouble() ?: DEFAULT_THUMBNAIL_MAX_WIDTH
      val pageIndex = max(0, (options["pageIndex"] as? Number)?.toInt() ?: 0)
      val allowUpscale = options["allowUpscale"] as? Boolean ?: false

      val source = File(normalizedPath(url))
      if (!source.isFile) throw IllegalStateException("The PDF could not be opened.")

      ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          if (renderer.pageCount <= pageIndex) throw IllegalStateException("The PDF has no such page.")
          renderer.openPage(pageIndex).use { page ->
            val scale = if (allowUpscale) maxWidth / page.width else min(maxWidth / page.width, 1.0)
            val width = max(1, (page.width * scale).roundToInt())
            val height = max(1, (page.height * scale).roundToInt())
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(android.graphics.Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

            val output = File(normalizedPath(outputPath))
            output.parentFile?.mkdirs()
            output.outputStream().use { stream ->
              bitmap.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_JPEG_QUALITY, stream)
            }
            bitmap.recycle()

            mapOf(
              "uri" to Uri.fromFile(output).toString(),
              "width" to width,
              "height" to height,
              "pageCount" to renderer.pageCount
            )
          }
        }
      }
    }
  }

  private fun canReadPdfText(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM &&
      SdkExtensions.getExtensionVersion(Build.VERSION_CODES.S) >= 13

  @Suppress("NewApi")
  private fun readPdfText(renderer: PdfRenderer, maxPages: Int, maxChars: Int): String {
    val text = StringBuilder()
    for (index in 0 until min(renderer.pageCount, maxPages)) {
      if (text.length >= maxChars) break
      renderer.openPage(index).use { page ->
        for (content in page.textContents) {
          text.append(content.text).append('\n')
        }
      }
    }
    return text.take(maxChars).toString()
  }
}
