import type { PressableAndroidRippleConfig } from 'react-native'

import { hexWithAlpha } from '@/lib/backupUtils'

const RIPPLE_ALPHA = 0.12

export function androidRipple(color: string): PressableAndroidRippleConfig {
  return { color: hexWithAlpha(color, RIPPLE_ALPHA), borderless: false, foreground: true }
}
