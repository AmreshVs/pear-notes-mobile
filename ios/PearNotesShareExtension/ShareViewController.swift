import UIKit
import UniformTypeIdentifiers

private let inboxDirectoryName = "share-intake"
private let manifestFileName = "manifest.json"
private let appGroupInfoKey = "PearNotesAppGroupIdentifier"
private let urlSchemeInfoKey = "PearNotesURLScheme"
private let shareIntakeHost = "share-intake"
private let shareIdQueryName = "id"
private let manifestVersion = 1
private let maxFileNameLength = 120
private let shareIdSuffixLength = 8
private let fallbackFileName = "shared-file"
private let fallbackMimeType = "application/octet-stream"
private let preferredImageTypes: [UTType] = [.jpeg, .png, .gif, .heic]
private let mediaTypes: [UTType] = [.image, .movie, .audio, .pdf]
private let webSchemes: Set<String> = ["http", "https"]
private let unsafeFileNameCharacters = CharacterSet(charactersIn: "/\\:?%*|\"<>").union(.controlCharacters)
private let stackSpacing: CGFloat = 12
private let contentInset: CGFloat = 24
private let openURLSelector = NSSelectorFromString("openURL:options:completionHandler:")
private let sharedApplicationKey = "sharedApplication"
private let extensionBundleSuffix = ".ShareExtension"
private let openHostAppTimeout: TimeInterval = 3

private typealias OpenURLImplementation = @convention(c) (
  NSObject,
  Selector,
  NSURL,
  NSDictionary,
  (@convention(block) (Bool) -> Void)?
) -> Void

private enum SharedEntry {
  case text(String, title: String?)
  case url(String, title: String?)
  case file(name: String, mimeType: String, size: Int64)

  var manifestValue: [String: Any] {
    switch self {
    case let .text(text, title):
      var value: [String: Any] = ["kind": "text", "text": text]
      if let title { value["title"] = title }
      return value
    case let .url(url, title):
      var value: [String: Any] = ["kind": "url", "url": url]
      if let title { value["title"] = title }
      return value
    case let .file(name, mimeType, size):
      return ["kind": "file", "file": name, "name": name, "mimeType": mimeType, "size": size]
    }
  }

  var dedupeKey: String? {
    switch self {
    case let .text(text, _): return "text:\(text)"
    case let .url(url, _): return "url:\(url)"
    case .file: return nil
    }
  }
}

private func trimmedNonEmpty(_ value: String?) -> String? {
  guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
  return trimmed
}

private func webURL(from value: Any?) -> URL? {
  let url = (value as? URL)
    ?? (value as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) }
    ?? (value as? String).flatMap { URL(string: $0.trimmingCharacters(in: .whitespacesAndNewlines)) }
  guard let url, let scheme = url.scheme?.lowercased(), webSchemes.contains(scheme), url.host != nil else { return nil }
  return url
}

private func singleWebURL(in text: String) -> URL? {
  guard text.rangeOfCharacter(from: .whitespacesAndNewlines) == nil else { return nil }
  return webURL(from: text)
}

private final class FileNameAllocator: @unchecked Sendable {
  private var usedNames = Set<String>()
  private let lock = NSLock()

  func allocate(baseName: String, fileExtension: String?) -> String {
    let base = sanitize(baseName)
    let extensionPart = trimmedNonEmpty(fileExtension).map { sanitize($0) } ?? ""
    lock.lock()
    defer { lock.unlock() }
    var candidate = compose(base, extensionPart)
    var suffix = 2
    while usedNames.contains(candidate.lowercased()) || candidate == manifestFileName {
      candidate = compose("\(base)-\(suffix)", extensionPart)
      suffix += 1
    }
    usedNames.insert(candidate.lowercased())
    return candidate
  }

  private func compose(_ base: String, _ fileExtension: String) -> String {
    fileExtension.isEmpty ? base : "\(base).\(fileExtension)"
  }

  private func sanitize(_ value: String) -> String {
    let cleaned = value
      .components(separatedBy: unsafeFileNameCharacters)
      .joined(separator: "_")
      .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: ".")))
    let limited = String(cleaned.prefix(maxFileNameLength))
    return limited.isEmpty ? fallbackFileName : limited
  }
}

private final class SharedItemImporter: @unchecked Sendable {
  private let directory: URL
  private let names = FileNameAllocator()

  init(directory: URL) {
    self.directory = directory
  }

