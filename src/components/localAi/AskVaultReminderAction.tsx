import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

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
  const { colors } = useTheme()
  const styles = useStyles()
  if (enabled) {
    return (
      <View style={styles.done}>
        <SymbolView
          name="checkmark.circle.fill"
          size={UI_ICON_SIZE_14}
          tintColor={colors.primary}
          weight="semibold"
        />
        <Text style={styles.doneText}>{t('localAi.askVault.reminderOn', { date })}</Text>
      </View>
    )
  }
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && commonStyles.pressed]}
    >
      <SymbolView
        name="bell.badge"
        size={UI_ICON_SIZE_14}
        tintColor={colors.onPrimary}
        weight="semibold"
      />
      <Text style={styles.buttonText}>{t('localAi.askVault.addReminder', { date })}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    button: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    done: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    doneText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
  })
  return styles
})
