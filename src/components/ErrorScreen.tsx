import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_64,
} from '@/constants/commonStyles'

import { createThemedStylesheet, Text, View } from './Themed'

interface ErrorScreenProps {
  message: string
  onRetry: () => void
  // For errors that are not "try again" errors. `title` replaces the generic
  // heading; `action` replaces Retry, drawn as a SECONDARY button - it is used
  // for choices with consequences, which must not look like the easy way out.
  title?: string
  action?: { label: string; onPress: () => void }
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ message, onRetry, title, action }) => {
  const { t } = useTranslation()
  const styles = useStyles()

  return (
    <View style={styles.container}>
      <SymbolIcon
        name="exclamationmark.circle"
        size={UI_ICON_SIZE_64}
        color={styles.icon.color}
        style={styles.icon}
      />
      <Text style={styles.title}>{title ?? t('error.initFailed')}</Text>
      <Text style={styles.message}>{message}</Text>

      {action ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={action.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.7}>
          <SymbolIcon
            name="arrow.counterclockwise"
            size={UI_ICON_SIZE_20}
            color={styles.buttonText.color}
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>{t('error.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      backgroundColor: theme.colors.background,
      padding: Space.lg,
    },
    icon: {
      color: theme.colors.error,
      marginBottom: Space.lg,
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      marginBottom: Space.md,
    },
    message: {
      fontSize: FontSize.subtitle,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: Space.xxxl,
      lineHeight: 22,
    },
    button: {
      ...commonStyles.row,
      ...commonStyles.centered,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: Space.xl,
      paddingVertical: 14,
      borderRadius: Radii.md,
    },
    buttonIcon: {
      marginRight: Space.sm,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
    },
    secondaryButton: {
      ...commonStyles.row,
      ...commonStyles.centered,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: Space.xl,
      paddingVertical: 14,
      borderRadius: Radii.md,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
    },
  })
  return styles
})
