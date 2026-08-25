import React, { useEffect } from 'react'
import { AccessibilityInfo, StyleSheet } from 'react-native'
import { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontSize,
  Radii,
  Space,
  UI_SIZE_12,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { ToastContext } from '@/providers/ToastContext'
import { useToastState } from '@/providers/useToastState'

export { useToast } from '@/providers/ToastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  const { visible, message, value } = useToastState()

  useEffect(() => {
    if (visible && message) AccessibilityInfo.announceForAccessibility(message)
  }, [visible, message])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible && (
        <MotionView
          style={styles.wrapper}
          pointerEvents="none"
          entering={FadeInDown.duration(Durations.fade)}
          exiting={FadeOutDown.duration(Durations.fade)}
        >
          <GlassView intensity={40} borderRadius={Radii.pill} style={styles.capsule}>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </GlassView>
        </MotionView>
      )}
    </ToastContext.Provider>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: UI_SIZE_20,
      right: UI_SIZE_20,
      bottom: insets.bottom + UI_SIZE_12,
      alignItems: 'center',
    },
    capsule: {
      paddingVertical: UI_SIZE_12,
      paddingHorizontal: Space.base,
      borderRadius: Radii.pill,
      boxShadow: `0 8px 24px ${theme.colors.glassShadow}`,
    },
    message: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: theme.colors.text,
      textAlign: 'center',
    },
  })
  return styles
}, useSafeAreaInsets)
