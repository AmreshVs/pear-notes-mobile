import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'

export interface ContextMenuChild {
  id: string
  title: string
  systemImage?: string
  destructive?: boolean
}

export interface ContextMenuItem extends ContextMenuChild {
  children?: ContextMenuChild[]
}

export interface ContextMenuViewProps {
  items: ContextMenuItem[]
  menuEnabled?: boolean
  previewCornerRadius?: number
  previewBackgroundColor?: string
  previewScale?: number
  onSelect?: (id: string) => void
  style?: ViewStyle | ViewStyle[]
  children?: ReactNode
}
