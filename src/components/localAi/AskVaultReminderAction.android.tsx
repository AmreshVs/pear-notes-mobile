import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_16,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

interface AskVaultReminderActionProps {
  date: string
  enabled: boolean
  onToggle: () => void
}

export const AskVaultReminderAction = memo(function AskVaultReminderAction({
  date,
  enabled,
  onToggle,
}: AskVaultReminderActionProps) {
  const { t } = useTranslation()
  const c = useMD3Theme().colors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  if (enabled) {
    return (
      <View style={styles.done}>
        <MaterialCommunityIcons name="check-circle" size={UI_ICON_SIZE_16} color={c.primary} />
        <Text style={styles.doneText}>{t('localAi.askVault.reminderOn', { date })}</Text>
      </View>
    )
  }
  return (
    <Pressable
      onPress={onToggle}
      android_ripple={ripple}
      accessibilityRole="button"
      style={styles.button}
    >
      <MaterialCommunityIcons name="bell-plus-outline" size={UI_ICON_SIZE_16} color={c.onPrimary} />
      <Text style={styles.buttonText}>{t('localAi.askVault.addReminder', { date })}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors
  const styles = StyleSheet.create({
    button: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
    },
    buttonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimary,
    },
    done: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    doneText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.primary,
    },
  })
  return styles
}, useMD3Theme)
