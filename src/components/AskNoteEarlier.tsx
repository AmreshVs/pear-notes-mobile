import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_8,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import type { AskTurnView } from '@/lib/localAi/askNote'

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
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={UI_SIZE_8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.clear,
        disabled && commonStyles.disabled,
        pressed && commonStyles.pressed,
      ]}
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

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    clear: {
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_8,
    },
    clearText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    earlier: {
      gap: UI_SIZE_14,
    },
    label: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.separator,
    },
  })
  return styles
})
