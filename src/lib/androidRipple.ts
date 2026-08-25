import type { PressableAndroidRippleConfig } from 'react-native'

import { ANDROID_RIPPLE_ENABLED } from '@/constants/constants'
import { hexWithAlpha } from '@/lib/backupUtils'

const RIPPLE_ALPHA = 0.12

export function androidRipple(color: string): PressableAndroidRippleConfig | undefined {
  if (!ANDROID_RIPPLE_ENABLED) return undefined
  return { color: hexWithAlpha(color, RIPPLE_ALPHA), borderless: false, foreground: true }
}
