import ExpoModulesCore
import Photos
import QuickLook
import UIKit

private let maxPresentAttempts = 12
private let presentRetryDelay: TimeInterval = 0.1

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

private let letterPaperRegions: Set<String> = ["US", "CA", "MX", "PH", "CL", "CO", "VE", "GT", "CR", "PA", "DO", "PR", "SV", "NI", "BZ"]
private let a4PageSize = CGSize(width: 595.2, height: 841.8)
private let letterPageSize = CGSize(width: 612, height: 792)

private class TitledTextItemSource: NSObject, UIActivityItemSource {
  let text: String
  let title: String

  init(text: String, title: String) {
    self.text = text
    self.title = title
  }

  func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any { text }

  func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? { text }

  func activityViewController(_ activityViewController: UIActivityViewController, subjectForActivityType activityType: UIActivity.ActivityType?) -> String { title }
}

private class PrintInfoItemSource: NSObject, UIActivityItemSource {
  let printInfo: UIPrintInfo

  init(jobName: String) {
    printInfo = UIPrintInfo.printInfo()
    printInfo.jobName = jobName
    printInfo.outputType = .general
  }

  func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any { printInfo }

  func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
    activityType == .print ? printInfo : nil
  }
}

private class RegionalPaperDelegate: NSObject, UIPrintInteractionControllerDelegate {
  func printInteractionController(_ printInteractionController: UIPrintInteractionController, choosePaper paperList: [UIPrintPaper]) -> UIPrintPaper {
    let region = Locale.current.region?.identifier ?? ""
    let size = letterPaperRegions.contains(region) ? letterPageSize : a4PageSize
    return UIPrintPaper.bestPaper(forPageSize: size, withPapersFrom: paperList)
  }
}

public class ExpoNativeShareModule: Module {
  private var activityViewController: UIActivityViewController?
  private let paperDelegate = RegionalPaperDelegate()
  private var quickLookDelegate: QuickLookDelegate?

  private func keyWindowRootViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }
      .flatMap { $0.windows }
    let keyWindow = windows.first(where: { $0.isKeyWindow }) ?? windows.first
    return keyWindow?.rootViewController ?? appContext?.utilities?.currentViewController()
  }

  private func isPresentable(_ controller: UIViewController) -> Bool {
    return !controller.isBeingDismissed && controller.view.window != nil
  }

  private func presentOnTop(
    _ controller: UIViewController,
    attempt: Int = 0,
    onFailure: @escaping () -> Void,
    completion: (() -> Void)? = nil
  ) {
    guard let root = keyWindowRootViewController() else {
      onFailure()
      return
    }

    var top = root
    while let presented = top.presentedViewController, isPresentable(presented) {
      top = presented
    }

    let blocker = top.presentedViewController
    guard blocker == nil, isPresentable(top) else {
      guard attempt < maxPresentAttempts else {
        onFailure()
        return
      }
      let retry = { [weak self] in
        self?.presentOnTop(controller, attempt: attempt + 1, onFailure: onFailure, completion: completion)
      }
      if let coordinator = blocker?.transitionCoordinator {
        _ = coordinator.animate(alongsideTransition: nil) { _ in
          DispatchQueue.main.async { retry() }
        }
      } else {
        DispatchQueue.main.asyncAfter(deadline: .now() + presentRetryDelay) { retry() }
      }
      return
    }

    if let popover = controller.popoverPresentationController {
      popover.sourceView = top.view
      popover.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.midY, width: 0, height: 0)
      popover.permittedArrowDirections = []
    }

    top.present(controller, animated: true, completion: completion)
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoNativeShare")

    AsyncFunction("share") { (options: [String: Any], promise: Promise) in
      guard let message = options["message"] as? String else {
        promise.reject(Exception(name: "InvalidArguments", description: "Sharing requires a message string."))
        return
      }

      var itemsToShare: [Any] = []
      let title = (options["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

      if !message.isEmpty {
        itemsToShare.append(title.isEmpty ? message : TitledTextItemSource(text: message, title: title))
      }

      if !title.isEmpty {
        itemsToShare.append(PrintInfoItemSource(jobName: title))
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

      guard !itemsToShare.isEmpty, !(itemsToShare.count == 1 && itemsToShare.first is PrintInfoItemSource) else {
        promise.reject(Exception(name: "NoContent", description: "Nothing to share."))
        return
      }

      DispatchQueue.main.async {
        let avc = UIActivityViewController(activityItems: itemsToShare, applicationActivities: nil)
        self.activityViewController = avc

        let resolveOnDismiss = options["resolveOnDismiss"] as? Bool ?? false
        let printController = UIPrintInteractionController.shared
        printController.delegate = self.paperDelegate
        printController.showsPaperSelectionForLoadedPapers = true

        avc.completionWithItemsHandler = { [weak self] _, _, _, _ in
          self?.activityViewController = nil
          if printController.delegate === self?.paperDelegate {
            printController.delegate = nil
          }
          if resolveOnDismiss {
            promise.resolve(nil)
          }
        }

        self.presentOnTop(
          avc,
          onFailure: { [weak self] in
            self?.activityViewController = nil
            promise.reject(Exception(name: "NoPresentingViewController", description: "Could not find a view controller to present from."))
          },
          completion: {
            if !resolveOnDismiss {
              promise.resolve(nil)
            }
          }
        )
      }
    }

    AsyncFunction("preview") { (options: [String: Any], promise: Promise) in
      guard let urlString = options["url"] as? String,
            let fileUrl = URL(string: urlString) else {
        promise.reject(Exception(name: "InvalidArguments", description: "A valid file URL is required."))
        return
      }

      DispatchQueue.main.async {
        let delegate = QuickLookDelegate(fileUrl: fileUrl) { [weak self] in
          self?.quickLookDelegate = nil
          promise.resolve(nil)
        }
        self.quickLookDelegate = delegate

        let ql = QLPreviewController()
        ql.dataSource = delegate
        ql.delegate = delegate

        self.presentOnTop(ql, onFailure: { [weak self] in
          self?.quickLookDelegate = nil
          promise.reject(Exception(name: "NoPresentingViewController", description: "Could not find a view controller to present the preview from."))
        })
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
