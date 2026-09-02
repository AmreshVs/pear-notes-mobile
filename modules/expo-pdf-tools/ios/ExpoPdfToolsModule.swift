import ExpoModulesCore
import ImageIO
import PDFKit
import UIKit
import UniformTypeIdentifiers

private let pdfPageMaxWidth: CGFloat = 612
private let pdfPageMaxHeight: CGFloat = 792
private let reencodeJpegQuality: CGFloat = 0.85
private let defaultThumbnailMaxWidth: Double = 512
private let thumbnailJpegQuality: CGFloat = 0.8

private struct PdfPageImage {
  let image: CGImage
  let pageSize: CGSize
}

private func normalizedPath(_ value: String) -> String {
  guard value.hasPrefix("file://") else { return value }
  if let url = URL(string: value) { return url.path }
  return String(value.dropFirst("file://".count)).removingPercentEncoding ?? value
}

private func fittedPageSize(width: CGFloat, height: CGFloat) -> CGSize {
  guard width > 0, height > 0 else { return CGSize(width: pdfPageMaxWidth, height: pdfPageMaxHeight) }
  let scale = min(pdfPageMaxWidth / width, pdfPageMaxHeight / height)
  return CGSize(width: (width * scale).rounded(), height: (height * scale).rounded())
}

private func passthroughImage(from data: Data) -> CGImage? {
  guard let provider = CGDataProvider(data: data as CFData) else { return nil }
  return CGImage(
    jpegDataProviderSource: provider,
    decode: nil,
    shouldInterpolate: true,
    intent: .defaultIntent
  )
}

private func loadPageImage(at path: String) -> PdfPageImage? {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
  else { return nil }

  let orientation = properties[kCGImagePropertyOrientation] as? UInt32 ?? 1
  let isJpeg = (CGImageSourceGetType(source) as String?) == UTType.jpeg.identifier

  if isJpeg, orientation == 1, let data = try? Data(contentsOf: url),
     let image = passthroughImage(from: data) {
    let size = fittedPageSize(width: CGFloat(image.width), height: CGFloat(image.height))
    return PdfPageImage(image: image, pageSize: size)
  }

  guard let uiImage = UIImage(contentsOfFile: path),
        let data = uiImage.jpegData(compressionQuality: reencodeJpegQuality),
        let image = passthroughImage(from: data)
  else { return nil }
  let size = fittedPageSize(width: CGFloat(image.width), height: CGFloat(image.height))
  return PdfPageImage(image: image, pageSize: size)
}

public class ExpoPdfToolsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoPdfTools")

    AsyncFunction("createPdfFromImages") { (options: [String: Any], promise: Promise) in
      guard let imagePaths = options["imagePaths"] as? [String], !imagePaths.isEmpty,
            let outputPath = options["outputPath"] as? String
      else {
        promise.reject(Exception(name: "InvalidArguments", description: "imagePaths and outputPath are required."))
        return
      }

      let pages = imagePaths.compactMap { loadPageImage(at: normalizedPath($0)) }
      guard !pages.isEmpty else {
        promise.reject(Exception(name: "NoReadableImages", description: "None of the supplied images could be read."))
        return
      }

      let outputUrl = URL(fileURLWithPath: normalizedPath(outputPath))
      try? FileManager.default.createDirectory(
        at: outputUrl.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )

      var firstBox = CGRect(origin: .zero, size: pages[0].pageSize)
      guard let context = CGContext(outputUrl as CFURL, mediaBox: &firstBox, nil) else {
        promise.reject(Exception(name: "PdfContextFailed", description: "Could not create a PDF context."))
        return
      }

      for page in pages {
        var box = CGRect(origin: .zero, size: page.pageSize)
        context.beginPage(mediaBox: &box)
        context.draw(page.image, in: box)
        context.endPage()
      }
      context.closePDF()

      promise.resolve([
        "uri": outputUrl.absoluteString,
        "pageCount": pages.count
      ])
    }

    AsyncFunction("getPdfThumbnail") { (options: [String: Any], promise: Promise) in
      guard let url = options["url"] as? String,
            let outputPath = options["outputPath"] as? String
      else {
        promise.reject(Exception(name: "InvalidArguments", description: "url and outputPath are required."))
        return
      }

      let pdfUrl = URL(fileURLWithPath: normalizedPath(url))
      guard let document = PDFDocument(url: pdfUrl), let page = document.page(at: 0) else {
        promise.reject(Exception(name: "UnreadablePdf", description: "The PDF could not be opened."))
        return
      }

      let bounds = page.bounds(for: .mediaBox)
      guard bounds.width > 0, bounds.height > 0 else {
        promise.reject(Exception(name: "EmptyPage", description: "The first page has no size."))
        return
      }

      let maxWidth = CGFloat(options["maxWidth"] as? Double ?? defaultThumbnailMaxWidth)
      let scale = min(maxWidth / bounds.width, 1)
      let size = CGSize(
        width: max(1, (bounds.width * scale).rounded()),
        height: max(1, (bounds.height * scale).rounded())
      )

      let thumbnail = page.thumbnail(of: size, for: .mediaBox)
      guard let data = thumbnail.jpegData(compressionQuality: thumbnailJpegQuality) else {
        promise.reject(Exception(name: "EncodeFailed", description: "Could not encode the thumbnail."))
        return
      }

      let outputUrl = URL(fileURLWithPath: normalizedPath(outputPath))
      do {
        try FileManager.default.createDirectory(
          at: outputUrl.deletingLastPathComponent(),
          withIntermediateDirectories: true
        )
        try data.write(to: outputUrl)
      } catch {
        promise.reject(Exception(name: "WriteFailed", description: error.localizedDescription))
        return
      }

      promise.resolve([
        "uri": outputUrl.absoluteString,
        "width": Int(size.width),
        "height": Int(size.height),
        "pageCount": document.pageCount
      ])
    }
  }
}
