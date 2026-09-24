import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  StatusBar,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { confirmCopyFullReport } from '@/lib/debugSnapshot'
import {
  buildDebugRows,
  buildTimelineRows,
  buildWriterRows,
  type DebugRow,
  describeDevice,
  getCopyFullReportLabels,
  shortenHex,
  showsSensitiveDebugInfo,
} from '@/utils/debugRows'

import { useDebugScreen } from './useDebugScreen'

type DebugStyles = ReturnType<typeof useStyles>

type RevealableValueProps = {
  styles: DebugStyles
  revealKey: string
  shortValue: string
  fullValue?: string
  revealed: boolean
  onToggle: (key: string) => void
  textStyle: StyleProp<TextStyle>
  revealLabel: string
  hideLabel: string
}

function RevealableValue({
  styles,
  revealKey,
  shortValue,
  fullValue,
  revealed,
  onToggle,
  textStyle,
  revealLabel,
  hideLabel,
}: RevealableValueProps) {
  const handlePress = useCallback(() => onToggle(revealKey), [onToggle, revealKey])

  if (!fullValue || fullValue === shortValue) return <Text style={textStyle}>{shortValue}</Text>

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={UI_SIZE_6}
      accessibilityRole="button"
      accessibilityLabel={revealed ? hideLabel : revealLabel}
      style={styles.revealTarget}
    >
      <Text style={textStyle}>{revealed ? fullValue : shortValue}</Text>
    </Pressable>
  )
}

