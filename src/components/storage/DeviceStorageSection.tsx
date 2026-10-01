import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, StyleSheet, View as RNView } from 'react-native'

import {
  DEVICE_STORAGE_ACTION,
  DEVICE_STORAGE_ROWS,
  getVisibleDeviceStorageRows,
} from '@pear-notes/core/store/services/deviceStorage.js'
import { formatBytes } from '@pear-notes/core/utils.js'

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
  UI_SIZE_120,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import type { DeviceStorageSectionProps } from './deviceStorageSection.types'

export function DeviceStorageSection({
  summary,
  showAiModels,
  isClearingCache,
  isDeletingOldVaults,
  onClearCache,
  onDeleteOldVaults,
  onOpenAiModels,
}: DeviceStorageSectionProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

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

  const buttons = useMemo(
    () => ({
      clearCache: {
        onPress: onClearCache,
        busy: isClearingCache,
        label: isClearingCache ? t('storage.clearingCache') : t('storage.clearCache'),
      },
      deleteOldVaults: {
        onPress: confirmDeleteOldVaults,
        busy: isDeletingOldVaults,
        label: isDeletingOldVaults
          ? t('storage.device.deletingOldVaults')
          : t('storage.device.deleteOldVaults'),
      },
    }),
    [confirmDeleteOldVaults, isClearingCache, isDeletingOldVaults, onClearCache, t],
  )

  const renderRow = useCallback(
    (category: string) => {
      const row = DEVICE_STORAGE_ROWS[category]
      const value = formatBytes(summary?.byCategory[category] ?? 0)
      const label = (
        <RNView style={styles.labelWrap}>
          <Text style={styles.label}>{t(row.label)}</Text>
          <Text style={styles.desc}>{t(row.desc)}</Text>
        </RNView>
      )

      if (row.action === DEVICE_STORAGE_ACTION.OPEN_AI_MODELS) {
        return (
          <Pressable
            key={category}
            onPress={onOpenAiModels}
            style={({ pressed }) => [styles.row, styles.rowBorder, pressed && commonStyles.pressed]}
          >
            {label}
            <RNView style={commonStyles.settingsRowRight}>
              <Text style={styles.value}>{value}</Text>
              <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_16} color={colors.textMuted} />
            </RNView>
          </Pressable>
        )
      }

      const button = row.action ? buttons[row.action as keyof typeof buttons] : null
      return (
        <RNView key={category} style={[styles.row, styles.rowBorder]}>
          {label}
          <RNView style={styles.trailing}>
            <Text style={styles.value}>{value}</Text>
            {button && (
              <Pressable
                onPress={button.onPress}
                disabled={button.busy}
                style={({ pressed }) => [
                  styles.button,
                  button.busy && styles.buttonDisabled,
                  pressed && commonStyles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>{button.label}</Text>
              </Pressable>
            )}
          </RNView>
        </RNView>
      )
    },
    [buttons, colors.textMuted, onOpenAiModels, styles, summary, t],
  )

  const rows = useMemo(
    () => getVisibleDeviceStorageRows(summary, showAiModels).map(renderRow),
    [renderRow, showAiModels, summary],
  )

  return (
    <RNView style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>{t('storage.device.title')}</Text>
      <RNView style={commonThemedStyles.card}>
        <RNView style={styles.row}>
          <RNView style={styles.labelWrap}>
            <Text style={styles.totalLabel}>{t('storage.device.total')}</Text>
            <Text style={styles.desc}>{t('storage.device.totalDesc')}</Text>
          </RNView>
          <Text style={styles.totalValue}>
            {summary ? formatBytes(summary.total) : t('storage.device.measuring')}
          </Text>
        </RNView>
        {rows}
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.lg,
    },
    row: {
      ...commonStyles.rowBetween,
      marginHorizontal: Space.base,
      paddingVertical: Space.md,
      gap: Space.md,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    labelWrap: {
      flex: 1,
      gap: Space.xs,
    },
    label: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    totalLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    desc: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: Space.sm,
    },
    value: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
    },
    button: {
      minWidth: UI_SIZE_120,
      alignItems: 'center',
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: `${theme.colors.primary}1A`,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  })
  return styles
})
