import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native'

import { CrashReportPanel } from '@/components/CrashReportPanel'
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
import type { Crash } from '@/lib/crashReport'

import { createThemedStylesheet, Text } from './Themed'

interface ErrorScreenProps {
  message: string
  onRetry: () => void
  title?: string
  action?: { label: string; onPress: () => void }
  crash?: Crash
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message,
  onRetry,
  title,
  action,
  crash,
}) => {
  const { t } = useTranslation()
  const styles = useStyles()
  const heading = title ?? t('error.initFailed')

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <SymbolIcon
        name="exclamationmark.circle"
        size={UI_ICON_SIZE_64}
        color={styles.icon.color}
        style={styles.icon}
      />
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.message}>{message}</Text>

      {crash ? <CrashReportPanel crash={crash} title={heading} message={message} /> : null}

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
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1,
      ...commonStyles.centered,
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
