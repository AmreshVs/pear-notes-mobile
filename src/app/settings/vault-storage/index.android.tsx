import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Stack } from 'expo-router'

import { mediaKind } from '@pear-notes/core/store/slices/storageSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { AndroidBackupBreakdownSection } from '@/components/android/AndroidBackupBreakdownSection'
import { AndroidBackupNotesListSection } from '@/components/android/AndroidBackupNotesListSection'
import { AndroidDownloadsSection } from '@/components/android/AndroidDownloadsSection'
import { AndroidSealWaitingSection } from '@/components/android/AndroidSealWaitingSection'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { AndroidUploadsSection } from '@/components/android/AndroidUploadsSection'
import { RemovalBottomSheet } from '@/components/android/RemovalBottomSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_48,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_96,
  UI_SIZE_120,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'
import { buildClearVaultDetails } from '@/utils/removalDetails'

import useVaultStorageScreen from './useVaultStorageScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  surfaceContainer?: string
}

export default function AndroidVaultStorageScreen() {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const styles = useStyles()

  const {
    totalBlobBytes,
    totalOnDiskBytes,
    isReclaiming,
    activeDownloads,
    activeUploads,
    sealWaiting,
    noteTitleByKey,
    notesStorageRows,
    buckets,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    hasMultipleVaults,
    currentVault,
    clearVaultSheetVisible,
    noteCount,
    folderCount,
    otherVaults,
    handleClearVaultPress,
    handleClearVaultConfirm,
    handleClearVaultCancel,
  } = useVaultStorageScreen()

  const vaultName = getVaultLabel(currentVault, t)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleDanger = useMemo(() => androidRipple(c.error), [c.error])
  const clearVaultDetails = useMemo(
    () =>
      buildClearVaultDetails(t, {
        device: 'phone',
        vaultName,
        notes: noteCount,
        folders: folderCount,
        mediaBytes: totalBlobBytes,
        otherVaultNames: otherVaults.map((vault) => getVaultLabel(vault, t)),
      }),
    [folderCount, noteCount, otherVaults, t, totalBlobBytes, vaultName],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <AndroidSettingsAppBar title={t('layouts.vaultStorage')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="database-outline"
              size={UI_ICON_SIZE_48}
              color={c.primary}
            />
          </View>
          <Text style={styles.heroDesc}>{t('storage.vaultHero', { name: vaultName })}</Text>
        </View>

        <AndroidDownloadsSection
          downloads={activeDownloads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
          onRetry={handleRetryDownload}
          onPause={handlePauseDownload}
        />

        <AndroidUploadsSection
          uploads={activeUploads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
        />

        <AndroidSealWaitingSection
          files={sealWaiting}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
        />

        <View>
          <Text style={styles.sectionTitle}>{t('storage.usage')}</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>{t('storage.notesData')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalBlobBytes)}</Text>
            </View>
            <View style={[styles.usageRow, styles.usageRowBorder]}>
              <Text style={styles.usageLabel}>{t('storage.diskFootprint')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalOnDiskBytes)}</Text>
            </View>
            <View style={[styles.usageRow, styles.usageRowBorder]}>
              <View style={styles.reclaimLabelWrap}>
                <Text style={styles.usageLabel}>{t('storage.compact')}</Text>
                <Text style={styles.reclaimDesc}>{t('storage.compactDesc')}</Text>
              </View>
              <Pressable
                onPress={handleReclaim}
                disabled={isReclaiming}
                android_ripple={ripple}
                style={[styles.reclaimBtn, isReclaiming && styles.reclaimBtnDisabled]}
              >
                <Text style={styles.reclaimBtnText}>
                  {isReclaiming ? t('storage.compacting') : t('storage.compactNow')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <AndroidBackupBreakdownSection buckets={buckets} formatBytes={formatBytes} />

        <AndroidBackupNotesListSection
          notesStorageInfo={notesStorageRows}
          formatBytes={formatBytes}
          handleDeleteMedia={handleDeleteMedia}
          mediaKind={mediaKind}
        />

        <Pressable
          onPress={handleClearVaultPress}
          android_ripple={rippleDanger}
          accessibilityRole="button"
          style={styles.removeButton}
        >
          <Text style={styles.removeButtonText}>
            {hasMultipleVaults
              ? t('storage.removal.vaultBtn', { name: vaultName })
              : t('storage.removal.allBtn')}
          </Text>
        </Pressable>
      </ScrollView>

      <RemovalBottomSheet
        visible={clearVaultSheetVisible}
        details={clearVaultDetails}
        onConfirm={handleClearVaultConfirm}
        onCancel={handleClearVaultCancel}
      />
    </View>
  )
}

const useAndroidStorageHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    removeButton: {
      overflow: 'hidden',
      ...commonStyles.centered,
      minHeight: UI_SIZE_48,
      marginTop: UI_SIZE_24,
      borderRadius: UI_SIZE_9999,
      borderWidth: 1,
      borderColor: hexWithAlpha(c.error, 0.5),
    },
    removeButtonText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    heroContainer: {
      alignItems: 'center',
      paddingBottom: Space.base,
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
    heroDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
      paddingHorizontal: UI_SIZE_8,
    },
    sectionTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      letterSpacing: 0.5,
    },
    usageCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
    },
    usageRow: {
      ...commonStyles.rowBetween,
      padding: Space.base,
    },
    usageRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border ?? '#38383a', 0.5),
    },
    usageLabel: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    usageValue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    reclaimLabelWrap: {
      flex: 1,
      gap: UI_SIZE_4,
    },
    reclaimDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    reclaimBtn: {
      overflow: 'hidden',
      minWidth: UI_SIZE_120,
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    reclaimBtnDisabled: {
      opacity: 0.5,
    },
    reclaimBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
      textAlign: 'center',
    },
  })
  return styles
}, useAndroidStorageHooks)
