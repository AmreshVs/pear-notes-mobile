import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View as RNView,
} from 'react-native'
import { router } from 'expo-router'

import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_FEATURE_STATUS,
  QVAC_MODEL_LIBRARY_URL,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { Divider } from '@/components/Divider'
import { OnDeviceAiConfirmSheet } from '@/components/OnDeviceAiConfirmSheet'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_20,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useShowAiTools, useShowAiToolsInLocked } from '@/hooks/useShowAiTools'
import { setShowAiTools, setShowAiToolsInLocked } from '@/lib/localAi/aiToolsPreference'

import useOnDeviceAiScreen, { type OnDeviceAiFeatureRow } from './useOnDeviceAiScreen'

export default function OnDeviceAiScreen() {
  const { t } = useTranslation()
  const showAiTools = useShowAiTools()
  const showAiToolsInLocked = useShowAiToolsInLocked()
  const footerLibrary = t('settings.onDeviceAi.footerLibrary')
  const [footerBefore, footerAfter] = t('settings.onDeviceAi.footer').split(footerLibrary)
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const {
    loaded,
    device,
    isUnsupported,
    wifiOnly,
    bytesOnDisk,
    groups,
    confirm,
    notice,
    getStatusLabel,
    toggleFeature,
    confirmTurnOn,
    confirmTurnOff,
    dismissConfirm,
    pauseDownload,
    resumeDownload,
    downloadNow,
    cancelDownload,
    toggleWifiOnly,
    dismissNotice,
  } = useOnDeviceAiScreen()

  const trackColor = useMemo(
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )

  const verdictText =
    device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED
      ? t(`settings.onDeviceAi.unsupportedReason.${device.reason ?? 'store-build'}`, {
          requirement: t('settings.onDeviceAi.requirementIos'),
        })
      : t(`settings.onDeviceAi.verdict.${device.status}`)

  const glyphStyle =
    device.status === LOCAL_AI_DEVICE_STATUS.SUPPORTED
      ? styles.glyphOk
      : device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED
        ? styles.glyphBad
        : styles.glyphWarn

  const renderFeatureStatus = (row: OnDeviceAiFeatureRow) => {
    if (isUnsupported) return null
    const showProgress =
      row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING ||
      row.status === LOCAL_AI_FEATURE_STATUS.PAUSED
    return (
      <RNView style={styles.featureStatus}>
        <RNView style={styles.statusRow}>
          <Text
            style={[
              styles.statusCaption,
              row.status === LOCAL_AI_FEATURE_STATUS.FAILED && styles.statusCaptionError,
            ]}
          >
            {getStatusLabel(row)}
          </Text>
          <RNView style={styles.statusActions}>
            {row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING && (
              <Pressable
                onPress={() => pauseDownload(row)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.pauseDownload')}
                style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="pause.fill"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                  weight="medium"
                />
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.PAUSED && (
              <Pressable
                onPress={() => resumeDownload(row)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.resumeDownload')}
                style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="play.fill"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                  weight="medium"
                />
              </Pressable>
            )}
            {showProgress && (
              <Pressable
                onPress={() => cancelDownload(row)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.cancelDownload')}
                style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="xmark"
                  size={UI_ICON_SIZE_16}
                  color={colors.textMuted}
                  weight="medium"
                />
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK && (
              <Pressable
                onPress={() => downloadNow(row)}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => pressed && commonStyles.pressed}
              >
                <Text style={styles.linkText}>{t('settings.onDeviceAi.downloadNow')}</Text>
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.FAILED && (
              <Pressable
                onPress={() => resumeDownload(row)}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => pressed && commonStyles.pressed}
              >
                <Text style={styles.linkText}>{t('settings.onDeviceAi.tryAgain')}</Text>
              </Pressable>
            )}
          </RNView>
        </RNView>
        {showProgress && (
          <RNView style={styles.progressTrack}>
            <RNView
              style={[
                styles.progressFill,
                row.status === LOCAL_AI_FEATURE_STATUS.PAUSED && styles.progressFillPaused,
                { width: `${row.percent}%` },
              ]}
            />
          </RNView>
        )}
      </RNView>
    )
  }

  return (
    <RNView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <RNView style={styles.hero}>
          <RNView style={styles.heroIcon}>
            <SymbolIcon name="sparkles" size={UI_ICON_SIZE_48} color={colors.primary} />
          </RNView>
          <Text style={styles.heroDesc}>{t('settings.onDeviceAi.screenDesc')}</Text>
        </RNView>

        {!loaded ? (
          <RNView style={[commonThemedStyles.card, styles.loadingCard]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.rowDesc}>{t('settings.onDeviceAi.loading')}</Text>
          </RNView>
        ) : (
          <>
            <Text style={commonThemedStyles.sectionCamelCase}>
              {t('settings.onDeviceAi.thisDevice')}
            </Text>
            <RNView style={commonThemedStyles.card}>
              <RNView style={styles.row}>
                <Text style={styles.rowKey}>{t('settings.onDeviceAi.status')}</Text>
                <Text style={styles.rowValue}>
                  {t(`settings.onDeviceAi.deviceStatus.${device.status}`)}
                </Text>
              </RNView>
              <RNView style={styles.row}>
                <Text style={styles.rowKey}>{t('settings.onDeviceAi.memory')}</Text>
                <Text style={styles.rowValue}>{formatBytes(device.totalMemoryBytes)}</Text>
              </RNView>
              <RNView style={styles.row}>
                <Text style={styles.rowKey}>{t('settings.onDeviceAi.freeSpace')}</Text>
                <Text style={styles.rowValue}>{formatBytes(device.freeDiskBytes)}</Text>
              </RNView>
              <Pressable
                onPress={() => router.push('/settings/on-device-ai/models' as never)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rowLast, pressed && commonStyles.pressed]}
              >
                <Text style={styles.rowKey}>{t('settings.onDeviceAi.modelsOnDevice')}</Text>
                <RNView style={commonStyles.settingsRowRight}>
                  <Text style={styles.rowValue}>{formatBytes(bytesOnDisk)}</Text>
                  <SymbolIcon
                    name="chevron.forward"
                    size={UI_ICON_SIZE_16}
                    color={colors.textMuted}
                  />
                </RNView>
              </Pressable>
              <RNView style={styles.verdictDivided}>
                <RNView style={[styles.glyph, glyphStyle]}>
                  <SymbolIcon
                    name={
                      device.status === LOCAL_AI_DEVICE_STATUS.SUPPORTED
                        ? 'checkmark'
                        : 'exclamationmark'
                    }
                    size={UI_ICON_SIZE_14}
                    color={
                      device.status === LOCAL_AI_DEVICE_STATUS.SUPPORTED
                        ? colors.surface
                        : colors.onPrimary
                    }
                  />
                </RNView>
                <Text style={styles.verdictText}>{verdictText}</Text>
              </RNView>
            </RNView>

            <RNView style={styles.section}>
              <Text style={commonThemedStyles.sectionCamelCase}>
                {t('settings.onDeviceAi.noteEditor')}
              </Text>
              <RNView style={commonThemedStyles.card}>
                <RNView style={styles.toggleRow}>
                  <RNView style={styles.toggleInfo}>
                    <Text style={styles.rowTitle}>{t('settings.onDeviceAi.showAiTools')}</Text>
                    <Text style={styles.rowDesc}>{t('settings.onDeviceAi.showAiToolsDesc')}</Text>
                  </RNView>
                  <Switch
                    value={showAiTools}
                    onValueChange={setShowAiTools}
                    trackColor={trackColor}
                    thumbColor={colors.white}
                  />
                </RNView>
                <RNView style={styles.dividerWrap}>
                  <Divider />
                </RNView>
                <RNView style={styles.toggleRow}>
                  <RNView style={styles.toggleInfo}>
                    <Text style={styles.rowTitle}>
                      {t('settings.onDeviceAi.showAiToolsInLocked')}
                    </Text>
                    <Text style={styles.rowDesc}>
                      {t('settings.onDeviceAi.showAiToolsInLockedDesc')}
                    </Text>
                  </RNView>
                  <Switch
                    value={showAiToolsInLocked}
                    onValueChange={setShowAiToolsInLocked}
                    disabled={!showAiTools}
                    trackColor={trackColor}
                    thumbColor={colors.white}
                  />
                </RNView>
              </RNView>
            </RNView>

            <RNView style={styles.section}>
              <Text style={commonThemedStyles.sectionCamelCase}>
                {t('settings.onDeviceAi.downloads')}
              </Text>
              <RNView style={commonThemedStyles.card}>
                <RNView style={styles.toggleRow}>
                  <RNView style={styles.toggleInfo}>
                    <Text style={styles.rowTitle}>{t('settings.onDeviceAi.wifiOnly')}</Text>
                    <Text style={styles.rowDesc}>{t('settings.onDeviceAi.wifiOnlyDesc')}</Text>
                  </RNView>
                  <Switch
                    value={wifiOnly}
                    onValueChange={toggleWifiOnly}
                    disabled={isUnsupported}
                    trackColor={trackColor}
                    thumbColor={colors.white}
                  />
                </RNView>
              </RNView>
            </RNView>

            {groups.map((group) => (
              <RNView key={group.id} style={styles.section}>
                <Text style={commonThemedStyles.sectionCamelCase}>
                  {t(`settings.onDeviceAi.groups.${group.id}`)}
                </Text>
                <RNView style={commonThemedStyles.card}>
                  {group.features.map((row, index) => (
                    <Fragment key={row.feature}>
                      {index > 0 && (
                        <RNView style={styles.dividerWrap}>
                          <Divider />
                        </RNView>
                      )}
                      <RNView style={styles.toggleRow}>
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/settings/on-device-ai/feature?feature=${row.feature}` as never,
                            )
                          }
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.toggleInfo,
                            pressed && commonStyles.pressed,
                          ]}
                        >
                          <RNView style={styles.titleRow}>
                            <Text style={styles.rowTitle}>
                              {t(`settings.onDeviceAi.features.${row.feature}.title`)}
                            </Text>
                            <SymbolIcon
                              name="chevron.forward"
                              size={UI_ICON_SIZE_14}
                              color={colors.textMuted}
                            />
                          </RNView>
                          <Text style={styles.rowDesc}>
                            {t(`settings.onDeviceAi.features.${row.feature}.desc`)}
                          </Text>
                        </Pressable>
                        <Switch
                          value={row.enabled}
                          onValueChange={() => toggleFeature(row)}
                          disabled={
                            isUnsupported ||
                            (row.status === LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY && !row.enabled)
                          }
                          trackColor={trackColor}
                          thumbColor={colors.white}
                        />
                      </RNView>
                      {renderFeatureStatus(row)}
                    </Fragment>
                  ))}
                </RNView>
              </RNView>
            ))}

            <Text style={styles.footer}>
              {footerBefore}
              <Text
                style={styles.footerLink}
                accessibilityRole="link"
                onPress={() => Linking.openURL(QVAC_MODEL_LIBRARY_URL)}
              >
                {footerLibrary}
              </Text>
              {footerAfter}
            </Text>
          </>
        )}
      </ScrollView>
      <OnDeviceAiConfirmSheet
        confirm={confirm}
        notice={notice}
        onTurnOn={confirmTurnOn}
        onTurnOff={confirmTurnOff}
        onDismissConfirm={dismissConfirm}
        onDismissNotice={dismissNotice}
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
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: Space.md,
    },
    hero: {
      ...commonStyles.centered,
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
      marginBottom: Space.md,
    },
    heroDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.45,
      maxWidth: 320,
    },
    section: {
      marginTop: Space.lg,
    },
    loadingCard: {
      ...commonStyles.row,
      gap: Space.sm,
      padding: Space.lg,
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      paddingVertical: Space.md,
      marginHorizontal: Space.base,
      paddingHorizontal: Space.xs,
      borderBottomColor: theme.colors.border,
    },
    rowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      paddingVertical: Space.md,
      paddingHorizontal: Space.lg,
    },
    rowKey: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: theme.colors.textMuted,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
      textAlign: 'right',
    },
    verdictDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.lg,
      borderTopColor: theme.colors.border,
    },
    glyph: {
      width: 20,
      height: 20,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    glyphOk: {
      backgroundColor: theme.colors.success,
    },
    glyphWarn: {
      backgroundColor: theme.colors.primary,
    },
    glyphBad: {
      backgroundColor: theme.colors.error,
    },
    verdictText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      lineHeight: FontSize.body * 1.45,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.base,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.base,
    },
    toggleInfo: {
      flex: 1,
    },
    titleRow: {
      ...commonStyles.row,
      gap: Space.xs,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    featureStatus: {
      paddingHorizontal: Space.lg,
      paddingBottom: Space.base,
      gap: Space.sm,
    },
    statusRow: {
      ...commonStyles.rowBetween,
      alignItems: 'center',
      gap: Space.sm,
    },
    statusCaption: {
      flex: 1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    statusCaptionError: {
      color: theme.colors.error,
    },
    statusActions: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: Space.sm,
    },
    iconBtn: {
      padding: Space.xs,
    },
    linkText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
    progressFillPaused: {
      backgroundColor: theme.colors.textMuted,
    },
    footer: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginTop: Space.lg,
      marginHorizontal: Space.sm,
      lineHeight: FontSize.caption * 1.45,
    },
    footerLink: {
      color: theme.colors.primary,
      fontSize: FontSize.caption,
      lineHeight: FontSize.caption * 1.45,
    },
  })
  return styles
})
