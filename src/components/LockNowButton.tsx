import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, type ViewStyle } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_12,
} from '@/constants/commonStyles'
import { hapticSuccess } from '@/lib/haptics'
import { clearUnlockedNotes, useHasUnlockedNotes } from '@/lib/noteLock'

export const LockNowButton = memo(function LockNowButton() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const hasUnlockedNotes = useHasUnlockedNotes()

  const handleLockNow = useCallback(() => {
    hapticSuccess()
    clearUnlockedNotes()
  }, [])

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] =>
      pressed ? [styles.button, commonStyles.pressed] : [styles.button],
    [styles.button],
  )

  if (!hasUnlockedNotes) return null

  return (
    <Pressable
      onPress={handleLockNow}
      style={getPressableStyle}
      accessibilityRole="button"
      accessibilityLabel={t('folderView.lockNowA11y')}
      hitSlop={Space.sm}
    >
      <SymbolIcon
        name="lock.fill"
        size={UI_ICON_SIZE_12}
        color={colors.primary}
        weight="semibold"
      />
      <Text style={styles.label}>{t('folderView.lockNow')}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    label: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.caps,
      color: theme.colors.primary,
    },
  })
  return styles
})
