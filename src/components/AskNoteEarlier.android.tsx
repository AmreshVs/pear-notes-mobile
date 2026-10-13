import { memo, type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import type { AskTurnView } from '@/lib/localAi/askNote'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
  outlineVariant?: string
}

interface AskNoteEarlierProps {
  turns: AskTurnView[]
  hasLive: boolean
  renderTurn: (turn: AskTurnView) => ReactNode
}

interface AskNoteClearButtonProps {
  disabled: boolean
  onPress: () => void
}

export const AskNoteClearButton = memo(function AskNoteClearButton({
  disabled,
  onPress,
}: AskNoteClearButtonProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.primary), [c.primary])
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.clear, disabled && commonStyles.disabled]}
    >
      <Text style={styles.clearText}>{t('localAi.ask.clear')}</Text>
    </Pressable>
  )
})

export const AskNoteEarlier = memo(function AskNoteEarlier({
  turns,
  hasLive,
  renderTurn,
}: AskNoteEarlierProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  if (!turns.length) return null
  return (
    <View style={styles.earlier}>
      <Text style={styles.label}>{t('localAi.ask.earlier')}</Text>
      {turns.map(renderTurn)}
      {hasLive && <View style={styles.divider} />}
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    clear: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_40,
      paddingHorizontal: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    clearText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.primary,
    },
    earlier: {
      gap: UI_SIZE_16,
    },
    label: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurfaceVariant,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: UI_SIZE_8,
      backgroundColor: c.outlineVariant ?? c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
