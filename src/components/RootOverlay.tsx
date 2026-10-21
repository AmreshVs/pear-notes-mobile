import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { FadeIn, FadeOut } from 'react-native-reanimated'
import { FullWindowOverlay } from 'react-native-screens'

import { MotionView } from '@/components/MotionView'
import { Durations } from '@/constants/commonStyles'

type RootOverlayProps = {
  visible: boolean
  onRequestClose: () => void
  children: ReactNode
}

export function RootOverlay({ visible, children }: RootOverlayProps) {
  if (!visible) return null

  return (
    <FullWindowOverlay>
      <MotionView
        style={StyleSheet.absoluteFill}
        entering={FadeIn.duration(Durations.overlayFade)}
        exiting={FadeOut.duration(Durations.overlayFadeOut)}
        accessibilityViewIsModal
      >
        {children}
      </MotionView>
    </FullWindowOverlay>
  )
}
