import ExpoModulesCore
import Photos
import QuickLook
import UIKit

private class QuickLookDelegate: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  var fileUrl: URL
  var onDismiss: () -> Void

  init(fileUrl: URL, onDismiss: @escaping () -> Void) {
    self.fileUrl = fileUrl
    self.onDismiss = onDismiss
  }

  func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    return fileUrl as QLPreviewItem
  }

  func previewControllerDidDismiss(_ controller: QLPreviewController) {
    onDismiss()
  }
}

public class ExpoNativeShareModule: Module {
  private var activityViewController: UIActivityViewController?
  private var quickLookDelegate: QuickLookDelegate?

  public func definition() -> ModuleDefinition {
    Name("ExpoNativeShare")

    AsyncFunction("share") { (options: [String: Any], promise: Promise) in
      guard let message = options["message"] as? String else {
        promise.reject(Exception(name: "InvalidArguments", description: "Sharing requires a message string."))
        return
      }

      var itemsToShare: [Any] = []

      if !message.isEmpty {
        itemsToShare.append(message)
      }

      if let urls = options["urls"] as? [String] {
        for urlString in urls {
          if urlString.hasPrefix("data:image") || urlString.hasPrefix("data:application") {
            if let base64String = urlString.components(separatedBy: ",").last,
               let data = Data(base64Encoded: base64String),
               let image = UIImage(data: data) {
              itemsToShare.append(image)
            }
          } else if let url = URL(string: urlString) {
            itemsToShare.append(url)
          }
        }
      }

      guard !itemsToShare.isEmpty else {
        promise.reject(Exception(name: "NoContent", description: "Nothing to share."))
        return
      }

      DispatchQueue.main.async {
        guard var presentingVC = self.appContext?.utilities?.currentViewController() else {
          promise.reject(Exception(name: "NoPresentingViewController", description: "Could not find a view controller to present from."))
          return
        }

        while let presented = presentingVC.presentedViewController {
          presentingVC = presented
        }

        let avc = UIActivityViewController(activityItems: itemsToShare, applicationActivities: nil)
        self.activityViewController = avc

        if let popover = avc.popoverPresentationController {
          popover.sourceView = presentingVC.view
          popover.sourceRect = CGRect(
            x: presentingVC.view.bounds.midX,
            y: presentingVC.view.bounds.midY,
            width: 0,
            height: 0
          )
          popover.permittedArrowDirections = []
        }

        let resolveOnDismiss = options["resolveOnDismiss"] as? Bool ?? false

        avc.completionWithItemsHandler = { [weak self] _, _, _, _ in
          self?.activityViewController = nil
          if resolveOnDismiss {
            promise.resolve(nil)
          }
        }

        presentingVC.present(avc, animated: true) {
          if !resolveOnDismiss {
            promise.resolve(nil)
          }
        }
      }
    }

    AsyncFunction("preview") { (options: [String: Any], promise: Promise) in
      guard let urlString = options["url"] as? String,
            let fileUrl = URL(string: urlString) else {
        promise.reject(Exception(name: "InvalidArguments", description: "A valid file URL is required."))
        return
      }

      DispatchQueue.main.async {
        guard var presentingVC = self.appContext?.utilities?.currentViewController() else {
          promise.reject(Exception(name: "NoPresentingViewController", description: "Could not find a view controller to present from."))
          return
        }

        while let presented = presentingVC.presentedViewController {
          presentingVC = presented
        }

        let delegate = QuickLookDelegate(fileUrl: fileUrl) {
          promise.resolve(nil)
        }
        self.quickLookDelegate = delegate

        let ql = QLPreviewController()
        ql.dataSource = delegate
        ql.delegate = delegate
        presentingVC.present(ql, animated: true)
      }
    }

    AsyncFunction("saveToPhotos") { (options: [String: Any], promise: Promise) in
      guard let urlString = options["url"] as? String,
            let fileUrl = URL(string: urlString),
            let image = UIImage(contentsOfFile: fileUrl.path) else {
        promise.reject(Exception(name: "InvalidArguments", description: "A valid image file URL is required."))
        return
      }

      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else {
          promise.reject(Exception(name: "PermissionDenied", description: "Photo library access was denied."))
          return
        }
        PHPhotoLibrary.shared().performChanges({
          PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
          if success {
            promise.resolve(nil)
          } else {
            promise.reject(Exception(name: "SaveFailed", description: error?.localizedDescription ?? "Failed to save image."))
          }
        }
      }
    }
  }
}
