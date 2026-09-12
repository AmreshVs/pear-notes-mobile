import { useMemo } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { formatBytes } from '@pear-notes/core/utils.js'

import { AndroidBackupStatsSection } from '@/components/android/AndroidBackupStatsSection'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_54,
  UI_SIZE_72,
  UI_SIZE_96,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { formatBackupDate, hexWithAlpha } from '@/lib/backupUtils'
import { getBackupErrorMessage } from '@/utils/backupErrors'

import useBackupScreen from './useBackupScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
  surfaceContainer?: string
}

export default function AndroidBackupScreen() {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const {
    importStatus,
    totalBlobBytes,
    lastBackupDate,
    isExporting,
    showProgressModal,
    isError,
    isExportDone,
    isImportDone,
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleDismissProgress,
    handleRestoreComplete,
    handleRestoreData,
    handleRunInBackground,
  } = useBackupScreen()

  const progressTitle =
    importStatus.step === 'reading'
      ? t('backup.progress.readingTitle')
      : isExporting
        ? t('backup.progress.creatingTitle')
        : t('backup.progress.restoringTitle')

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('backup.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="backup-restore"
              size={UI_ICON_SIZE_48}
              color={c.primary}
            />
          </View>
          <Text style={styles.heroDesc}>{t('backup.hero.description')}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={handleCreateBackup}
            disabled={isActive}
            android_ripple={ripplePrimary}
            style={[styles.primaryBtn, isActive && styles.btnDisabled]}
          >
            <MaterialCommunityIcons
              name="export-variant"
              size={UI_ICON_SIZE_20}
              color={c.onPrimary}
            />
            <Text style={styles.primaryBtnText}>{t('backup.createBackup')}</Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreData}
            disabled={isActive}
            android_ripple={ripple}
            style={[styles.secondaryBtn, isActive && styles.btnDisabled]}
          >
            <MaterialCommunityIcons name="import" size={UI_ICON_SIZE_20} color={c.onSurface} />
            <Text style={styles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </View>

        <View style={styles.recoveryCard}>
          <View style={styles.recoveryHeader}>
            <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_20} color={c.primary} />
            <Text style={styles.recoveryTitle}>{t('backup.protectedTitle')}</Text>
          </View>
          <Text style={styles.recoveryDesc}>{t('backup.protectedDesc')}</Text>
        </View>

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
                {!isError && !isImportDone && !isExportDone && (
                  <ActivityIndicator
                    size="large"
                    color={c.primary}
                    style={styles.progressSpinner}
                  />
                )}
                <View style={styles.progressIconInner}>
                  {isImportDone || isExportDone ? (
                    <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_24} color={c.primary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="backup-restore"
                      size={UI_ICON_SIZE_24}
                      color={c.primary}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.progressTitle}>
                {isError
                  ? t('backup.progress.errorTitle')
                  : isImportDone
                    ? t('backup.restoreComplete')
                    : isExportDone
                      ? t('backup.progress.completeTitle')
                      : progressTitle}
              </Text>
              <Text style={styles.progressDesc}>
                {isError
                  ? getBackupErrorMessage(errorMessage, t)
                  : isImportDone
                    ? t('backup.restoreCompleteDesc')
                    : isExportDone
                      ? t('backup.progress.completeDesc')
                      : `${progressStatus.message}${progressStatus.progress > 0 ? `  ${progressStatus.progress}%` : ''}`}
              </Text>

              {!isError && !isImportDone && !isExportDone && (
                <View style={styles.progressBarTrack}>
                  <View
                    style={[styles.progressBarFill, { width: `${progressStatus.progress}%` }]}
                  />
                </View>
              )}

              {isError ? (
                <Pressable
                  onPress={handleDismissProgress}
                  android_ripple={ripple}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{t('backup.progress.dismiss')}</Text>
                </Pressable>
              ) : isImportDone ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  android_ripple={ripple}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{t('pairing.overlay.okay')}</Text>
                </Pressable>
              ) : isExportDone ? null : (
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={handleRunInBackground}
                    android_ripple={ripple}
                    style={styles.bgBtn}
                  >
                    <Text style={styles.bgBtnText}>{t('backup.runInBackground')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={isExporting ? handleCancelExport : handleCancelImport}
                    android_ripple={ripple}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>{t('backup.progress.cancel')}</Text>
                  </Pressable>
                </View>
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
      paddingHorizontal: UI_SIZE_16,
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
      padding: Space.base,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    heroContainer: {
      alignItems: 'center',
      marginBottom: UI_SIZE_28,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_24,
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
      marginBottom: Space.xl,
    },
    primaryBtn: {
      overflow: 'hidden',
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
    },
    primaryBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary,
    },
    secondaryBtn: {
      overflow: 'hidden',
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
    },
    secondaryBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
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
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: UI_SIZE_8,
    },
    bgBtn: {
      overflow: 'hidden',
      paddingVertical: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_20,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primaryContainer ?? c.surfaceVariant,
    },
    bgBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onPrimaryContainer ?? c.onSurface,
    },
    cancelBtn: {
      overflow: 'hidden',
      paddingVertical: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_24,
      borderRadius: UI_SIZE_9999,
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
      padding: Space.base,
      marginBottom: Space.md,
    },
    recoveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      marginBottom: UI_SIZE_4,
    },
    recoveryTitle: {
      fontSize: FontSize.body,
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
