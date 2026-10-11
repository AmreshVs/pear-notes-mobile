import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, useReduceMotion } from '@/components/Themed'
import type { ScrollJumpDirection } from '@/components/TiptapEditor'
import { UI_ICON_SIZE_24, UI_SIZE_16, UI_SIZE_48, UI_SIZE_9999 } from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import type { ScrollJumpButtonProps } from './ScrollJumpButton.types'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const ICONS: Record<ScrollJumpDirection, 'chevron-up' | 'chevron-down'> = {
  up: 'chevron-up',
  down: 'chevron-down',
}

const LABELS: Record<ScrollJumpDirection, string> = {
  up: 'noteEditor.scrollToTop',
  down: 'noteEditor.scrollToBottom',
}

export const ScrollJumpButton = memo(function ScrollJumpButton({
  direction,
  bottom,
  onJump,
}: ScrollJumpButtonProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const reduceMotion = useReduceMotion()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const positionStyle = useMemo(() => StyleSheet.create({ position: { bottom } }), [bottom])

  if (!direction) return null
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn}
      exiting={reduceMotion ? undefined : FadeOut}
      style={[styles.container, positionStyle.position]}
    >
      <Pressable
        onPress={onJump}
        accessibilityRole="button"
        accessibilityLabel={t(LABELS[direction])}
        android_ripple={ripple}
        style={styles.button}
      >
        <MaterialCommunityIcons
          name={ICONS[direction]}
          size={UI_ICON_SIZE_24}
          color={c.onSurface}
        />
      </Pressable>
    </Animated.View>
  )
})

const useMd3 = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      right: UI_SIZE_16,
      zIndex: 20,
    },
    button: {
      overflow: 'hidden',
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      elevation: 3,
    },
  })
  return styles
}, useMd3)
