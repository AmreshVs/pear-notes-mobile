import type { ComponentProps } from 'react'
import type MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import type { IconName } from './SymbolIcon.types'

export type FloatingNoticeBannerProps = {
  icon: { ios: IconName; android: ComponentProps<typeof MaterialCommunityIcons>['name'] }
  title: string
  description: string
  descriptionLines?: number
  actionLabel: string
  onAction: () => void
  dismissLabel: string
  onDismiss: () => void
}
