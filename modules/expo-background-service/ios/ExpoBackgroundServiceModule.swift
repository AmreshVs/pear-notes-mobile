import ExpoModulesCore
import UIKit

public class ExpoBackgroundServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoBackgroundService")

    AsyncFunction("isBackgroundRefreshAllowed") { () -> Bool in
      return UIApplication.shared.backgroundRefreshStatus == .available
    }.runOnQueue(.main)
  }
}
