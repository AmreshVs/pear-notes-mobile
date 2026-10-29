import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet } from 'react-native'

import { CrashReportPanel } from '@/components/CrashReportPanel'
import { SymbolIcon } from '@/components/SymbolIcon'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { createThemedStylesheet, Text, useTheme, View } from './Themed'

interface AppErrorBoundaryProps {
  error: Error
  retry: () => Promise<void>
}

export function AppErrorBoundary({ error, retry }: AppErrorBoundaryProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()

  const title = t('errorBoundary.title')
  const message = t('errorBoundary.message')
  // String(error) is "TypeError: ..." - the same line the stack opens with.
  const crash = { source: 'render' as const, error: String(error), stack: error?.stack }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <SymbolIcon name="exclamationmark.triangle" size={UI_ICON_SIZE_40} color={colors.error} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.panel}>
          <CrashReportPanel crash={crash} title={title} message={message} />
        </View>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>{t('errorBoundary.reload')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Space.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      padding: Space.xxl,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.surface,
    },
    iconBadge: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.xl,
      marginBottom: Space.lg,
      backgroundColor: hexWithAlpha(theme.colors.error, 0.15),
    },
    title: {
      fontSize: FontSize.heading,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
    },
    message: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    panel: {
      width: '100%',
      marginTop: Space.lg,
    },
    button: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: Space.base,
      borderRadius: Radii.md,
      marginTop: Space.xl,
      backgroundColor: theme.colors.primary,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
