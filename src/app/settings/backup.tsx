import { mediaKind } from '@pear-notes/core/store/slices/storageSlice.js'
import { router, Stack } from 'expo-router'
import { Check, CloudUpload, RotateCcw, X } from 'lucide-react-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text as RNText,
  View as RNView,
  ScrollView,
  StyleSheet,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import useBackupScreen from '@/app/settings/useBackupScreen'
import { BackupBreakdownSection } from '@/components/backup/BackupBreakdownSection'
import { BackupNotesListSection } from '@/components/backup/BackupNotesListSection'
import { BackupStatsSection } from '@/components/backup/BackupStatsSection'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_28,
  UI_ICON_SIZE_48,
  UI_SIZE_14,
  UI_SIZE_15,
  UI_SIZE_2,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_27,
  UI_SIZE_30,
  UI_SIZE_4,
  UI_SIZE_48,
  UI_SIZE_54,
  UI_SIZE_60,
  UI_SIZE_72,
  UI_SIZE_96,
} from '@/constants/commonStyles'
import { formatBackupDate, formatBytes } from '@/lib/backupUtils'

export default function BackupScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()

  const handleBack = useCallback(() => router.back(), [])
  const {
    importStatus,
    totalBlobBytes,
    totalOnDiskBytes,
    reclaimableBytes,
    notesStorageInfo,
    buckets,
    lastBackupDate,
    confirmClear,
    showProgressModal,
    isError,
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleRestoreComplete,
    handleClearStorage,
    handleShowConfirmClear,
    handleHideConfirmClear,
    handleDeleteMedia,
    handleRestoreData,
    isExporting,
  } = useBackupScreen()

  const progressTitle = isExporting
    ? t('backup.progress.creatingTitle')
    : t('backup.progress.restoringTitle')

  const renderHeaderRight = useCallback(
    () => (
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        style={({ pressed }) => [styles.closeBtn, pressed && commonStyles.pressed]}
      >
        <X size={UI_ICON_SIZE_16} color={colors.text} strokeWidth={2.5} />
      </Pressable>
    ),
    [handleBack, styles, colors.text],
  )

  return (
    <RNView style={styles.container}>
      <Stack.Screen options={{ headerRight: renderHeaderRight }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(220)} style={styles.heroContainer}>
          <RNView style={styles.heroIcon}>
            <CloudUpload size={UI_ICON_SIZE_48} color={colors.primary} strokeWidth={1.5} />
          </RNView>
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
            <CloudUpload size={UI_ICON_SIZE_18} color={colors.black} strokeWidth={2} />
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
            <RotateCcw size={UI_ICON_SIZE_18} color={colors.text} strokeWidth={2} />
            <Text style={styles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </Animated.View>

        <BackupStatsSection
          lastBackupDate={lastBackupDate}
          totalBlobBytes={totalBlobBytes}
          totalOnDiskBytes={totalOnDiskBytes}
          reclaimableBytes={reclaimableBytes}
          formatBackupDate={formatBackupDate}
          formatBytes={formatBytes}
        />

        <BackupBreakdownSection buckets={buckets} formatBytes={formatBytes} />

        <BackupNotesListSection
          notesStorageInfo={notesStorageInfo}
          formatBytes={formatBytes}
          handleDeleteMedia={handleDeleteMedia}
          mediaKind={mediaKind}
        />

        {reclaimableBytes > 0 && (
          <Animated.View entering={FadeInDown.duration(240).delay(190)} style={styles.clearSection}>
            <Pressable
              onPress={handleShowConfirmClear}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.clearBtnText}>{t('backup.clearReclaimable')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showProgressModal} transparent animationType="fade" statusBarTranslucent>
        <RNView style={[commonStyles.modalOverlay, styles.overlayCenter]}>
          <RNView style={[commonStyles.modalCard, styles.progressCard]}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.progressIconWrap}>
                {!isError && importStatus.step !== 'done' && (
                  <ActivityIndicator
                    style={styles.progressSpinner}
                    size={UI_SIZE_72}
                    color={colors.primary}
                  />
                )}
                <RNView style={styles.progressIconInner}>
                  {importStatus.step === 'done' ? (
                    <Check size={UI_ICON_SIZE_28} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <CloudUpload size={UI_ICON_SIZE_28} color={colors.primary} strokeWidth={1.5} />
                  )}
                </RNView>
              </RNView>

              <RNText style={styles.progressTitle}>
                {isError
                  ? t('backup.progress.errorTitle')
                  : importStatus.step === 'done'
                    ? t('backup.progress.restoredTitle')
                    : progressTitle}
              </RNText>

              <RNText style={styles.progressDesc}>
                {isError
                  ? errorMessage
                  : importStatus.step === 'done'
                    ? t('backup.progress.restoredDesc')
                    : progressStatus.message}
              </RNText>

              {!isError && progressStatus.total > 0 && importStatus.step !== 'done' && (
                <RNView style={styles.progressBarTrack}>
                  <RNView
                    style={[
                      styles.progressBarFill,
                      { width: `${(progressStatus.current / progressStatus.total) * 100}%` },
                    ]}
                  />
                </RNView>
              )}

              {isError ? (
                <Pressable
                  onPress={isExporting ? handleCancelExport : handleCancelImport}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <RNText style={styles.cancelBtnText}>{t('common.close')}</RNText>
                </Pressable>
              ) : importStatus.step === 'done' ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <RNText style={styles.cancelBtnText}>{t('common.close')}</RNText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={isExporting ? handleCancelExport : handleCancelImport}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <RNText style={styles.cancelBtnText}>{t('common.cancel')}</RNText>
                </Pressable>
              )}
            </RNView>
          </RNView>
        </RNView>
      </Modal>

      <Modal visible={confirmClear} transparent animationType="fade" statusBarTranslucent>
        <RNView style={[commonStyles.modalOverlay, styles.overlayCenter]}>
          <RNView style={styles.confirmCard}>
            <RNText style={styles.progressTitle}>{t('backup.clearAllDataTitle')}</RNText>
            <RNText style={styles.progressDesc}>{t('backup.clearAllDataDesc')}</RNText>

            <RNView style={styles.clearActionRow}>
              <Pressable
                onPress={handleHideConfirmClear}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  commonStyles.flex1,
                  pressed && styles.btnPressed,
                ]}
              >
                <RNText style={styles.secondaryBtnText}>{t('common.cancel')}</RNText>
              </Pressable>
              <Pressable
                onPress={handleClearStorage}
                style={({ pressed }) => [styles.clearConfirmBtn, pressed && styles.btnPressed]}
              >
                <RNText style={styles.clearConfirmText}>{t('common.clear')}</RNText>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingBottom: UI_SIZE_60,
      paddingTop: Space.xl,
    },
    closeBtn: {
      width: UI_SIZE_30,
      height: UI_SIZE_30,
      borderRadius: UI_SIZE_15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroContainer: {
      alignItems: 'center',
      paddingVertical: Space.xl,
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: theme.colors.cardSelected,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.md,
    },
    heroDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
    },
    buttonsContainer: {
      gap: Space.md,
      marginBottom: Space.xl,
    },
    primaryBtn: {
      height: UI_SIZE_54,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
    },
    primaryBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.black,
    },
    secondaryBtn: {
      height: UI_SIZE_54,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
    },
    secondaryBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    btnPressed: { opacity: 0.7 },
    btnDisabled: { opacity: 0.4 },
    overlayCenter: {
      ...commonStyles.centered,
    },
    progressCard: {
      borderRadius: Radii.xl,
      backgroundColor: theme.colors.surface,
      marginHorizontal: Space.xl,
    },
    confirmCard: {
      borderRadius: Radii.xl,
      backgroundColor: theme.colors.surface,
      marginHorizontal: Space.xl,
      padding: Space.xl,
    },
    progressIconWrap: {
      width: UI_SIZE_72,
      height: UI_SIZE_72,
      ...commonStyles.centered,
      marginBottom: Space.xl,
    },
    progressSpinner: {
      position: 'absolute',
      width: UI_SIZE_72,
      height: UI_SIZE_72,
    },
    progressIconInner: {
      width: UI_SIZE_54,
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_27,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
    },
    progressTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
    },
    progressDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: UI_SIZE_20,
      marginBottom: Space.xl,
    },
    progressBarTrack: {
      width: '100%',
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      marginBottom: Space.xl,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
    cancelBtn: {
      paddingVertical: Space.md,
      paddingHorizontal: Space.xxl,
    },
    cancelBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
    clearSection: {
      marginTop: UI_SIZE_4,
      marginBottom: Space.sm,
    },
    clearActionRow: {
      flexDirection: 'row',
      gap: Space.md,
      marginTop: Space.md,
    },
    clearBtn: {
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
      paddingVertical: UI_SIZE_14,
      borderRadius: Radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    clearBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
    clearConfirmBtn: {
      flex: 1,
      height: UI_SIZE_54,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.error,
      ...commonStyles.centered,
    },
    clearConfirmText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.white,
    },
  })
  return styles
})