export default function DebugScreenAndroid() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const {
    snapshot,
    error,
    copied,
    refreshing,
    revealed,
    toggleReveal,
    handleRefresh,
    handleCopy,
    copyFullReport,
    handleShare,
  } = useDebugScreen()

  const handleBack = useCallback(() => router.back(), [])
  const handleOpenErrorLog = useCallback(() => router.push('/settings/debug/error-log'), [])

  const handleCopyFull = useCallback(
    () => confirmCopyFullReport(getCopyFullReportLabels(t), copyFullReport),
    [copyFullReport, t],
  )

  const renderRow = useCallback(
    (row: DebugRow) => (
      <View key={row.key} style={styles.row}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <RevealableValue
          styles={styles}
          revealKey={row.key}
          shortValue={row.value}
          fullValue={row.fullValue}
          revealed={!!revealed[row.key]}
          onToggle={toggleReveal}
          textStyle={row.emphasis ? styles.rowValueEmphasis : styles.rowValue}
          revealLabel={t('debug.revealValue')}
          hideLabel={t('debug.hideValue')}
        />
      </View>
    ),
    [revealed, styles, t, toggleReveal],
  )

  const renderSection = useCallback(
    (title: string, data: unknown) => {
      const rows = buildDebugRows(data)
      if (rows.length === 0) return null
      return (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.card}>{rows.map(renderRow)}</View>
        </View>
      )
    },
    [renderRow, styles],
  )

  const renderTimeline = useCallback(
    (title: string, timeline: unknown) => {
      const rows = buildTimelineRows(timeline as never)
      if (rows.length === 0) return null
      return (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.card}>{rows.map(renderRow)}</View>
        </View>
      )
    },
    [renderRow, styles],
  )

  const renderDevice = useCallback(
    (device: Record<string, unknown>, index: number) => (
      <View key={String(device.localKey || index)} style={styles.deviceRow}>
        <Text style={styles.deviceTitle}>{String(device.title || t('debug.untitledDevice'))}</Text>
        <Text style={styles.deviceMeta}>
          {describeDevice(device, {
            local: t('debug.deviceLocal'),
            leader: t('debug.deviceLeader'),
            online: t('debug.deviceOnline'),
            offline: t('debug.deviceOffline'),
          })}
        </Text>
        {showsSensitiveDebugInfo() ? (
          <RevealableValue
            styles={styles}
            revealKey={`device-${String(device.localKey || index)}`}
            shortValue={shortenHex(String(device.localKey || ''))}
            fullValue={String(device.localKey || '') || undefined}
            revealed={!!revealed[`device-${String(device.localKey || index)}`]}
            onToggle={toggleReveal}
            textStyle={styles.deviceKey}
            revealLabel={t('debug.revealValue')}
            hideLabel={t('debug.hideValue')}
          />
        ) : null}
      </View>
    ),
    [revealed, styles, t, toggleReveal],
  )

  const devices = (snapshot?.devices as Record<string, unknown>[]) || []
  const writerRows = buildWriterRows(
    (snapshot?.writers as Record<string, unknown>[]) || [],
    devices,
    t,
  )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="default" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Pressable onPress={handleBack} android_ripple={ripple} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={UI_ICON_SIZE_24}
            color={colors.onSurface}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.debug')}</Text>
      </View>

      <ScrollView
        style={commonStyles.flex1}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.actions}>
          <Pressable onPress={handleCopy} android_ripple={ripple} style={styles.primaryButton}>
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={UI_ICON_SIZE_18}
              color={colors.onPrimary}
            />
            <Text style={styles.primaryButtonText}>
              {copied ? t('debug.copied') : t('debug.copy')}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} android_ripple={ripple} style={styles.secondaryButton}>
            <MaterialCommunityIcons
              name="share-variant"
              size={UI_ICON_SIZE_18}
              color={colors.primary}
            />
            <Text style={styles.secondaryButtonText}>{t('debug.share')}</Text>
          </Pressable>
          {showsSensitiveDebugInfo() ? (
            <Pressable
              onPress={handleCopyFull}
              android_ripple={ripple}
              style={styles.secondaryButton}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={UI_ICON_SIZE_18}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>{t('debug.copyFull')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            android_ripple={ripple}
            style={styles.secondaryButton}
          >
            <MaterialCommunityIcons name="refresh" size={UI_ICON_SIZE_18} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>{t('debug.refresh')}</Text>
          </Pressable>
          <Pressable
            onPress={handleOpenErrorLog}
            android_ripple={ripple}
            style={styles.secondaryButton}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={UI_ICON_SIZE_18}
              color={colors.primary}
            />
            <Text style={styles.secondaryButtonText}>{t('debug.openErrorLog')}</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!snapshot ? (
          <Text style={styles.loading}>{t('debug.loading')}</Text>
        ) : (
          <>
            {renderSection(t('debug.sections.autobase'), snapshot.autobase)}
            {renderSection(t('debug.sections.swarm'), snapshot.swarm)}
            {devices.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('debug.sections.devices')}</Text>
                <View style={styles.card}>{devices.map(renderDevice)}</View>
              </View>
            ) : null}
            {writerRows.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('debug.sections.writers')}</Text>
                <View style={styles.card}>{writerRows.map(renderRow)}</View>
              </View>
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
    </View>
  )
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const useAndroidDebugHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingTop: insets.top + Space.sm,
      paddingHorizontal: Space.sm,
      paddingBottom: Space.sm,
    },
    backButton: {
      overflow: 'hidden',
      padding: Space.sm,
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    content: {
      paddingHorizontal: Space.base,
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
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
      overflow: 'hidden',
    },
    primaryButtonText: {
      color: c.onPrimary,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      overflow: 'hidden',
    },
    secondaryButtonText: {
      color: c.primary,
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
      color: c.onSurfaceVariant,
      marginBottom: Space.sm,
      marginLeft: UI_SIZE_4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingVertical: Space.sm,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Space.md,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.sm,
    },
    rowLabel: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      flexShrink: 0,
    },
    revealTarget: {
      flexShrink: 1,
    },
    rowValue: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurface,
      flexShrink: 1,
      textAlign: 'right',
    },
    rowValueEmphasis: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.primary,
      fontWeight: FontWeight.bold,
      flexShrink: 1,
      textAlign: 'right',
    },
    deviceRow: {
      paddingHorizontal: Space.lg,
      paddingVertical: Space.sm,
      gap: UI_SIZE_2,
    },
    deviceTitle: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    deviceMeta: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    deviceKey: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    errorBox: {
      padding: Space.base,
      borderRadius: UI_SIZE_28,
      backgroundColor: hexWithAlpha(c.error || c.primary, 0.12),
      marginBottom: Space.base,
    },
    errorText: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurface,
    },
    loading: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useAndroidDebugHooks)
