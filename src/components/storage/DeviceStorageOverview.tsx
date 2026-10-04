import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import { formatBytes } from '@pear-notes/core/utils.js'

import { ToneBlock } from '@/components/storage/ToneBlock'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_10,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'
import type { StorageBarSegment, StorageTone, VaultUsage } from '@/utils/storageBar'

import type { DeviceStorageOverviewProps } from './deviceStorageOverview.types'

const APP_TONE_ALPHA = 0.3

export function DeviceStorageOverview({
  total,
  measured,
  vaultUsage,
  breakdown,
  isClearingCache,
  isDeletingOldVaults,
  onClearCache,
  onDeleteOldVaults,
  onOpenAiModels,
  onOpenVaultStorage,
  onRemoveAllData,
}: DeviceStorageOverviewProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const tones = useMemo<Record<StorageTone, string>>(
    () => ({
      openVault: colors.primary,
      otherVault: colors.storageOtherVault,
      ai: colors.success,
      app: hexWithAlpha(colors.text, APP_TONE_ALPHA),
    }),
    [colors.primary, colors.storageOtherVault, colors.success, colors.text],
  )

  const confirmDeleteOldVaults = useCallback(() => {
    Alert.alert(
      t('storage.device.deleteOldVaultsTitle'),
      t('storage.device.deleteOldVaultsMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('storage.device.deleteOldVaults'),
          style: 'destructive',
          onPress: onDeleteOldVaults,
        },
      ],
    )
  }, [onDeleteOldVaults, t])

  const renderSegment = useCallback(
    (segment: StorageBarSegment) => (
      <ToneBlock
        key={segment.key}
        baseStyle={commonStyles.flex1}
        grow={segment.share}
        color={tones[segment.tone]}
      />
    ),
    [tones],
  )

  const renderVault = useCallback(
    (vault: VaultUsage, index: number) => {
      const label = getVaultLabel(vault, t)
      const content = (
        <>
          <ToneBlock
            baseStyle={styles.dot}
            color={vault.current ? tones.openVault : tones.otherVault}
          />
          <Text style={styles.label} numberOfLines={1}>
            {vault.current ? `${label} · ${t('storage.device.openTag')}` : label}
          </Text>
          <Text style={styles.value}>{formatBytes(vault.bytes)}</Text>
          {vault.current && (
            <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_16} color={colors.textMuted} />
          )}
        </>
      )
      const rowStyle = [styles.row, index > 0 && styles.rowBorder]
      if (!vault.current) {
        return (
          <View key={vault.id} style={rowStyle}>
            {content}
          </View>
        )
      }
      return (
        <Pressable
          key={vault.id}
          onPress={onOpenVaultStorage}
          accessibilityRole="button"
          style={({ pressed }) => [...rowStyle, pressed && commonStyles.pressed]}
        >
          {content}
        </Pressable>
      )
    },
    [colors.textMuted, onOpenVaultStorage, styles, t, tones],
  )

  return (
    <>
      <View style={[commonThemedStyles.card, styles.totalCard]}>
        <Text style={styles.caption}>{t('storage.device.onThisIphone')}</Text>
        <Text style={styles.total}>
          {measured ? formatBytes(total) : t('storage.device.measuring')}
        </Text>
        {measured && <View style={styles.bar}>{breakdown.segments.map(renderSegment)}</View>}
      </View>

      {vaultUsage.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>{t('vaults.title')}</Text>
          <View style={commonThemedStyles.card}>{vaultUsage.map(renderVault)}</View>
        </>
      )}

      <Text style={styles.sectionHeader}>{t('storage.device.thisIphone')}</Text>
      <View style={commonThemedStyles.card}>
        {breakdown.showAi && (
          <Pressable
            onPress={onOpenAiModels}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          >
            <ToneBlock baseStyle={styles.dot} color={tones.ai} />
            <Text style={styles.label}>{t('settings.onDeviceAi.storageRow')}</Text>
            <Text style={styles.value}>{formatBytes(breakdown.aiBytes)}</Text>
            <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_16} color={colors.textMuted} />
          </Pressable>
        )}
        <View style={[styles.row, breakdown.showAi && styles.rowBorder]}>
          <ToneBlock baseStyle={styles.dot} color={tones.app} />
          <Text style={styles.label}>{t('storage.device.appAndCache')}</Text>
          <Text style={styles.value}>{formatBytes(breakdown.appBytes)}</Text>
        </View>
        {breakdown.oldVaultBytes > 0 && (
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.label}>{t('storage.device.oldVaults')}</Text>
            <Text style={styles.value}>{formatBytes(breakdown.oldVaultBytes)}</Text>
          </View>
        )}
      </View>

      <View style={[commonThemedStyles.card, styles.actionsCard]}>
        <Pressable
          onPress={onClearCache}
          disabled={isClearingCache}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
        >
          <Text style={styles.actionText}>
            {isClearingCache ? t('storage.clearingCache') : t('storage.device.clearCacheBtn')}
          </Text>
          <Text style={styles.value}>{formatBytes(breakdown.cacheBytes)}</Text>
        </Pressable>
        {breakdown.oldVaultBytes > 0 && (
          <Pressable
            onPress={confirmDeleteOldVaults}
            disabled={isDeletingOldVaults}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, styles.rowBorder, pressed && commonStyles.pressed]}
          >
            <Text style={styles.destructiveText}>
              {isDeletingOldVaults
                ? t('storage.device.deletingOldVaults')
                : t('storage.device.deleteOldCopies')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[commonThemedStyles.card, styles.actionsCard]}>
        <Pressable
          onPress={onRemoveAllData}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, styles.centeredRow, pressed && commonStyles.pressed]}
        >
          <Text style={styles.removeText}>{t('storage.removal.allBtn')}</Text>
        </Pressable>
      </View>
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const actionTextBase = {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.semiBold,
  }
  const styles = StyleSheet.create({
    totalCard: {
      padding: Space.base,
      gap: Space.xs,
    },
    caption: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    total: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
    },
    bar: {
      flexDirection: 'row',
      height: UI_SIZE_10,
      marginTop: Space.sm,
      borderRadius: Radii.pill,
      overflow: 'hidden',
    },
    sectionHeader: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginTop: Space.lg,
      marginBottom: Space.sm,
      marginLeft: Space.base,
    },
    row: {
      ...commonStyles.row,
      marginHorizontal: Space.base,
      paddingVertical: Space.md,
      gap: Space.md,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    dot: {
      width: UI_SIZE_10,
      height: UI_SIZE_10,
      borderRadius: Radii.pill,
    },
    label: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    value: {
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    actionsCard: {
      marginTop: Space.lg,
    },
    actionText: {
      ...actionTextBase,
      ...commonStyles.flex1,
      color: theme.colors.primary,
    },
    centeredRow: {
      justifyContent: 'center',
    },
    removeText: {
      ...actionTextBase,
      color: theme.colors.error,
    },
    destructiveText: {
      ...actionTextBase,
      ...commonStyles.flex1,
      color: theme.colors.error,
    },
  })
  return styles
})
