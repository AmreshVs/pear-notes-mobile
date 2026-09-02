import ExpoModulesCore

public class ExpoContextMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoContextMenu")

    View(ExpoContextMenuView.self) {
      Events("onSelect")

      Prop("items") { (view: ExpoContextMenuView, items: [ContextMenuItemRecord]) in
        view.setItems(items)
      }

      Prop("menuEnabled") { (view: ExpoContextMenuView, enabled: Bool) in
        view.setMenuEnabled(enabled)
      }

      Prop("previewCornerRadius") { (view: ExpoContextMenuView, radius: Double) in
        view.setPreviewCornerRadius(radius)
      }

      Prop("previewBackgroundColor") { (view: ExpoContextMenuView, color: UIColor?) in
        view.setPreviewBackgroundColor(color)
      }

      Prop("previewScale") { (view: ExpoContextMenuView, scale: Double) in
        view.setPreviewScale(scale)
      }
    }
  }
}
