import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'

import { mediaKind } from '@pear-notes/core/store/slices/storageSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { BackupBreakdownSection } from '@/components/backup/BackupBreakdownSection'
import { BackupNotesListSection } from '@/components/backup/BackupNotesListSection'
import { DownloadsSection } from '@/components/backup/DownloadsSection'
import { UploadsSection } from '@/components/backup/UploadsSection'
import { ClearStorageBottomSheet } from '@/components/bottomsheet/ClearStorageAppBottomSheet'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_48,
  UI_SIZE_22,
  UI_SIZE_48,
  UI_SIZE_60,
  UI_SIZE_96,
  UI_SIZE_120,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getVaultLabel } from '@/lib/vaultLabels'
import { buildClearVaultDetails } from '@/utils/removalDetails'

import useVaultStorageScreen from './useVaultStorageScreen'

export default function VaultStorageScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const {
    totalBlobBytes,
    totalOnDiskBytes,
    isReclaiming,
    activeDownloads,
    activeUploads,
    noteTitleByKey,
    notesStorageInfo,
    buckets,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    hasMultipleVaults,
    currentVault,
    handleClearVaultConfirm,
    clearVaultSheetVisible,
    handleClearVaultPress,
    handleClearVaultCancel,
    noteCount,
    folderCount,
    otherVaults,
  } = useVaultStorageScreen()

  const vaultName = getVaultLabel(currentVault, t)
  const clearVaultDetails = useMemo(
    () =>
      buildClearVaultDetails(t, {
        device: 'iphone',
        vaultName,
        notes: noteCount,
        folders: folderCount,
        mediaBytes: totalBlobBytes,
        otherVaultNames: otherVaults.map((vault) => getVaultLabel(vault, t)),
      }),
    [folderCount, noteCount, otherVaults, t, totalBlobBytes, vaultName],
  )
  return (
    <RNView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <RNView style={styles.heroContainer}>
          <RNView style={styles.heroIcon}>
            <SymbolIcon name="cylinder.split.1x2" size={UI_ICON_SIZE_48} color={colors.primary} />
          </RNView>
          <Text style={styles.heroDesc}>{t('storage.vaultHero', { name: vaultName })}</Text>
        </RNView>

        <DownloadsSection
          downloads={activeDownloads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
          onRetry={handleRetryDownload}
          onPause={handlePauseDownload}
        />

        <UploadsSection
          uploads={activeUploads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
        />

        <RNView>
          <Text style={commonThemedStyles.sectionCamelCase}>{t('storage.usage')}</Text>
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.usageRow}>
              <Text style={styles.usageLabel}>{t('storage.notesData')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalBlobBytes)}</Text>
            </RNView>
            <RNView style={[styles.usageRow, styles.usageRowBorder]}>
              <Text style={styles.usageLabel}>{t('storage.diskFootprint')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalOnDiskBytes)}</Text>
            </RNView>
            <RNView style={[styles.usageRow, styles.usageRowBorder]}>
              <RNView style={styles.reclaimLabelWrap}>
                <Text style={styles.usageLabel}>{t('storage.compact')}</Text>
                <Text style={styles.reclaimDesc}>{t('storage.compactDesc')}</Text>
              </RNView>
              <Pressable
                onPress={handleReclaim}
                disabled={isReclaiming}
                style={({ pressed }) => [
                  styles.reclaimBtn,
                  isReclaiming && styles.reclaimBtnDisabled,
                  pressed && commonStyles.pressed,
                ]}
              >
                <Text style={styles.reclaimBtnText}>
                  {isReclaiming ? t('storage.compacting') : t('storage.compactNow')}
                </Text>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>

        <BackupBreakdownSection buckets={buckets} formatBytes={formatBytes} />

        <BackupNotesListSection
          notesStorageInfo={notesStorageInfo}
          formatBytes={formatBytes}
          handleDeleteMedia={handleDeleteMedia}
          mediaKind={mediaKind}
        />

        <RNView style={[commonThemedStyles.card, styles.removeCard]}>
          <Pressable
            onPress={handleClearVaultPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.removeRow, pressed && commonStyles.pressed]}
          >
            <Text style={styles.removeText}>
              {hasMultipleVaults
                ? t('storage.removal.vaultBtn', { name: vaultName })
                : t('storage.removal.allBtn')}
            </Text>
          </Pressable>
        </RNView>
      </ScrollView>

      <ClearStorageBottomSheet
        visible={clearVaultSheetVisible}
        details={clearVaultDetails}
        onConfirm={handleClearVaultConfirm}
        onCancel={handleClearVaultCancel}
      />
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
    },
    heroContainer: {
      alignItems: 'center',
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
      borderColor: theme.colors.borderSecondary,
    },
    heroDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
    },
    removeCard: {
      marginTop: Space.lg,
    },
    removeRow: {
      ...commonStyles.centered,
      paddingVertical: Space.md,
    },
    removeText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
    usageRow: {
      ...commonStyles.rowBetween,
      marginHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    usageRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    usageLabel: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    usageValue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    reclaimLabelWrap: {
      flex: 1,
      gap: Space.xs,
    },
    reclaimDesc: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    reclaimBtn: {
      minWidth: UI_SIZE_120,
      alignItems: 'center',
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: `${theme.colors.primary}1A`,
    },
    reclaimBtnDisabled: {
      opacity: 0.5,
    },
    reclaimBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  })
  return styles
})
