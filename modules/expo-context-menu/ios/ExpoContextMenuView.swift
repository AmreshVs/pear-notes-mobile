import ExpoModulesCore
import UIKit

struct ContextMenuChildRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var systemImage: String?
  @Field var destructive: Bool = false
}

struct ContextMenuItemRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var systemImage: String?
  @Field var destructive: Bool = false
  @Field var children: [ContextMenuChildRecord] = []
}

class ExpoContextMenuView: ExpoView, UIContextMenuInteractionDelegate {
  let onSelect = EventDispatcher()

  private var items: [ContextMenuItemRecord] = []
  private var menuEnabled = true
  private var previewCornerRadius: CGFloat = 0
  private var previewBackgroundColor: UIColor?
  private var previewScale: CGFloat = 1

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addInteraction(UIContextMenuInteraction(delegate: self))
  }

  func setItems(_ items: [ContextMenuItemRecord]) {
    self.items = items
  }

  func setMenuEnabled(_ enabled: Bool) {
    menuEnabled = enabled
  }

  func setPreviewCornerRadius(_ radius: Double) {
    previewCornerRadius = CGFloat(radius)
  }

  func setPreviewBackgroundColor(_ color: UIColor?) {
    previewBackgroundColor = color
  }

  func setPreviewScale(_ scale: Double) {
    previewScale = CGFloat(scale)
  }

  private func action(id: String, title: String, systemImage: String?, destructive: Bool)
    -> UIAction
  {
    let image = systemImage.flatMap { UIImage(systemName: $0) }
    return UIAction(
      title: title,
      image: image,
      attributes: destructive ? .destructive : []
    ) { [weak self] _ in
      self?.onSelect(["id": id])
    }
  }

  private func buildMenuElements() -> [UIMenuElement] {
    items.map { item in
      if !item.children.isEmpty {
        let children = item.children.map {
          action(id: $0.id, title: $0.title, systemImage: $0.systemImage, destructive: $0.destructive)
        }
        return UIMenu(
          title: item.title,
          image: item.systemImage.flatMap { UIImage(systemName: $0) },
          children: children
        )
      }
      return action(
        id: item.id,
        title: item.title,
        systemImage: item.systemImage,
        destructive: item.destructive
      )
    }
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard menuEnabled, !items.isEmpty else { return nil }
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      guard let self else { return nil }
      return UIMenu(title: "", children: self.buildMenuElements())
    }
  }

  private func targetedPreview() -> UITargetedPreview? {
    guard bounds.width > 0, bounds.height > 0 else { return nil }
    let parameters = UIPreviewParameters()
    parameters.backgroundColor = previewBackgroundColor ?? .clear
    if previewCornerRadius > 0 {
      parameters.visiblePath = UIBezierPath(roundedRect: bounds, cornerRadius: previewCornerRadius)
    }
    guard previewScale != 1, let container = superview else {
      return UITargetedPreview(view: self, parameters: parameters)
    }

    let center = convert(CGPoint(x: bounds.midX, y: bounds.midY), to: container)
    let target = UIPreviewTarget(
      container: container,
      center: center,
      transform: CGAffineTransform(scaleX: previewScale, y: previewScale)
    )
    return UITargetedPreview(view: self, parameters: parameters, target: target)
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForHighlightingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    targetedPreview()
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForDismissingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    targetedPreview()
  }
}