  func importEntry(from provider: NSItemProvider, title: String?) async -> SharedEntry? {
    if let type = fileRepresentationType(for: provider) {
      if let entry = await copyFileRepresentation(from: provider, type: type) { return entry }
      if let entry = await copyLoadedImage(from: provider, type: type) { return entry }
    }
    if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier),
       let entry = await copyFileURL(from: provider) {
      return entry
    }
    if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
       let url = await loadWebURL(from: provider) {
      return .url(url.absoluteString, title: title)
    }
    if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
       let text = await loadText(from: provider) {
      if let url = singleWebURL(in: text) { return .url(url.absoluteString, title: title) }
      return .text(text, title: nil)
    }
    return nil
  }

  private func fileRepresentationType(for provider: NSItemProvider) -> UTType? {
    let registered = provider.registeredTypeIdentifiers.compactMap { UTType($0) }
    let offersWebURL = registered.contains { $0.conforms(to: .url) && !$0.conforms(to: .fileURL) }
    let candidates = registered.filter { type in
      guard type.conforms(to: .data), !type.conforms(to: .plainText) else { return false }
      return !offersWebURL || mediaTypes.contains { type.conforms(to: $0) }
    }
    return candidates.first { preferredImageTypes.contains($0) } ?? candidates.first
  }

  private func copyFileRepresentation(from provider: NSItemProvider, type: UTType) async -> SharedEntry? {
    await withCheckedContinuation { continuation in
      _ = provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { url, _ in
        guard let url else {
          continuation.resume(returning: nil)
          return
        }
        continuation.resume(returning: self.copyFile(at: url, suggestedName: provider.suggestedName, type: type))
      }
    }
  }

  private func copyLoadedImage(from provider: NSItemProvider, type: UTType) async -> SharedEntry? {
    guard type.conforms(to: .image) else { return nil }
    return await withCheckedContinuation { continuation in
      provider.loadItem(forTypeIdentifier: type.identifier, options: nil) { item, _ in
        let suggestedName = provider.suggestedName
        switch item {
        case let url as URL where url.isFileURL:
          continuation.resume(returning: self.copyFile(at: url, suggestedName: suggestedName, type: type))
        case let data as Data:
          continuation.resume(returning: self.writeData(data, suggestedName: suggestedName, type: type))
        case let image as UIImage:
          let entry = image.pngData().flatMap { self.writeData($0, suggestedName: suggestedName, type: .png) }
          continuation.resume(returning: entry)
        default:
          continuation.resume(returning: nil)
        }
      }
    }
  }

  private func copyFileURL(from provider: NSItemProvider) async -> SharedEntry? {
    await withCheckedContinuation { continuation in
      provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
        let url = (item as? URL) ?? (item as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) }
        guard let url, url.isFileURL else {
          continuation.resume(returning: nil)
          return
        }
        continuation.resume(returning: self.copyFile(at: url, suggestedName: nil, type: nil))
      }
    }
  }

  private func loadWebURL(from provider: NSItemProvider) async -> URL? {
    await withCheckedContinuation { continuation in
      provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
        continuation.resume(returning: webURL(from: item))
      }
    }
  }

  private func loadText(from provider: NSItemProvider) async -> String? {
    await withCheckedContinuation { continuation in
      provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
        let text = (item as? String)
          ?? (item as? NSAttributedString)?.string
          ?? (item as? Data).flatMap { String(data: $0, encoding: .utf8) }
        continuation.resume(returning: trimmedNonEmpty(text))
      }
    }
  }

  private func fileNameParts(suggestedName: String?, sourceURL: URL?, type: UTType?) -> (String, String?) {
    let sourceExtension = trimmedNonEmpty(sourceURL?.pathExtension)
    let fileExtension = sourceExtension ?? type?.preferredFilenameExtension
    guard let suggestedName = trimmedNonEmpty(suggestedName) else {
      let sourceBase = trimmedNonEmpty(sourceURL?.deletingPathExtension().lastPathComponent)
      return (sourceBase ?? fallbackFileName, fileExtension)
    }
    let suggested = suggestedName as NSString
    let suggestedExtension = suggested.pathExtension
    let hasKnownExtension = !suggestedExtension.isEmpty
      && UTType(filenameExtension: suggestedExtension).map { !$0.isDynamic } == true
    return (hasKnownExtension ? suggested.deletingPathExtension : suggestedName, fileExtension)
  }

  private func copyFile(at source: URL, suggestedName: String?, type: UTType?) -> SharedEntry? {
    let isAccessing = source.startAccessingSecurityScopedResource()
    defer { if isAccessing { source.stopAccessingSecurityScopedResource() } }
    if (try? source.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true { return nil }

    let (baseName, fileExtension) = fileNameParts(suggestedName: suggestedName, sourceURL: source, type: type)
    let fileName = names.allocate(baseName: baseName, fileExtension: fileExtension)
    let destination = directory.appendingPathComponent(fileName, isDirectory: false)
    do {
      try FileManager.default.copyItem(at: source, to: destination)
    } catch {
      try? FileManager.default.removeItem(at: destination)
      return nil
    }
    return fileEntry(at: destination, fileName: fileName, type: type)
  }

  private func writeData(_ data: Data, suggestedName: String?, type: UTType) -> SharedEntry? {
    let (baseName, fileExtension) = fileNameParts(suggestedName: suggestedName, sourceURL: nil, type: type)
    let fileName = names.allocate(baseName: baseName, fileExtension: fileExtension)
    let destination = directory.appendingPathComponent(fileName, isDirectory: false)
    do {
      try data.write(to: destination, options: .atomic)
    } catch {
      try? FileManager.default.removeItem(at: destination)
      return nil
    }
    return fileEntry(at: destination, fileName: fileName, type: type)
  }

  private func fileEntry(at url: URL, fileName: String, type: UTType?) -> SharedEntry {
    let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
    let mimeType = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
      ?? type?.preferredMIMEType
      ?? fallbackMimeType
    return .file(name: fileName, mimeType: mimeType, size: Int64(size))
  }
}

