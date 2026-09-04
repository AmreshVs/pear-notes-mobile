import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hapticSuccess } from '@/lib/haptics'
import { clearUnlockedNotes, useHasUnlockedNotes } from '@/lib/noteLock'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  primaryContainer?: string
  onPrimaryContainer?: string
}

export const LockNowButton = memo(function LockNowButton() {
  'use no memo'
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const hasUnlockedNotes = useHasUnlockedNotes()

  const handleLockNow = useCallback(() => {
    hapticSuccess()
    clearUnlockedNotes()
  }, [])

  if (!hasUnlockedNotes) return null

  return (
    <Pressable
      onPress={handleLockNow}
      style={styles.button}
      android_ripple={androidRipple(c.primary)}
      accessibilityRole="button"
      accessibilityLabel={t('folderView.lockNowA11y')}
    >
      <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_14} color={c.primary} />
      <Text style={styles.label}>{t('folderView.lockNow')}</Text>
    </Pressable>
  )
})

const useLockNowHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    label: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.primary,
    },
  })
  return styles
}, useLockNowHooks)
