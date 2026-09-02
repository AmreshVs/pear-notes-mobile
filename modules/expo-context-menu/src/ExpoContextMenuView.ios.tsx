import { useCallback } from 'react'
import { View } from 'react-native'
import { requireNativeView } from 'expo'

import type { ContextMenuViewProps } from './ExpoContextMenu.types'

let NativeContextMenuView: any = null
try {
  NativeContextMenuView = requireNativeView<any>('ExpoContextMenu')
} catch {
  NativeContextMenuView = null
}

export function ContextMenuView({
  items,
  menuEnabled = true,
  previewCornerRadius = 0,
  previewBackgroundColor,
  previewScale = 1,
  onSelect,
  style,
  children,
}: ContextMenuViewProps) {
  const handleSelect = useCallback(
    (event: { nativeEvent: { id: string } }) => onSelect?.(event.nativeEvent.id),
    [onSelect],
  )

  if (!NativeContextMenuView) {
    return <View style={style}>{children}</View>
  }

  return (
    <NativeContextMenuView
      items={items}
      menuEnabled={menuEnabled}
      previewCornerRadius={previewCornerRadius}
      previewBackgroundColor={previewBackgroundColor}
      previewScale={previewScale}
      onSelect={handleSelect}
      style={style}
    >
      {children}
    </NativeContextMenuView>
  )
}