final class ShareViewController: UIViewController {
  private let navigationBar = UINavigationBar()
  private let barItem = UINavigationItem()
  private let statusLabel = UILabel()
  private let detailLabel = UILabel()
  private let activityIndicator = UIActivityIndicatorView(style: .large)
  private var importTask: Task<Void, Never>?
  private var pendingDirectory: URL?
  private var hasStarted = false

  override func viewDidLoad() {
    super.viewDidLoad()
    configureView()
    showProgress(String(localized: "Preparing shared items…"))
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard !hasStarted else { return }
    hasStarted = true
    importTask = Task { [weak self] in
      await self?.importSharedItems()
    }
  }

  private func configureView() {
    view.backgroundColor = .systemBackground

    barItem.title = String(localized: "Pear Notes")
    barItem.leftBarButtonItem = UIBarButtonItem(
      systemItem: .cancel,
      primaryAction: UIAction { [weak self] _ in self?.cancelShare() }
    )
    navigationBar.setItems([barItem], animated: false)
    navigationBar.translatesAutoresizingMaskIntoConstraints = false

    statusLabel.font = .preferredFont(forTextStyle: .headline)
    statusLabel.adjustsFontForContentSizeCategory = true
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0

    detailLabel.font = .preferredFont(forTextStyle: .subheadline)
    detailLabel.adjustsFontForContentSizeCategory = true
    detailLabel.textColor = .secondaryLabel
    detailLabel.textAlignment = .center
    detailLabel.numberOfLines = 0

    activityIndicator.hidesWhenStopped = true

    let stack = UIStackView(arrangedSubviews: [activityIndicator, statusLabel, detailLabel])
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = stackSpacing
    stack.translatesAutoresizingMaskIntoConstraints = false

    view.addSubview(navigationBar)
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      navigationBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      navigationBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      navigationBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
      stack.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor, constant: contentInset),
      stack.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor, constant: -contentInset),
    ])
  }

  private func showProgress(_ message: String) {
    activityIndicator.startAnimating()
    statusLabel.text = message
    detailLabel.text = nil
  }

  private func showResult(_ message: String, detail: String?) {
    activityIndicator.stopAnimating()
    statusLabel.text = message
    detailLabel.text = detail
    barItem.leftBarButtonItem = nil
    barItem.rightBarButtonItem = UIBarButtonItem(
      systemItem: .done,
      primaryAction: UIAction { [weak self] _ in self?.finishShare() }
    )
  }

  private func sharedInboxDirectory() -> URL? {
    guard let groupIdentifier = Bundle.main.object(forInfoDictionaryKey: appGroupInfoKey) as? String,
          let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupIdentifier)
    else { return nil }
    return container.appendingPathComponent(inboxDirectoryName, isDirectory: true)
  }

  private func makeShareId() -> String {
    let milliseconds = Int64(Date().timeIntervalSince1970 * 1000)
    let suffix = UUID().uuidString.lowercased().prefix(shareIdSuffixLength)
    return "\(milliseconds)-\(suffix)"
  }

  private func importSharedItems() async {
    guard let inbox = sharedInboxDirectory() else {
      showResult(String(localized: "Pear Notes can't receive shared items right now."), detail: nil)
      return
    }
    let shareId = makeShareId()
    let directory = inbox.appendingPathComponent(shareId, isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    } catch {
      showResult(String(localized: "Pear Notes can't receive shared items right now."), detail: nil)
      return
    }
    pendingDirectory = directory

    let importer = SharedItemImporter(directory: directory)
    let extensionItems = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? []
    var entries: [SharedEntry] = []
    var seenKeys = Set<String>()
    var skipped = 0

    for extensionItem in extensionItems {
      let title = trimmedNonEmpty(extensionItem.attributedTitle?.string)
      let attachments = extensionItem.attachments ?? []
      var itemEntries: [SharedEntry] = []

      for provider in attachments {
        if Task.isCancelled { return }
        if let entry = await importer.importEntry(from: provider, title: title) {
          itemEntries.append(entry)
        } else {
          skipped += 1
        }
      }

      if attachments.isEmpty, let text = trimmedNonEmpty(extensionItem.attributedContentText?.string) {
        itemEntries.append(singleWebURL(in: text).map { .url($0.absoluteString, title: title) } ?? .text(text, title: title))
      }

      for entry in itemEntries {
        if let key = entry.dedupeKey {
          guard !seenKeys.contains(key) else { continue }
          seenKeys.insert(key)
        }
        entries.append(entry)
      }
    }

    if Task.isCancelled { return }

    guard !entries.isEmpty else {
      removePendingDirectory()
      showResult(String(localized: "These items couldn't be read."), detail: nil)
      return
    }

    let manifest: [String: Any] = [
      "version": manifestVersion,
      "id": shareId,
      "createdAt": Int64(Date().timeIntervalSince1970 * 1000),
      "skipped": skipped,
      "items": entries.map(\.manifestValue),
    ]
    do {
      let data = try JSONSerialization.data(withJSONObject: manifest)
      try data.write(to: directory.appendingPathComponent(manifestFileName, isDirectory: false), options: .atomic)
    } catch {
      removePendingDirectory()
      showResult(String(localized: "These items couldn't be saved."), detail: nil)
      return
    }

    pendingDirectory = nil
    showProgress(String(localized: "Opening Pear Notes…"))
    openHostApp(shareId: shareId)
  }

  private func hostURLScheme() -> String? {
    if let extensionBundleIdentifier = Bundle.main.bundleIdentifier,
       extensionBundleIdentifier.hasSuffix(extensionBundleSuffix) {
      return String(extensionBundleIdentifier.dropLast(extensionBundleSuffix.count))
    }
    return Bundle.main.object(forInfoDictionaryKey: urlSchemeInfoKey) as? String
  }

  private func hostApplication() -> NSObject? {
    var responder: UIResponder? = self
    while let current = responder {
      if current is UIApplication { return current }
      responder = current.next
    }
    let applicationClass = NSClassFromString("UIApplication") as? NSObject.Type
    return applicationClass?.value(forKey: sharedApplicationKey) as? NSObject
  }

  private func openHostApp(shareId: String) {
    guard let scheme = hostURLScheme(),
          var components = URLComponents(string: "\(scheme)://\(shareIntakeHost)")
    else {
      showSavedForLater()
      return
    }
    components.queryItems = [URLQueryItem(name: shareIdQueryName, value: shareId)]
    guard let url = components.url,
          let application = hostApplication(),
          application.responds(to: openURLSelector)
    else {
      showSavedForLater()
      return
    }

    var isHandled = false
    let completion: @convention(block) (Bool) -> Void = { [weak self] opened in
      DispatchQueue.main.async {
        guard let self, !isHandled else { return }
        isHandled = true
        if opened {
          self.finishShare()
        } else {
          self.showSavedForLater()
        }
      }
    }

    let implementation = application.method(for: openURLSelector)
    let openURL = unsafeBitCast(implementation, to: OpenURLImplementation.self)
    openURL(application, openURLSelector, url as NSURL, NSDictionary(), completion)

    DispatchQueue.main.asyncAfter(deadline: .now() + openHostAppTimeout) { [weak self] in
      guard let self, !isHandled else { return }
      isHandled = true
      self.showSavedForLater()
    }
  }

  private func showSavedForLater() {
    showResult(
      String(localized: "Shared items are ready"),
      detail: String(localized: "Open Pear Notes to add them to a note.")
    )
  }

  private func removePendingDirectory() {
    guard let directory = pendingDirectory else { return }
    pendingDirectory = nil
    try? FileManager.default.removeItem(at: directory)
  }

  private func cancelShare() {
    importTask?.cancel()
    removePendingDirectory()
    extensionContext?.cancelRequest(withError: NSError(domain: NSCocoaErrorDomain, code: NSUserCancelledError))
  }

  private func finishShare() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}
