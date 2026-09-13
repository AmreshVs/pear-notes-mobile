import ExpoModulesCore
import Foundation

private let inboxDirectoryName = "share-intake"
private let manifestFileName = "manifest.json"
private let appGroupInfoKey = "PearNotesAppGroupIdentifier"
private let abandonedShareMaxAge: TimeInterval = 60 * 60 * 24

private func directoryAge(_ url: URL) -> TimeInterval {
  let values = try? url.resourceValues(forKeys: [.contentModificationDateKey])
  guard let modifiedAt = values?.contentModificationDate else { return .greatestFiniteMagnitude }
  return Date().timeIntervalSince(modifiedAt)
}

private func importSharesFromAppGroup() -> Int {
  let fileManager = FileManager.default
  guard let groupIdentifier = Bundle.main.object(forInfoDictionaryKey: appGroupInfoKey) as? String,
        let container = fileManager.containerURL(forSecurityApplicationGroupIdentifier: groupIdentifier),
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first
  else { return 0 }

  let sourceInbox = container.appendingPathComponent(inboxDirectoryName, isDirectory: true)
  var targetInbox = documents.appendingPathComponent(inboxDirectoryName, isDirectory: true)
  guard let entries = try? fileManager.contentsOfDirectory(
    at: sourceInbox,
    includingPropertiesForKeys: [.contentModificationDateKey, .isDirectoryKey],
    options: [.skipsHiddenFiles]
  ) else { return 0 }

  do {
    try fileManager.createDirectory(at: targetInbox, withIntermediateDirectories: true)
    var backupExclusion = URLResourceValues()
    backupExclusion.isExcludedFromBackup = true
    try targetInbox.setResourceValues(backupExclusion)
  } catch {
    return 0
  }

  var importedCount = 0
  for entry in entries {
    let isDirectory = (try? entry.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
    guard isDirectory else {
      try? fileManager.removeItem(at: entry)
      continue
    }

    let manifest = entry.appendingPathComponent(manifestFileName, isDirectory: false)
    guard fileManager.fileExists(atPath: manifest.path) else {
      if directoryAge(entry) > abandonedShareMaxAge {
        try? fileManager.removeItem(at: entry)
      }
      continue
    }

    let destination = targetInbox.appendingPathComponent(entry.lastPathComponent, isDirectory: true)
    if fileManager.fileExists(atPath: destination.path) {
      try? fileManager.removeItem(at: destination)
    }
    do {
      try fileManager.moveItem(at: entry, to: destination)
      importedCount += 1
    } catch {
      continue
    }
  }
  return importedCount
}

public class ExpoShareIntakeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoShareIntake")

    Events("onInboxChanged")

    AsyncFunction("importPendingShares") { () -> Int in
      importSharesFromAppGroup()
    }

    Function("isPreparing") { () -> Bool in
      false
    }
  }
}
