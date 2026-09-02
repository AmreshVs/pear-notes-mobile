import { View } from 'react-native'

import type { ContextMenuViewProps } from './ExpoContextMenu.types'

export function ContextMenuView({ style, children }: ContextMenuViewProps) {
  return <View style={style}>{children}</View>
}
