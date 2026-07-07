import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useBackupScreen from './useBackupScreen'
import { AndroidBackupStatsSection } from '@/components/android/AndroidBackupStatsSection'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_4,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_54,
  UI_SIZE_72,
  UI_SIZE_8,
  UI_SIZE_96,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { formatBackupDate, formatBytes, hexWithAlpha } from '@/lib/backupUtils'
import { getBackupErrorMessage } from '@/utils/backupErrors'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  surfaceContainer?: string
}

export default function AndroidBackupScreen() {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const appTheme = useTheme()
  const c = theme.colors as ExtendedColors
  const styles = useStyles()
  const {
    importStatus,
    totalBlobBytes,
    lastBackupDate,
    isExporting,
    showProgressModal,
    isError,
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleRestoreComplete,
    handleRestoreData,
  } = useBackupScreen()

  const progressTitle =
    importStatus.step === 'reading'
      ? t('backup.progress.readingTitle')
      : isExporting
        ? t('backup.progress.creatingTitle')
        : t('backup.progress.restoringTitle')

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('backup.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(220)} style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="cloud-upload-outline"
              size={UI_SIZE_48}
              color={c.primary}
            />
          </View>
          <Text style={styles.heroTitle}>{t('backup.hero.title')}</Text>
          <Text style={styles.heroDesc}>{t('backup.hero.description')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(60)}
          style={styles.buttonsContainer}
        >
          <Pressable
            onPress={handleCreateBackup}
            disabled={isActive}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
              isActive && styles.btnDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="cloud-upload"
              size={UI_ICON_SIZE_20}
              color={appTheme.colors.black}
            />
            <Text style={styles.primaryBtnText}>{t('backup.createBackup')}</Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreData}
            disabled={isActive}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.btnPressed,
              isActive && styles.btnDisabled,
            ]}
          >
            <MaterialCommunityIcons name="restore" size={UI_ICON_SIZE_20} color={c.onSurface} />
            <Text style={styles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240).delay(120)} style={styles.recoveryCard}>
          <View style={styles.recoveryHeader}>
            <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_20} color={c.primary} />
            <Text style={styles.recoveryTitle}>{t('backup.protectedTitle')}</Text>
          </View>
          <Text style={styles.recoveryDesc}>{t('backup.protectedDesc')}</Text>
        </Animated.View>

        <AndroidBackupStatsSection
          lastBackupDate={lastBackupDate}
          totalBlobBytes={totalBlobBytes}
          formatBackupDate={formatBackupDate}
          formatBytes={formatBytes}
        />
      </ScrollView>

      <Modal visible={showProgressModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayCenter}>
          <View style={styles.progressCard}>
            <View style={styles.progressModalInner}>
              <View style={styles.progressIconWrap}>
                {!isError && importStatus.step !== 'done' && (
                  <ActivityIndicator
                    size="large"
                    color={c.primary}
                    style={styles.progressSpinner}
                  />
                )}
                <View style={styles.progressIconInner}>
                  {importStatus.step === 'done' ? (
                    <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_24} color={c.primary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={UI_ICON_SIZE_24}
                      color={c.primary}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.progressTitle}>
                {isError
                  ? t('backup.progress.creatingTitle')
                  : importStatus.step === 'done'
                    ? t('backup.restoreComplete')
                    : progressTitle}
              </Text>
              <Text style={styles.progressDesc}>
                {isError
                  ? getBackupErrorMessage(errorMessage, t)
                  : importStatus.step === 'done'
                    ? t('backup.restoreCompleteDesc')
                    : `${progressStatus.message}${progressStatus.progress > 0 ? `  ${progressStatus.progress}%` : ''}`}
              </Text>

              {!isError && importStatus.step !== 'done' && (
                <View style={styles.progressBarTrack}>
                  <View
                    style={[styles.progressBarFill, { width: `${progressStatus.progress}%` }]}
                  />
                </View>
              )}

              {importStatus.step === 'done' ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
                >
                  <Text style={styles.cancelBtnText}>{t('pairing.overlay.okay')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={isExporting ? handleCancelExport : handleCancelImport}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
                >
                  <Text style={styles.cancelBtnText}>
                    {isError ? t('backup.progress.dismiss') : t('backup.progress.cancel')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const useAndroidBackupHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginLeft: UI_SIZE_8,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      paddingTop: UI_SIZE_10,
    },
    heroContainer: {
      alignItems: 'center',
      paddingVertical: UI_SIZE_28,
      marginBottom: UI_SIZE_8,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_24,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'center',
      marginBottom: UI_SIZE_12,
    },
    heroDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
      paddingHorizontal: UI_SIZE_8,
    },
    buttonsContainer: {
      gap: UI_SIZE_12,
      marginBottom: UI_SIZE_24,
    },
    primaryBtn: {
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
    },
    primaryBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.black,
    },
    secondaryBtn: {
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
    },
    secondaryBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    btnPressed: { opacity: 0.7 },
    btnDisabled: { opacity: 0.4 },
    overlayCenter: {
      flex: 1,
      backgroundColor: theme.colors.backdrop,
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_32,
    },
    progressCard: {
      width: '100%',
      backgroundColor: c.surfaceContainerHigh ?? c.surface,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    progressModalInner: {
      padding: UI_SIZE_24,
      alignItems: 'center',
    },
    progressIconWrap: {
      width: UI_SIZE_72,
      height: UI_SIZE_72,
      ...commonStyles.centered,
      marginBottom: UI_SIZE_24,
    },
    progressSpinner: {
      position: 'absolute',
      width: UI_SIZE_72,
      height: UI_SIZE_72,
    },
    progressIconInner: {
      width: UI_SIZE_54,
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_28,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
      ...commonStyles.centered,
    },
    progressTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'center',
      marginBottom: UI_SIZE_8,
    },
    progressDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_20,
      marginBottom: UI_SIZE_24,
    },
    progressBarTrack: {
      width: '100%',
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
      marginBottom: UI_SIZE_24,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    cancelBtn: {
      paddingVertical: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_24,
      borderRadius: UI_SIZE_9999,
    },
    cancelBtnPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    cancelBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    recoveryCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_20,
      marginTop: UI_SIZE_12,
      marginBottom: UI_SIZE_12,
    },
    recoveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      marginBottom: UI_SIZE_4,
    },
    recoveryTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    recoveryDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_20,
      marginBottom: UI_SIZE_16,
    },
  })
  return styles
}, useAndroidBackupHooks)
