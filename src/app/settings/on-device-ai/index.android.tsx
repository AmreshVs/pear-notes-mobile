import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Switch } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_FEATURE_STATUS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_96,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import useOnDeviceAiScreen, { type OnDeviceAiFeatureRow } from './useOnDeviceAiScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  outlineVariant?: string
}

export default function AndroidOnDeviceAiScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
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

  const confirmFeature = confirm ? t(`settings.onDeviceAi.features.${confirm.feature}.inline`) : ''
  const confirmSize = confirm ? formatBytes(confirm.bytes) : ''

  const confirmActions = useMemo(() => {
    if (!confirm) return []
    if (confirm.kind === 'turnOn') {
      return [
        {
          icon: 'download-outline',
          label: confirm.waitsForNetwork
            ? t('settings.onDeviceAi.turnOn.confirmWaiting')
            : t('settings.onDeviceAi.turnOn.confirm', { size: confirmSize }),
          noRightIcon: true,
          onPress: confirmTurnOn,
        },
      ]
    }
    return [
      {
        icon: 'content-save-outline',
        label: t('settings.onDeviceAi.turnOff.keep'),
        noRightIcon: true,
        onPress: () => confirmTurnOff(false),
      },
      {
        icon: 'trash-can-outline',
        label: t('settings.onDeviceAi.turnOff.delete'),
        destructive: true,
        onPress: () => confirmTurnOff(true),
      },
    ]
  }, [confirm, confirmSize, confirmTurnOff, confirmTurnOn, t])

  const noticeActions = useMemo(
    () => [
      {
        icon: 'check',
        label: t('common.ok'),
        noRightIcon: true,
        onPress: dismissNotice,
      },
    ],
    [dismissNotice, t],
  )

  const verdictText =
    device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED
      ? t(`settings.onDeviceAi.unsupportedReason.${device.reason ?? 'store-build'}`, {
          requirement: t('settings.onDeviceAi.requirementAndroid'),
        })
      : t(`settings.onDeviceAi.verdict.${device.status}`)

  const verdictColor =
    device.status === LOCAL_AI_DEVICE_STATUS.SUPPORTED
      ? theme.colors.success
      : device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED
        ? c.error
        : c.primary

  const renderFeatureStatus = (row: OnDeviceAiFeatureRow) => {
    if (isUnsupported) return null
    const showProgress =
      row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING ||
      row.status === LOCAL_AI_FEATURE_STATUS.PAUSED
    return (
      <View style={styles.featureStatus}>
        <View style={styles.statusRow}>
          <Text
            style={[
              styles.statusCaption,
              row.status === LOCAL_AI_FEATURE_STATUS.FAILED && styles.statusCaptionError,
            ]}
          >
            {getStatusLabel(row)}
          </Text>
          <View style={styles.statusActions}>
            {row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING && (
              <Pressable
                onPress={() => pauseDownload(row)}
                android_ripple={rippleBorderless}
                hitSlop={UI_SIZE_8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.pauseDownload')}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="pause" size={UI_ICON_SIZE_20} color={c.primary} />
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.PAUSED && (
              <Pressable
                onPress={() => resumeDownload(row)}
                android_ripple={rippleBorderless}
                hitSlop={UI_SIZE_8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.resumeDownload')}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="play" size={UI_ICON_SIZE_20} color={c.primary} />
              </Pressable>
            )}
            {showProgress && (
              <Pressable
                onPress={() => cancelDownload(row)}
                android_ripple={rippleBorderless}
                hitSlop={UI_SIZE_8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.onDeviceAi.cancelDownload')}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={UI_ICON_SIZE_20}
                  color={c.onSurfaceVariant}
                />
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK && (
              <Pressable
                onPress={() => downloadNow(row)}
                android_ripple={rippleBorderless}
                accessibilityRole="button"
                style={styles.textBtn}
              >
                <Text style={styles.textBtnLabel}>{t('settings.onDeviceAi.downloadNow')}</Text>
              </Pressable>
            )}
            {row.status === LOCAL_AI_FEATURE_STATUS.FAILED && (
              <Pressable
                onPress={() => resumeDownload(row)}
                android_ripple={rippleBorderless}
                accessibilityRole="button"
                style={styles.textBtn}
              >
                <Text style={styles.textBtnLabel}>{t('settings.onDeviceAi.tryAgain')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        {showProgress && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                row.status === LOCAL_AI_FEATURE_STATUS.PAUSED && styles.progressFillPaused,
                { width: `${row.percent}%` },
              ]}
            />
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.onDeviceAi')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="creation-outline"
              size={UI_ICON_SIZE_48}
              color={c.primary}
            />
          </View>
          <Text style={styles.heroDesc}>{t('settings.onDeviceAi.screenDesc')}</Text>
        </View>

        {!loaded ? (
          <View style={[styles.groupCard, styles.loadingCard]}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.rowSubtitle}>{t('settings.onDeviceAi.loading')}</Text>
          </View>
        ) : (
          <>
            <Text style={md3Styles.settingsSectionCamelCase}>
              {t('settings.onDeviceAi.thisDevice')}
            </Text>
            <View style={styles.groupCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('settings.onDeviceAi.status')}</Text>
                <Text style={styles.infoValue}>
                  {t(`settings.onDeviceAi.deviceStatus.${device.status}`)}
                </Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>{t('settings.onDeviceAi.memory')}</Text>
                <Text style={styles.infoValue}>{formatBytes(device.totalMemoryBytes)}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>{t('settings.onDeviceAi.freeSpace')}</Text>
                <Text style={styles.infoValue}>{formatBytes(device.freeDiskBytes)}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/settings/on-device-ai/models' as never)}
                android_ripple={rippleBorderless}
                accessibilityRole="button"
                style={[styles.infoRow, styles.infoRowBorder]}
              >
                <Text style={styles.infoLabel}>{t('settings.onDeviceAi.modelsOnDevice')}</Text>
                <View style={styles.titleRow}>
                  <Text style={styles.infoValue}>{formatBytes(bytesOnDisk)}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={UI_ICON_SIZE_20}
                    color={c.onSurfaceVariant}
                  />
                </View>
              </Pressable>
              <View style={[styles.verdictRow, styles.infoRowBorder]}>
                <MaterialCommunityIcons
                  name={
                    device.status === LOCAL_AI_DEVICE_STATUS.SUPPORTED
                      ? 'check-circle'
                      : 'alert-circle'
                  }
                  size={UI_ICON_SIZE_20}
                  color={verdictColor}
                />
                <Text style={styles.verdictText}>{verdictText}</Text>
              </View>
            </View>

            <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
              {t('settings.onDeviceAi.downloads')}
            </Text>
            <View style={styles.groupCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.rowTitle}>{t('settings.onDeviceAi.wifiOnly')}</Text>
                  <Text style={styles.rowSubtitle}>{t('settings.onDeviceAi.wifiOnlyDesc')}</Text>
                </View>
                <Switch value={wifiOnly} onValueChange={toggleWifiOnly} disabled={isUnsupported} />
              </View>
            </View>

            {groups.map((group) => (
              <Fragment key={group.id}>
                <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
                  {t(`settings.onDeviceAi.groups.${group.id}`)}
                </Text>
                <View style={styles.groupCard}>
                  {group.features.map((row, index) => (
                    <Fragment key={row.feature}>
                      {index > 0 && <View style={styles.groupDivider} />}
                      <View style={styles.toggleRow}>
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/settings/on-device-ai/feature?feature=${row.feature}` as never,
                            )
                          }
                          android_ripple={rippleBorderless}
                          accessibilityRole="button"
                          style={styles.toggleInfo}
                        >
                          <View style={styles.titleRow}>
                            <Text style={styles.rowTitle}>
                              {t(`settings.onDeviceAi.features.${row.feature}.title`)}
                            </Text>
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={UI_ICON_SIZE_20}
                              color={c.onSurfaceVariant}
                            />
                          </View>
                          <Text style={styles.rowSubtitle}>
                            {t(`settings.onDeviceAi.features.${row.feature}.desc`)}
                          </Text>
                        </Pressable>
                        <Switch
                          value={row.enabled}
                          onValueChange={() => toggleFeature(row)}
                          disabled={isUnsupported}
                        />
                      </View>
                      {renderFeatureStatus(row)}
                    </Fragment>
                  ))}
                </View>
              </Fragment>
            ))}

            <Text style={styles.footerText}>{t('settings.onDeviceAi.footer')}</Text>
          </>
        )}
      </ScrollView>

      <BottomActionSheet
        visible={!!confirm}
        onDismiss={dismissConfirm}
        title={
          confirm?.kind === 'turnOff'
            ? t('settings.onDeviceAi.turnOff.title', { feature: confirmFeature })
            : t('settings.onDeviceAi.turnOn.title', { feature: confirmFeature })
        }
        subtitle={
          confirm?.kind === 'turnOff'
            ? t('settings.onDeviceAi.turnOff.message', { size: confirmSize })
            : confirm?.waitsForNetwork
              ? t('settings.onDeviceAi.turnOn.messageWaiting', { size: confirmSize })
              : t('settings.onDeviceAi.turnOn.message', { size: confirmSize })
        }
        showHeader
        actions={confirmActions}
      />

      <BottomActionSheet
        visible={!!notice}
        onDismiss={dismissNotice}
        title={t('settings.onDeviceAi.notEnoughSpace.title')}
        subtitle={
          notice?.feature
            ? t('settings.onDeviceAi.notEnoughSpace.message', {
                feature: t(`settings.onDeviceAi.features.${notice.feature}.title`),
                size: formatBytes(notice.requiredBytes ?? 0),
                short: formatBytes(notice.shortBytes ?? 0),
              })
            : t('settings.onDeviceAi.notEnoughSpace.messageGeneric')
        }
        showHeader
        actions={noticeActions}
      />
    </View>
  )
}

const useOnDeviceAiHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: UI_SIZE_16,
    },
    headerIconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'left',
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    heroContainer: {
      alignItems: 'center',
      marginBottom: UI_SIZE_28,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_16,
    },
    heroDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
      paddingHorizontal: UI_SIZE_8,
    },
    groupCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      marginBottom: UI_SIZE_12,
      overflow: 'hidden',
    },
    loadingCard: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      padding: UI_SIZE_20,
    },
    infoRow: {
      ...commonStyles.rowBetween,
      gap: UI_SIZE_16,
      padding: Space.base,
    },
    infoRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border ?? '#38383a', 0.5),
    },
    infoLabel: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    infoValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      textAlign: 'right',
    },
    verdictRow: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
      padding: Space.base,
    },
    verdictText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_22,
    },
    toggleRow: {
      ...commonStyles.rowBetween,
      padding: Space.base,
      gap: Space.base,
    },
    toggleInfo: {
      ...commonStyles.flex1,
      gap: Space.xs,
    },
    titleRow: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      marginHorizontal: Space.base,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowSubtitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: 20,
    },
    featureStatus: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.base,
      marginTop: -UI_SIZE_8,
      gap: UI_SIZE_4,
    },
    statusRow: {
      ...commonStyles.rowBetween,
      gap: UI_SIZE_8,
    },
    statusCaption: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    statusCaptionError: {
      color: c.error,
    },
    statusActions: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    iconBtn: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    textBtn: {
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    textBtnLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    progressFillPaused: {
      backgroundColor: c.onSurfaceVariant,
    },
    footerText: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      marginTop: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_8,
    },
  })
  return styles
}, useOnDeviceAiHooks)
