import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_15,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  buildDebugRows,
  buildTimelineRows,
  type DebugRow,
  describeDevice,
  shortenHex,
} from '@/utils/debugRows'

import { useDebugScreen } from './useDebugScreen'

export default function DebugScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()
  const { snapshot, error, copied, refreshing, handleRefresh, handleCopy, handleShare } =
    useDebugScreen()

  const renderRow = useCallback(
    (row: DebugRow) => (
      <RNView key={row.key} style={styles.row}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <Text style={row.emphasis ? styles.rowValueEmphasis : styles.rowValue}>{row.value}</Text>
      </RNView>
    ),
    [styles],
  )

  const renderSection = useCallback(
    (title: string, data: unknown) => {
      const rows = buildDebugRows(data)
      if (rows.length === 0) return null
      return (
        <RNView key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <RNView style={commonThemedStyles.card}>{rows.map(renderRow)}</RNView>
        </RNView>
      )
    },
    [commonThemedStyles.card, renderRow, styles],
  )

  const renderTimeline = useCallback(
    (title: string, timeline: unknown) => {
      const rows = buildTimelineRows(timeline as never)
      if (rows.length === 0) return null
      return (
        <RNView key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <RNView style={commonThemedStyles.card}>{rows.map(renderRow)}</RNView>
        </RNView>
      )
    },
    [commonThemedStyles.card, renderRow, styles],
  )

  const renderDevice = useCallback(
    (device: Record<string, unknown>, index: number) => (
      <RNView key={String(device.localKey || index)} style={styles.deviceRow}>
        <Text style={styles.deviceTitle}>{String(device.title || t('debug.untitledDevice'))}</Text>
        <Text style={styles.deviceMeta}>
          {describeDevice(device, {
            local: t('debug.deviceLocal'),
            leader: t('debug.deviceLeader'),
            online: t('debug.deviceOnline'),
            offline: t('debug.deviceOffline'),
          })}
        </Text>
        <Text style={styles.deviceKey}>{shortenHex(String(device.localKey || ''))}</Text>
      </RNView>
    ),
    [styles, t],
  )

  const devices = (snapshot?.devices as Record<string, unknown>[]) || []

  return (
    <ScrollView
      style={commonStyles.flex1}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <RNView style={styles.actions}>
        <Pressable onPress={handleCopy} style={styles.primaryButton}>
          <SymbolIcon
            name={copied ? 'checkmark' : 'doc.on.doc'}
            size={UI_ICON_SIZE_15}
            color={colors.background}
          />
          <Text style={styles.primaryButtonText}>
            {copied ? t('debug.copied') : t('debug.copy')}
          </Text>
        </Pressable>
        <Pressable onPress={handleShare} style={styles.secondaryButton}>
          <SymbolIcon name="square.and.arrow.up" size={UI_ICON_SIZE_15} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>{t('debug.share')}</Text>
        </Pressable>
        <Pressable onPress={handleRefresh} disabled={refreshing} style={styles.secondaryButton}>
          <SymbolIcon name="arrow.clockwise" size={UI_ICON_SIZE_15} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>{t('debug.refresh')}</Text>
        </Pressable>
      </RNView>

      {error ? (
        <RNView style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </RNView>
      ) : null}

      {!snapshot ? (
        <Text style={styles.loading}>{t('debug.loading')}</Text>
      ) : (
        <>
          {renderSection(t('debug.sections.autobase'), snapshot.autobase)}
          {renderSection(t('debug.sections.swarm'), snapshot.swarm)}
          {devices.length > 0 ? (
            <RNView style={styles.section}>
              <Text style={styles.sectionTitle}>{t('debug.sections.devices')}</Text>
              <RNView style={commonThemedStyles.card}>{devices.map(renderDevice)}</RNView>
            </RNView>
          ) : null}
          {renderSection(t('debug.sections.sync'), snapshot.sync)}
          {renderSection(t('debug.sections.storage'), snapshot.storage)}
          {renderSection(t('debug.sections.app'), snapshot.app)}
          {renderSection(t('debug.sections.runtime'), snapshot.runtime)}
          {renderTimeline(t('debug.sections.backendBoot'), snapshot.backendBoot)}
          {renderTimeline(t('debug.sections.appBoot'), snapshot.appBoot)}
        </>
      )}
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    content: {
      padding: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    actions: {
      flexDirection: 'row',
      gap: Space.sm,
      marginBottom: Space.base,
      flexWrap: 'wrap',
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      color: theme.colors.background,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
    },
    section: {
      marginBottom: Space.lg,
    },
    sectionTitle: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
      marginBottom: Space.sm,
      marginLeft: UI_SIZE_4,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Space.md,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
    },
    rowLabel: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      flexShrink: 0,
    },
    rowValue: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.text,
      flexShrink: 1,
      textAlign: 'right',
    },
    rowValueEmphasis: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.primary,
      fontWeight: FontWeight.bold,
      flexShrink: 1,
      textAlign: 'right',
    },
    deviceRow: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      gap: UI_SIZE_2,
    },
    deviceTitle: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    deviceMeta: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    deviceKey: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    errorBox: {
      padding: Space.base,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      marginBottom: Space.base,
    },
    errorText: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.text,
    },
    loading: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
