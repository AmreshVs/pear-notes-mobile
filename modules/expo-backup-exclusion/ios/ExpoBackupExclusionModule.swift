import ExpoModulesCore

public class ExpoBackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoBackupExclusion")

    AsyncFunction("excludeFromBackup") { (path: String) -> Bool in
      var url = URL(fileURLWithPath: path, isDirectory: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      let current = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
      return current.isExcludedFromBackup == true
    }
  }
}
