import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { router, Stack } from 'expo-router'
import { Check, CloudUpload, Eye, EyeOff, Key, RotateCcw, X } from 'lucide-react-native'
import { useCallback, useState } from 'react'
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
import { BackupStatsSection } from '@/components/backup/BackupStatsSection'
import { RecoveryKeyModal } from '@/components/backup/RecoveryKeyModal'
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
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { formatBackupDate, formatBytes } from '@/lib/backupUtils'
import { getBackupErrorMessage } from '@/utils/backupErrors'

export default function BackupScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()

  const handleBack = useCallback(() => router.back(), [])
  const {
    importStatus,
    totalBlobBytes,
    lastBackupDate,
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
    isExporting,
    deviceRecoveryKey,
    showRecoveryModal,
    handleConfirmRestore,
    handleCancelRecovery,
  } = useBackupScreen()

  const commonThemedStyles = useCommonThemedStyles()

  const [copied, setCopied] = useState(false)
  const [isKeyVisible, setIsKeyVisible] = useState(false)

  const toggleKeyVisibility = useCallback(() => {
    setIsKeyVisible((prev) => !prev)
  }, [])

  const handleCopyRecoveryKey = useCallback(async () => {
    if (deviceRecoveryKey) {
      await Clipboard.setStringAsync(deviceRecoveryKey)
      setCopied(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [deviceRecoveryKey])

  const progressTitle =
    importStatus.step === 'reading'
      ? t('backup.progress.readingTitle')
      : isExporting
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

        <Animated.View
          entering={FadeInDown.duration(240).delay(120)}
          style={[commonThemedStyles.card, styles.recoveryCard]}
        >
          <RNView style={styles.recoveryHeader}>
            <Key size={UI_ICON_SIZE_18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.recoveryTitle}>{t('backup.recoveryKey')}</Text>
          </RNView>
          <Text style={styles.recoveryDesc}>{t('backup.recoveryKeyDesc')}</Text>
          <RNView style={styles.keyContainer}>
            <Text
              ellipsizeMode={isKeyVisible ? 'middle' : 'clip'}
              numberOfLines={1}
              style={styles.keyText}
            >
              {isKeyVisible
                ? deviceRecoveryKey
                : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </Text>
            <Pressable
              onPress={toggleKeyVisibility}
              style={({ pressed }) => [styles.eyeBtn, pressed && commonStyles.pressed]}
            >
              {isKeyVisible ? (
                <EyeOff size={UI_ICON_SIZE_18} color={colors.textMuted} />
              ) : (
                <Eye size={UI_ICON_SIZE_18} color={colors.textMuted} />
              )}
            </Pressable>
            <Pressable
              onPress={handleCopyRecoveryKey}
              style={({ pressed }) => [styles.copyBtn, pressed && commonStyles.pressed]}
            >
              <Text style={styles.copyBtnText}>
                {copied ? t('backup.copied') : t('backup.copyKey')}
              </Text>
            </Pressable>
          </RNView>
        </Animated.View>

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
                  ? getBackupErrorMessage(errorMessage, t)
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

      <RecoveryKeyModal
        visible={showRecoveryModal}
        onClose={handleCancelRecovery}
        onSubmit={handleConfirmRestore}
      />
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
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: FontSize.caption * 1.4,
      marginBottom: Space.md,
    },
    keyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      paddingLeft: Space.md,
      paddingRight: Space.xs,
      height: UI_SIZE_54,
    },
    keyText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    copyBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: Radii.md,
      paddingHorizontal: Space.md,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    copyBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.black,
    },
    eyeBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Space.xs,
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
      color: theme.colors.black,
    },
    secondaryBtn: {
      height: UI_SIZE_54,
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
      backgroundColor: theme.colors.surface,
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
      color: theme.colors.primary,
    },
  })
  return styles
})
