import ExpoModulesCore
import UIKit

public class ExpoNativeShareModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoNativeShare")

    AsyncFunction("share") { (options: [String: Any]) in
      guard let message = options["message"] as? String else {
        throw Exception(name: "InvalidArguments", description: "Sharing requires a message string.")
      }

      var itemsToShare: [Any] = [message]

      if let urls = options["urls"] as? [String] {
        for urlString in urls {
           if let url = URL(string: urlString) {
             if url.isFileURL {
                itemsToShare.append(url)
             } else if let scheme = url.scheme, scheme.hasPrefix("http") {
                itemsToShare.append(url)
             } else if urlString.hasPrefix("data:image") || urlString.hasPrefix("data:application") {
                 // Handle base64
                 if let base64String = urlString.components(separatedBy: ",").last,
                    let data = Data(base64Encoded: base64String),
                    let image = UIImage(data: data) {
                    itemsToShare.append(image)
                 }
             }
           }
        }
      }

      DispatchQueue.main.async {
        guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
          return
        }

        let activityViewController = UIActivityViewController(activityItems: itemsToShare, applicationActivities: nil)

        // For iPad
        if let popoverController = activityViewController.popoverPresentationController {
          popoverController.sourceView = currentViewController.view
          popoverController.sourceRect = CGRect(x: currentViewController.view.bounds.midX, y: currentViewController.view.bounds.midY, width: 0, height: 0)
          popoverController.permittedArrowDirections = []
        }

        currentViewController.present(activityViewController, animated: true, completion: nil)
      }
    }
  }
}
