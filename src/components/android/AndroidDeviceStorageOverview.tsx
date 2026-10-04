import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { formatBytes } from '@pear-notes/core/utils.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { DeviceStorageOverviewProps } from '@/components/storage/deviceStorageOverview.types'
import { ToneBlock } from '@/components/storage/ToneBlock'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'
import type { StorageBarSegment, StorageTone, VaultUsage } from '@/utils/storageBar'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  outlineVariant?: string
}

const APP_TONE_ALPHA = 0.3
const TONAL_ALPHA = 0.15

export function AndroidDeviceStorageOverview({
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
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const appColors = useTheme().colors
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const [confirmVisible, setConfirmVisible] = useState(false)

  const tones = useMemo<Record<StorageTone, string>>(
    () => ({
      openVault: colors.primary,
      otherVault: appColors.storageOtherVault,
      ai: appColors.success,
      app: hexWithAlpha(colors.onSurface, APP_TONE_ALPHA),
    }),
    [appColors.storageOtherVault, appColors.success, colors.onSurface, colors.primary],
  )

  const openConfirm = useCallback(() => setConfirmVisible(true), [])
  const closeConfirm = useCallback(() => setConfirmVisible(false), [])
  const confirmActions = useMemo<SheetAction[]>(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('storage.device.deleteOldVaults'),
        destructive: true,
        onPress: () => {
          setConfirmVisible(false)
          onDeleteOldVaults()
        },
      },
    ],
    [onDeleteOldVaults, t],
  )

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
    (vault: VaultUsage, index: number) => (
      <Pressable
        key={vault.id}
        onPress={vault.current ? onOpenVaultStorage : undefined}
        disabled={!vault.current}
        android_ripple={vault.current ? ripple : undefined}
        accessibilityRole={vault.current ? 'button' : undefined}
        style={[styles.row, index > 0 && styles.rowBorder]}
      >
        <ToneBlock
          baseStyle={styles.dot}
          color={vault.current ? tones.openVault : tones.otherVault}
        />
        <View style={styles.labelWrap}>
          <Text style={styles.label} numberOfLines={1}>
            {vault.current
              ? `${getVaultLabel(vault, t)} · ${t('storage.device.openTag')}`
              : getVaultLabel(vault, t)}
          </Text>
        </View>
        <Text style={styles.value}>{formatBytes(vault.bytes)}</Text>
        {vault.current && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={UI_ICON_SIZE_20}
            color={colors.onSurfaceVariant}
          />
        )}
      </Pressable>
    ),
    [colors.onSurfaceVariant, onOpenVaultStorage, ripple, styles, t, tones],
  )

  const hasOldVaults = breakdown.oldVaultBytes > 0

  return (
    <>
      <View style={styles.totalCard}>
        <Text style={styles.caption}>{t('storage.device.onThisPhone')}</Text>
        <Text style={styles.total}>
          {measured ? formatBytes(total) : t('storage.device.measuring')}
        </Text>
        {measured && <View style={styles.bar}>{breakdown.segments.map(renderSegment)}</View>}
      </View>

      {vaultUsage.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('vaults.title')}</Text>
          <View style={styles.card}>{vaultUsage.map(renderVault)}</View>
        </>
      )}

      <Text style={styles.sectionLabel}>{t('storage.device.thisPhone')}</Text>
      <View style={styles.card}>
        {breakdown.showAi && (
          <Pressable
            onPress={onOpenAiModels}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.row}
          >
            <ToneBlock baseStyle={styles.dot} color={tones.ai} />
            <View style={styles.labelWrap}>
              <Text style={styles.label}>{t('settings.onDeviceAi.storageRow')}</Text>
            </View>
            <Text style={styles.value}>{formatBytes(breakdown.aiBytes)}</Text>
          </Pressable>
        )}
        <View style={[styles.row, breakdown.showAi && styles.rowBorder]}>
          <ToneBlock baseStyle={styles.dot} color={tones.app} />
          <View style={styles.labelWrap}>
            <Text style={styles.label}>{t('storage.device.appAndCache')}</Text>
          </View>
          <Text style={styles.value}>{formatBytes(breakdown.appBytes)}</Text>
        </View>
        {hasOldVaults && (
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.labelWrap}>
              <Text style={styles.label}>{t('storage.device.oldVaults')}</Text>
              <Text style={styles.desc}>{t('storage.device.oldVaultsHint')}</Text>
            </View>
            <Text style={styles.value}>{formatBytes(breakdown.oldVaultBytes)}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onClearCache}
          disabled={isClearingCache}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.tonalButton}
        >
          <Text style={styles.tonalText}>
            {isClearingCache
              ? t('storage.clearingCache')
              : `${t('storage.device.clearCacheBtn')} · ${formatBytes(breakdown.cacheBytes)}`}
          </Text>
        </Pressable>
        {hasOldVaults && (
          <Pressable
            onPress={openConfirm}
            disabled={isDeletingOldVaults}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.outlinedButton}
          >
            <Text style={styles.destructiveText}>
              {isDeletingOldVaults
                ? t('storage.device.deletingOldVaults')
                : t('storage.device.deleteOldCopiesShort')}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onRemoveAllData}
        android_ripple={ripple}
        accessibilityRole="button"
        style={styles.removeButton}
      >
        <Text style={styles.destructiveText}>{t('storage.removal.allBtn')}</Text>
      </Pressable>

      <BottomActionSheet
        visible={confirmVisible}
        onDismiss={closeConfirm}
        title={t('storage.device.deleteOldVaultsTitle')}
        subtitle={t('storage.device.deleteOldVaultsMessage')}
        showHeader
        actions={confirmActions}
      />
    </>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3) => {
  const c = md3.colors as ExtendedColors
  const cardBase = {
    backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    borderRadius: UI_SIZE_28,
    overflow: 'hidden' as const,
  }
  const buttonBase = {
    ...commonStyles.flex1,
    ...commonStyles.centered,
    minHeight: UI_SIZE_48,
    borderRadius: UI_SIZE_9999,
    overflow: 'hidden' as const,
  }
  const buttonTextBase = {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.semiBold,
  }
  const styles = StyleSheet.create({
    totalCard: {
      ...cardBase,
      padding: Space.lg,
      gap: UI_SIZE_8,
    },
    caption: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    total: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    bar: {
      flexDirection: 'row',
      height: UI_SIZE_10,
      marginTop: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
      marginTop: UI_SIZE_24,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_12,
    },
    card: cardBase,
    row: {
      ...commonStyles.row,
      overflow: 'hidden',
      padding: Space.base,
      gap: Space.md,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border, 0.5),
    },
    dot: {
      width: UI_SIZE_10,
      height: UI_SIZE_10,
      borderRadius: UI_SIZE_9999,
    },
    labelWrap: {
      flex: 1,
      gap: UI_SIZE_4,
    },
    label: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    desc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    value: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    buttonRow: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_24,
    },
    tonalButton: {
      ...buttonBase,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, TONAL_ALPHA),
    },
    outlinedButton: {
      ...buttonBase,
      borderWidth: 1,
      borderColor: c.outlineVariant ?? c.outline,
    },
    removeButton: {
      ...buttonBase,
      flex: undefined,
      marginTop: UI_SIZE_12,
      borderWidth: 1,
      borderColor: hexWithAlpha(c.error, 0.5),
    },
    tonalText: {
      ...buttonTextBase,
      color: c.primary,
    },
    destructiveText: {
      ...buttonTextBase,
      color: c.error,
    },
  })
  return styles
}, useMD3Theme)
