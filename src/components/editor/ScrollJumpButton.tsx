import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, useReduceMotion, useTheme } from '@/components/Themed'
import type { ScrollJumpDirection } from '@/components/TiptapEditor'
import { commonStyles, UI_ICON_SIZE_20, UI_SIZE_16, UI_SIZE_48 } from '@/constants/commonStyles'

import type { ScrollJumpButtonProps } from './ScrollJumpButton.types'

const SYMBOLS: Record<ScrollJumpDirection, 'chevron.up' | 'chevron.down'> = {
  up: 'chevron.up',
  down: 'chevron.down',
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
  const { colors } = useTheme()
  const reduceMotion = useReduceMotion()
  const styles = useStyles()
  const positionStyle = useMemo(() => StyleSheet.create({ position: { bottom } }), [bottom])

  if (!direction) return null
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn}
      exiting={reduceMotion ? undefined : FadeOut}
      style={[styles.container, positionStyle.position]}
    >
      <GlassView intensity={0} borderRadius={UI_SIZE_48 / 2} style={styles.button} isInteractive>
        <Pressable
          onPress={onJump}
          accessibilityRole="button"
          accessibilityLabel={t(LABELS[direction])}
          style={({ pressed }) => [styles.inner, pressed && commonStyles.pressed]}
        >
          <SymbolView
            name={SYMBOLS[direction]}
            size={UI_ICON_SIZE_20}
            tintColor={colors.text}
            weight="semibold"
          />
        </Pressable>
      </GlassView>
    </Animated.View>
  )
})

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      right: UI_SIZE_16,
      zIndex: 20,
    },
    button: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      overflow: 'hidden',
    },
    inner: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
  return styles
})
