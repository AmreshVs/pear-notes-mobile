import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import {
  DEVICE_STORAGE_ACTION,
  DEVICE_STORAGE_ROWS,
  getVisibleDeviceStorageRows,
} from '@pear-notes/core/store/services/deviceStorage.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { DeviceStorageSectionProps } from '@/components/storage/deviceStorageSection.types'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_120,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

export function AndroidDeviceStorageSection({
  summary,
  showAiModels,
  isClearingCache,
  isDeletingOldVaults,
  onClearCache,
  onDeleteOldVaults,
  onOpenAiModels,
}: DeviceStorageSectionProps) {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const [confirmVisible, setConfirmVisible] = useState(false)

  const openConfirm = useCallback(() => setConfirmVisible(true), [])
  const closeConfirm = useCallback(() => setConfirmVisible(false), [])

  const confirmActions = useMemo(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('storage.device.deleteOldVaults'),
        destructive: true,
        onPress: onDeleteOldVaults,
      },
    ],
    [onDeleteOldVaults, t],
  )

  const buttons = useMemo(
    () => ({
      clearCache: {
        onPress: onClearCache,
        busy: isClearingCache,
        label: isClearingCache ? t('storage.clearingCache') : t('storage.clearCache'),
      },
      deleteOldVaults: {
        onPress: openConfirm,
        busy: isDeletingOldVaults,
        label: isDeletingOldVaults
          ? t('storage.device.deletingOldVaults')
          : t('storage.device.deleteOldVaults'),
      },
    }),
    [isClearingCache, isDeletingOldVaults, onClearCache, openConfirm, t],
  )

  const renderRow = useCallback(
    (category: string) => {
      const row = DEVICE_STORAGE_ROWS[category]
      const value = formatBytes(summary?.byCategory[category] ?? 0)
      const label = (
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{t(row.label)}</Text>
          <Text style={styles.desc}>{t(row.desc)}</Text>
        </View>
      )

      if (row.action === DEVICE_STORAGE_ACTION.OPEN_AI_MODELS) {
        return (
          <Pressable
            key={category}
            onPress={onOpenAiModels}
            android_ripple={ripple}
            style={[styles.row, styles.rowBorder]}
          >
            {label}
            <View style={styles.chevronValue}>
              <Text style={styles.value}>{value}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
            </View>
          </Pressable>
        )
      }

      const button = row.action ? buttons[row.action as keyof typeof buttons] : null
      return (
        <View key={category} style={[styles.row, styles.rowBorder]}>
          {label}
          <View style={styles.trailing}>
            <Text style={styles.value}>{value}</Text>
            {button && (
              <Pressable
                onPress={button.onPress}
                disabled={button.busy}
                android_ripple={ripple}
                style={[styles.button, button.busy && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>{button.label}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )
    },
    [buttons, c.onSurfaceVariant, onOpenAiModels, ripple, styles, summary, t],
  )

  const rows = useMemo(
    () => getVisibleDeviceStorageRows(summary, showAiModels).map(renderRow),
    [renderRow, showAiModels, summary],
  )

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('storage.device.title')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.labelWrap}>
            <Text style={styles.totalLabel}>{t('storage.device.total')}</Text>
            <Text style={styles.desc}>{t('storage.device.totalDesc')}</Text>
          </View>
          <Text style={styles.totalValue}>
            {summary ? formatBytes(summary.total) : t('storage.device.measuring')}
          </Text>
        </View>
        {rows}
      </View>
      <BottomActionSheet
        visible={confirmVisible}
        onDismiss={closeConfirm}
        title={t('storage.device.deleteOldVaultsTitle')}
        subtitle={t('storage.device.deleteOldVaultsMessage')}
        showHeader
        actions={confirmActions}
      />
    </View>
  )
}

const useAndroidHooks = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      marginTop: UI_SIZE_24,
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
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      ...commonStyles.rowBetween,
      padding: Space.base,
      gap: Space.md,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border, 0.5),
    },
    labelWrap: {
      flex: 1,
      gap: UI_SIZE_4,
    },
    label: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    totalLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    desc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    chevronValue: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    value: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    totalValue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    button: {
      overflow: 'hidden',
      minWidth: UI_SIZE_120,
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
      textAlign: 'center',
    },
  })
  return styles
}, useAndroidHooks)
