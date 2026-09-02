package expo.modules.pdftools

data class JpegInfo(val width: Int, val height: Int, val components: Int, val progressive: Boolean)

private const val MARKER_PREFIX = 0xFF
private const val MARKER_SOI = 0xD8
private const val MARKER_TEM = 0x01
private const val MARKER_SOS = 0xDA
private const val MARKER_EOI = 0xD9
private const val MARKER_DHT = 0xC4
private const val MARKER_JPG = 0xC8
private const val MARKER_DAC = 0xCC
private const val MARKER_RST_FIRST = 0xD0
private const val MARKER_RST_LAST = 0xD7
private const val MARKER_SOF_FIRST = 0xC0
private const val MARKER_SOF_LAST = 0xCF

private val progressiveMarkers = setOf(0xC2, 0xC6, 0xCA, 0xCE)

private fun ByteArray.byteAt(index: Int) = this[index].toInt() and 0xFF

private fun ByteArray.shortAt(index: Int) = (byteAt(index) shl 8) or byteAt(index + 1)

fun parseJpeg(bytes: ByteArray): JpegInfo? {
  if (bytes.size < 4) return null
  if (bytes.byteAt(0) != MARKER_PREFIX || bytes.byteAt(1) != MARKER_SOI) return null

  var offset = 2
  while (offset + 3 < bytes.size) {
    if (bytes.byteAt(offset) != MARKER_PREFIX) {
      offset++
      continue
    }
    var marker = bytes.byteAt(offset + 1)
    while (marker == MARKER_PREFIX && offset + 2 < bytes.size) {
      offset++
      marker = bytes.byteAt(offset + 1)
    }
    if (marker == MARKER_SOI || marker == MARKER_TEM || marker in MARKER_RST_FIRST..MARKER_RST_LAST) {
      offset += 2
      continue
    }
    if (marker == MARKER_SOS || marker == MARKER_EOI) return null

    val isFrameHeader = marker in MARKER_SOF_FIRST..MARKER_SOF_LAST &&
      marker != MARKER_DHT && marker != MARKER_JPG && marker != MARKER_DAC
    if (isFrameHeader) {
      if (offset + 9 >= bytes.size) return null
      return JpegInfo(
        width = bytes.shortAt(offset + 7),
        height = bytes.shortAt(offset + 5),
        components = bytes.byteAt(offset + 9),
        progressive = marker in progressiveMarkers
      )
    }
    offset += 2 + bytes.shortAt(offset + 2)
  }
  return null
}
