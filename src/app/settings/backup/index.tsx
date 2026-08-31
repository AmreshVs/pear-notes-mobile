import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View as RNView,
} from 'react-native'
import { FadeIn, FadeInDown } from 'react-native-reanimated'

import { formatBytes } from '@pear-notes/core/utils.js'

import { BackupStatsSection } from '@/components/backup/BackupStatsSection'
import { MotionView } from '@/components/MotionView'
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
  UI_ICON_SIZE_28,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_27,
  UI_SIZE_48,
  UI_SIZE_54,
  UI_SIZE_60,
  UI_SIZE_72,
  UI_SIZE_96,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { formatBackupDate } from '@/lib/backupUtils'
import { getBackupErrorMessage } from '@/utils/backupErrors'

import useBackupScreen from './useBackupScreen'

export default function BackupScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()

  const {
    importStatus,
    totalBlobBytes,
    lastBackupDate,
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
    handleRunInBackground,
    handleRestoreComplete,
    handleRestoreData,
    isExporting,
  } = useBackupScreen()

  const commonThemedStyles = useCommonThemedStyles()

  const progressTitle =
    importStatus.step === 'reading'
      ? t('backup.progress.readingTitle')
      : isExporting
        ? t('backup.progress.creatingTitle')
        : t('backup.progress.restoringTitle')

  return (
    <RNView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotionView entering={FadeIn.duration(220)} style={styles.heroContainer}>
          <RNView style={styles.heroIcon}>
            <SymbolIcon name="icloud.and.arrow.up" size={UI_ICON_SIZE_48} color={colors.primary} />
          </RNView>
          <Text style={styles.heroTitle}>{t('backup.hero.title')}</Text>
          <Text style={styles.heroDesc}>{t('backup.hero.description')}</Text>
        </MotionView>

        <MotionView entering={FadeInDown.duration(240).delay(60)} style={styles.buttonsContainer}>
          <Pressable
            onPress={handleCreateBackup}
            disabled={isActive}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
              isActive && styles.btnDisabled,
            ]}
          >
            <SymbolIcon
              name="icloud.and.arrow.up"
              size={UI_ICON_SIZE_18}
              color={colors.onPrimary}
              weight="medium"
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
            <SymbolIcon
              name="arrow.counterclockwise"
              size={UI_ICON_SIZE_18}
              color={colors.text}
              weight="medium"
            />
            <Text style={styles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(240).delay(120)}
          style={[commonThemedStyles.card, styles.recoveryCard]}
        >
          <RNView style={styles.recoveryHeader}>
            <SymbolIcon name="lock" size={UI_ICON_SIZE_18} color={colors.primary} weight="medium" />
            <Text style={styles.recoveryTitle}>{t('backup.protectedTitle')}</Text>
          </RNView>
          <Text style={styles.recoveryDesc}>{t('backup.protectedDesc')}</Text>
        </MotionView>

        <BackupStatsSection
          lastBackupDate={lastBackupDate}
          totalBlobBytes={totalBlobBytes}
          formatBackupDate={formatBackupDate}
          formatBytes={formatBytes}
        />
      </ScrollView>

      <Modal visible={showProgressModal} transparent animationType="fade" statusBarTranslucent>
        <RNView style={[commonStyles.modalOverlay, styles.overlayCenter]}>
          <RNView style={[commonStyles.modalCard, styles.progressCard]}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.progressIconWrap}>
                {!isError && !isImportDone && !isExportDone && (
                  <ActivityIndicator
                    style={styles.progressSpinner}
                    size={UI_SIZE_72}
                    color={colors.primary}
                  />
                )}
                <RNView style={styles.progressIconInner}>
                  {isImportDone || isExportDone ? (
                    <SymbolIcon
                      name="checkmark"
                      size={UI_ICON_SIZE_28}
                      color={colors.primary}
                      weight="medium"
                    />
                  ) : (
                    <SymbolIcon
                      name="icloud.and.arrow.up"
                      size={UI_ICON_SIZE_28}
                      color={colors.primary}
                    />
                  )}
                </RNView>
              </RNView>

              <RNText style={styles.progressTitle}>
                {isError
                  ? t('backup.progress.errorTitle')
                  : isImportDone
                    ? t('backup.progress.restoredTitle')
                    : isExportDone
                      ? t('backup.progress.completeTitle')
                      : progressTitle}
              </RNText>

              <RNText style={styles.progressDesc}>
                {isError
                  ? getBackupErrorMessage(errorMessage, t)
                  : isImportDone
                    ? t('backup.progress.restoredDesc')
                    : isExportDone
                      ? t('backup.progress.completeDesc')
                      : `${progressStatus.message}${progressStatus.progress > 0 ? `  ${progressStatus.progress}%` : ''}`}
              </RNText>

              {!isError && !isImportDone && !isExportDone && (
                <RNView style={styles.progressBarTrack}>
                  <RNView
                    style={[styles.progressBarFill, { width: `${progressStatus.progress}%` }]}
                  />
                </RNView>
              )}

              {isError ? (
                <Pressable
                  onPress={handleDismissProgress}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <RNText style={styles.cancelBtnText}>{t('common.close')}</RNText>
                </Pressable>
              ) : isImportDone ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <RNText style={styles.cancelBtnText}>{t('common.close')}</RNText>
                </Pressable>
              ) : isExportDone ? null : (
                <RNView style={styles.modalActions}>
                  <Pressable
                    onPress={handleRunInBackground}
                    style={({ pressed }) => [styles.bgBtn, pressed && commonStyles.pressed]}
                  >
                    <RNText style={styles.bgBtnText}>{t('backup.runInBackground')}</RNText>
                  </Pressable>
                  <Pressable
                    onPress={isExporting ? handleCancelExport : handleCancelImport}
                    style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                  >
                    <RNText style={styles.cancelBtnText}>{t('common.cancel')}</RNText>
                  </Pressable>
                </RNView>
              )}
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
      backgroundColor: theme.colors.backgroundElevated,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingBottom: UI_SIZE_60,
      paddingTop: Space.xl,
    },
    recoveryCard: {
      padding: Space.lg,
      marginBottom: Space.md,
    },
    recoveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      marginBottom: Space.xs,
    },
    recoveryTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
    },
    recoveryDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: FontSize.caption * 1.4,
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
      minHeight: UI_SIZE_54,
      borderRadius: Radii.lg,
      backgroundColor: theme.colors.primary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
    },
    primaryBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.onPrimary,
    },
    secondaryBtn: {
      minHeight: UI_SIZE_54,
      borderRadius: Radii.lg,
      backgroundColor: theme.colors.controlBackground,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: Space.sm,
    },
    secondaryBtnText: {
      fontSize: FontSize.subtitle,
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
      backgroundColor: theme.colors.cardSurface,
      marginHorizontal: Space.xl,
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
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
    modalActions: {
      flexDirection: 'column',
      gap: Space.md,
      width: '100%',
    },
    bgBtn: {
      paddingVertical: Space.md,
      paddingHorizontal: Space.xxl,
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      alignItems: 'center',
    },
    bgBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
  })
  return styles
})
