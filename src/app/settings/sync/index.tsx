import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView, type ViewStyle } from 'react-native'
import { router } from 'expo-router'

import { BackgroundSyncSection } from '@/components/settings/BackgroundSyncSection'
import { MediaSyncSection } from '@/components/settings/MediaSyncSection'
import { SyncStatusSection } from '@/components/settings/SyncStatusSection'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_48,
  UI_SIZE_20,
  UI_SIZE_54,
  UI_SIZE_60,
} from '@/constants/commonStyles'

export default function SyncScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  const openDiagnostics = useCallback(() => {
    router.push('/settings/debug' as never)
  }, [])

  const getDiagnosticsStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] =>
      pressed ? [styles.diagnosticsBtn, commonStyles.pressed] : [styles.diagnosticsBtn],
    [styles.diagnosticsBtn],
  )

  return (
    <RNView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <RNView style={styles.hero}>
          <RNView style={styles.heroIcon}>
            <SymbolIcon name="arrow.clockwise" size={UI_ICON_SIZE_48} color={colors.primary} />
          </RNView>
          <Text style={styles.heroDesc}>{t('settings.sync.screenDesc')}</Text>
        </RNView>

        <SyncStatusSection />
        <BackgroundSyncSection />
        <MediaSyncSection />

        <Pressable onPress={openDiagnostics} style={getDiagnosticsStyle} accessibilityRole="button">
          <SymbolIcon
            name="stethoscope"
            size={UI_ICON_SIZE_18}
            color={colors.text}
            weight="medium"
          />
          <Text style={styles.diagnosticsText}>{t('debug.openDiagnostics')}</Text>
        </Pressable>
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: Space.md,
    },
    hero: {
      ...commonStyles.centered,
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
      marginBottom: Space.md,
    },
    heroDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.45,
      maxWidth: 320,
    },
    diagnosticsBtn: {
      minHeight: UI_SIZE_54,
      borderRadius: Radii.lg,
      backgroundColor: theme.colors.controlBackground,
      borderColor: theme.colors.borderSecondary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
      marginTop: Space.lg,
    },
    diagnosticsText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
    },
  })
  return styles
})
