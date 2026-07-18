import { AlertTriangle } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { createThemedStylesheet, Text, useTheme, View } from './Themed'

import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

interface AppErrorBoundaryProps {
  error: Error
  retry: () => Promise<void>
}

export function AppErrorBoundary({ error, retry }: AppErrorBoundaryProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <AlertTriangle size={UI_ICON_SIZE_40} color={colors.error} />
        </View>
        <Text style={styles.title}>{t('errorBoundary.title')}</Text>
        <Text style={styles.message}>{t('errorBoundary.message')}</Text>
        {error?.message ? <Text style={styles.detail}>{error.message}</Text> : null}
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>{t('errorBoundary.reload')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Space.xl,
      backgroundColor: theme.colors.background,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      padding: Space.xxl,
      borderRadius: Radii.xl,
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
    detail: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.mono,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: Space.sm,
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
      color: theme.colors.black,
    },
  })
  return styles
})
