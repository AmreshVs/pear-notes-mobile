import ExpoModulesCore
import UIKit

public class ExpoNativeShareModule: Module {
  private var activityViewController: UIActivityViewController?

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

        avc.completionWithItemsHandler = { [weak self] _, _, _, _ in
          self?.activityViewController = nil
        }

        presentingVC.present(avc, animated: true) {
          promise.resolve(nil)
        }
      }
    }
  }
}
