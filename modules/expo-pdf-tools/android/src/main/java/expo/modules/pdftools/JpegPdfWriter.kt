package expo.modules.pdftools

import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Locale

data class PdfImagePage(
  val jpegBytes: ByteArray,
  val pixelWidth: Int,
  val pixelHeight: Int,
  val grayscale: Boolean,
  val pageWidth: Int,
  val pageHeight: Int
)

private const val CATALOG_OBJECT = 1
private const val PAGES_OBJECT = 2
private const val FIRST_PAGE_OBJECT = 3
private const val OBJECTS_PER_PAGE = 3

private fun ByteArrayOutputStream.writeAscii(value: String) {
  write(value.toByteArray(Charsets.ISO_8859_1))
}

fun writeJpegPdf(pages: List<PdfImagePage>, output: File) {
  val body = ByteArrayOutputStream()
  val objectCount = 2 + pages.size * OBJECTS_PER_PAGE
  val offsets = IntArray(objectCount + 1)

  body.writeAscii("%PDF-1.4\n%âãÏÓ\n")

  offsets[CATALOG_OBJECT] = body.size()
  body.writeAscii("$CATALOG_OBJECT 0 obj\n<</Type/Catalog/Pages $PAGES_OBJECT 0 R>>\nendobj\n")

  val kids = pages.indices.joinToString(" ") { "${FIRST_PAGE_OBJECT + it * OBJECTS_PER_PAGE} 0 R" }
  offsets[PAGES_OBJECT] = body.size()
  body.writeAscii(
    "$PAGES_OBJECT 0 obj\n<</Type/Pages/Kids[$kids]/Count ${pages.size}>>\nendobj\n"
  )

  pages.forEachIndexed { index, page ->
    val pageObject = FIRST_PAGE_OBJECT + index * OBJECTS_PER_PAGE
    val imageObject = pageObject + 1
    val contentObject = pageObject + 2

    offsets[pageObject] = body.size()
    body.writeAscii(
      "$pageObject 0 obj\n<</Type/Page/Parent $PAGES_OBJECT 0 R" +
        "/MediaBox[0 0 ${page.pageWidth} ${page.pageHeight}]" +
        "/Resources<</XObject<</Im0 $imageObject 0 R>>>>" +
        "/Contents $contentObject 0 R>>\nendobj\n"
    )

    val colorSpace = if (page.grayscale) "/DeviceGray" else "/DeviceRGB"
    offsets[imageObject] = body.size()
    body.writeAscii(
      "$imageObject 0 obj\n<</Type/XObject/Subtype/Image" +
        "/Width ${page.pixelWidth}/Height ${page.pixelHeight}" +
        "/ColorSpace $colorSpace/BitsPerComponent 8/Filter/DCTDecode" +
        "/Length ${page.jpegBytes.size}>>\nstream\n"
    )
    body.write(page.jpegBytes)
    body.writeAscii("\nendstream\nendobj\n")

    val content = "q ${page.pageWidth} 0 0 ${page.pageHeight} 0 0 cm /Im0 Do Q\n"
    offsets[contentObject] = body.size()
    body.writeAscii(
      "$contentObject 0 obj\n<</Length ${content.length}>>\nstream\n$content" +
        "endstream\nendobj\n"
    )
  }

  val xrefOffset = body.size()
  body.writeAscii("xref\n0 ${objectCount + 1}\n")
  body.writeAscii("0000000000 65535 f \n")
  for (objectNumber in 1..objectCount) {
    body.writeAscii(String.format(Locale.US, "%010d 00000 n \n", offsets[objectNumber]))
  }
  body.writeAscii(
    "trailer\n<</Size ${objectCount + 1}/Root $CATALOG_OBJECT 0 R>>\n" +
      "startxref\n$xrefOffset\n%%EOF\n"
  )

  output.parentFile?.mkdirs()
  output.writeBytes(body.toByteArray())
}
