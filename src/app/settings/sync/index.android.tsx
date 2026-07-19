import { isValidInvite } from '@pear-notes/core/utils.js'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useSyncScreen from './useSyncScreen'

import { AndroidDeviceCard } from '@/components/android/AndroidDeviceCard'
import { AndroidScannerModal } from '@/components/android/AndroidScannerModal'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_30,
  UI_ICON_SIZE_48,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_120,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_18,
  UI_SIZE_180,
  UI_SIZE_2,
  UI_SIZE_20,
  UI_SIZE_200,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_4,
  UI_SIZE_40,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

export default function AndroidSyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()

  const {
    tab,
    setTab,
    copied,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    deleteSheetVisible,
    setDeleteSheetVisible,
    scrollRef,
    inviteCode,
    expiresAt,
    isLoading,
    syncedDevices,
    isSynced,
    handleCopy,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleGenerateInvite,
    handleScrollToEnd,
    formatExpiry,
    handleDeleteDevice,
    handleConfirmDelete,
  } = useSyncScreen()

  const deviceColors = useMemo(
    () => ({
      surfaceContainerHigh: c.surfaceContainerHigh,
      surfaceContainerHighest: c.surfaceContainerHighest,
      surfaceVariant: c.surfaceVariant,
      primary: c.primary,
      onSurface: c.onSurface,
      onSurfaceVariant: c.onSurfaceVariant,
      error: c.error,
    }),
    [c],
  )

  const deleteActions = useMemo(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('sync.delete.remove'),
        destructive: true,
        onPress: handleConfirmDelete,
      },
    ],
    [handleConfirmDelete, t],
  )

  const renderLocalDeviceCard = useCallback(
    (device: any, index: number) => (
      <AndroidDeviceCard
        key={device.key}
        device={device}
        isLocal
        colors={deviceColors}
        index={index}
        onDelete={handleDeleteDevice}
      />
    ),
    [deviceColors, handleDeleteDevice],
  )

  const renderOtherDeviceCard = useCallback(
    (device: any, index: number) => (
      <AndroidDeviceCard
        key={device.key}
        device={device}
        colors={deviceColors}
        index={index}
        onDelete={handleDeleteDevice}
      />
    ),
    [deviceColors, handleDeleteDevice],
  )

  const otherDevices = syncedDevices.filter((d: any) => !d.isLocal)
  const localDevices = syncedDevices.filter((d: any) => d.isLocal)

  const loaderColor = theme.isDark ? theme.colors.text : theme.colors.background

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.appBar}>
        <Pressable onPress={() => router.back()} hitSlop={UI_SIZE_8} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>{t('sync.title')}</Text>
      </View>

      <KeyboardAvoidingView behavior="height" style={styles.flex1}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(Durations.fade)} style={styles.segRow}>
            <View style={styles.segTrack}>
              {(['link', 'devices'] as const).map((tValue) => {
                const active = tab === tValue
                return (
                  <Pressable
                    key={tValue}
                    onPress={() => setTab(tValue)}
                    style={[styles.segPill, active && styles.segPillActive]}
                  >
                    <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                      {tValue === 'link' ? t('sync.tabs.link') : t('sync.tabs.devices')}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>

          {tab === 'link' ? (
            <Animated.View
              key="link-tab"
              entering={FadeIn.duration(Durations.fade)}
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.tabContent}
            >
              {!inviteCode ? (
                <Animated.View
                  entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
                >
                  <View style={styles.heroSection}>
                    <View style={styles.heroCircle}>
                      <MaterialCommunityIcons
                        name="devices"
                        size={UI_ICON_SIZE_48}
                        color={c.primary}
                      />
                    </View>
                    <View style={styles.heroBadge}>
                      <MaterialCommunityIcons
                        name="sync"
                        size={UI_ICON_SIZE_18}
                        color={c.onPrimary || theme.colors.text}
                      />
                    </View>
                  </View>

                  <Text style={styles.heroTitle}>{t('sync.hero.title')}</Text>
                  <Text style={styles.heroDesc}>{t('sync.hero.description')}</Text>

                  <Pressable
                    onPress={handleGenerateInvite}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.generateBtn,
                      pressed && commonStyles.pressed,
                      isLoading && styles.btnDisabled,
                    ]}
                  >
                    {isLoading && (
                      <ActivityIndicator size="small" color={loaderColor} style={styles.mr8} />
                    )}
                    <Text style={styles.generateBtnText}>
                      {isLoading ? t('sync.hero.preparing') : t('sync.hero.generateBtn')}
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <Animated.View
                  entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
                >
                  <View style={styles.heroSection}>
                    <View style={styles.heroCircle}>
                      <MaterialCommunityIcons
                        name="shield-check-outline"
                        size={UI_ICON_SIZE_48}
                        color={c.primary}
                      />
                    </View>
                  </View>

                  <Text style={styles.heroTitle}>{t('sync.invite.header')}</Text>
                  <Text style={styles.heroDesc}>{formatExpiry(expiresAt)}</Text>

                  <View style={styles.qrWrap}>
                    <View style={styles.qrBox}>
                      <QRCode
                        value={inviteCode}
                        size={UI_SIZE_180}
                        backgroundColor={theme.colors.white}
                        color={theme.colors.qrDark}
                      />
                    </View>
                    <Text style={styles.qrTitle}>{t('sync.invite.qrTitle')}</Text>
                    <Text style={styles.qrDescription}>{t('sync.invite.qrDescription')}</Text>
                  </View>

                  <Text style={styles.codeLabelText}>{t('sync.invite.codeLabel')}</Text>
                  <View style={styles.codeBox}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text selectable style={styles.codeText}>
                        {inviteCode}
                      </Text>
                    </ScrollView>
                  </View>

                  <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [
                      styles.generateBtn,
                      copied ? styles.copyBtnSuccess : styles.copyBtnDefault,
                      pressed && commonStyles.pressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={copied ? 'check' : 'content-copy'}
                      size={UI_ICON_SIZE_18}
                      color={copied ? theme.colors.white : c.onPrimary || theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.generateBtnText,
                        copied ? styles.copyTextSuccess : styles.copyTextDefault,
                      ]}
                    >
                      {copied ? t('sync.invite.copied') : t('sync.invite.copyBtn')}
                    </Text>
                  </Pressable>

                  <View style={styles.warningRow}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={UI_ICON_SIZE_14}
                      color={c.primary}
                      style={styles.warningIconMargin}
                    />
                    <Text style={styles.warningText}>{t('sync.invite.warning')}</Text>
                  </View>
                </Animated.View>
              )}

              {!isSynced && (
                <Animated.View
                  entering={FadeInDown.duration(Durations.fade).delay(Durations.delayMedium)}
                  style={styles.invitePasteSection}
                >
                  <View style={styles.invitePasteHeader}>
                    <View style={styles.invitePasteLeft}>
                      <Text style={styles.plusIcon}>+</Text>
                      <Text style={styles.invitePasteTitle}>{t('sync.alreadyHaveInvite')}</Text>
                    </View>
                    <Pressable onPress={handleOpenScanner} style={styles.scanPillSmall}>
                      <MaterialCommunityIcons
                        name="qrcode-scan"
                        size={UI_ICON_SIZE_14}
                        color={c.primary}
                      />
                      <Text style={styles.scanPillSmallText}>{t('sync.paste.scanBtn')}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.pasteRow}>
                    <TextInput
                      value={pasteCode}
                      onChangeText={setPasteCode}
                      onSubmitEditing={handleConnect}
                      onFocus={handleScrollToEnd}
                      placeholder={t('sync.paste.placeholder')}
                      placeholderTextColor={hexWithAlpha(c.onSurfaceVariant, 0.4)}
                      style={styles.pasteInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={handleConnect}
                      disabled={isLoading || !isValidInvite(pasteCode)}
                      style={({ pressed }) => [
                        styles.linkPillBtn,
                        pressed && commonStyles.pressed,
                        (isLoading || !isValidInvite(pasteCode)) && styles.linkPillBtnDisabled,
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={loaderColor} />
                      ) : (
                        <Text style={styles.linkPillText}>{t('sync.paste.linkBtn')}</Text>
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              )}

              <Animated.View
                entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}
                style={styles.footNoteRow}
              >
                <MaterialCommunityIcons
                  name="shield-check"
                  size={UI_ICON_SIZE_12}
                  color={c.primary}
                  style={styles.warningIconMargin}
                />
                <Text style={styles.footNoteText}>{t('sync.footer')}</Text>
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View
              key="devices-tab"
              entering={FadeIn.duration(Durations.fade)}
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.tabContent}
            >
              {localDevices.length > 0 && (
                <>
                  <Text style={md3Styles.settingsSectionCap}>{t('sync.devices.thisDevice')}</Text>
                  <View style={styles.deviceList}>{localDevices.map(renderLocalDeviceCard)}</View>
                </>
              )}

              <Text
                style={[
                  md3Styles.settingsSectionCap,
                  localDevices.length > 0 && md3Styles.settingsSectionCapSpaced,
                ]}
              >
                {t('sync.devices.otherDevices')}
              </Text>

              {otherDevices.length > 0 ? (
                <View style={styles.deviceList}>{otherDevices.map(renderOtherDeviceCard)}</View>
              ) : (
                <Animated.View
                  entering={FadeInDown.duration(Durations.fade)}
                  style={styles.emptyCard}
                >
                  <MaterialCommunityIcons
                    name="cellphone-link"
                    size={UI_ICON_SIZE_30}
                    color={c.onSurfaceVariant}
                  />
                  <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
                </Animated.View>
              )}

              <Animated.View
                entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}
                style={styles.footNoteRow}
              >
                <MaterialCommunityIcons
                  name="shield-check"
                  size={UI_ICON_SIZE_12}
                  color={c.primary}
                  style={styles.warningIconMargin}
                />
                <Text style={styles.footNoteText}>{t('sync.footer')}</Text>
              </Animated.View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AndroidScannerModal
        visible={scannerVisible}
        onClose={handleCloseScanner}
        onBarcodeScanned={handleBarcodeScanned}
        hasScanned={hasScanned}
      />

      <BottomActionSheet
        visible={deleteSheetVisible}
        onDismiss={() => setDeleteSheetVisible(false)}
        title={t('sync.delete.title')}
        subtitle={t('sync.delete.description')}
        actions={deleteActions}
      />
    </View>
  )
}

const useSyncHooks = () => {
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
    flex1: {
      ...commonStyles.flex1,
    },
    appBar: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      paddingHorizontal: UI_SIZE_8,
      paddingBottom: UI_SIZE_8,
      paddingTop: insets.top + UI_SIZE_16,
    },
    iconBtn: {
      padding: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
    },
    appBarTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      ...commonStyles.flex1,
      color: c.onSurface,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_24,
      paddingTop: UI_SIZE_8,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    segRow: {
      alignItems: 'center',
      marginBottom: UI_SIZE_28,
    },
    segTrack: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_9999,
      padding: UI_SIZE_4,
      width: '100%',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    segPill: {
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    segPillActive: {
      backgroundColor: c.primaryContainer,
    },
    segLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
    segLabelActive: {
      color: c.onPrimaryContainer,
    },
    tabContent: {
      ...commonStyles.flex1,
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: UI_SIZE_8,
      position: 'relative',
    },
    heroCircle: {
      width: UI_SIZE_120,
      height: UI_SIZE_120,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.12),
    },
    heroBadge: {
      position: 'absolute',
      bottom: 0,
      right: '33%',
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: c.primary,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.black,
      fontFamily: FontFamily.extraBold,
      textAlign: 'center',
      marginTop: UI_SIZE_20,
      marginBottom: UI_SIZE_12,
      letterSpacing: -0.5,
      color: c.onSurface,
    },
    heroDesc: {
      fontSize: FontSize.body,
      lineHeight: UI_SIZE_22,
      textAlign: 'center',
      marginBottom: UI_SIZE_32,
      paddingHorizontal: UI_SIZE_16,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    generateBtn: {
      borderRadius: UI_SIZE_9999,
      width: '100%',
      ...commonStyles.row,
      justifyContent: 'center',
      paddingVertical: UI_SIZE_18,
      marginBottom: UI_SIZE_12,
      backgroundColor: c.primary,
    },
    generateBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary || theme.colors.text,
    },
    btnDisabled: {
      opacity: 0.7,
    },
    mr8: {
      marginRight: UI_SIZE_8,
    },
    qrWrap: {
      alignItems: 'center',
      marginBottom: UI_SIZE_20,
    },
    qrBox: {
      width: UI_SIZE_200,
      height: UI_SIZE_200,
      borderRadius: UI_SIZE_16,
      ...commonStyles.centered,
      backgroundColor: theme.colors.white,
    },
    qrTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginTop: UI_SIZE_12,
      marginBottom: UI_SIZE_4,
      color: c.onSurface,
    },
    qrDescription: {
      fontSize: FontSize.body,
      lineHeight: UI_SIZE_18,
      textAlign: 'center',
      color: c.onSurfaceVariant,
      paddingHorizontal: UI_SIZE_20,
    },
    codeLabelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.4,
      marginBottom: UI_SIZE_10,
      color: c.onSurfaceVariant,
    },
    codeBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: UI_SIZE_12,
      paddingVertical: UI_SIZE_14,
      paddingHorizontal: UI_SIZE_14,
      marginBottom: UI_SIZE_16,
      borderColor: hexWithAlpha(c.outlineVariant, 0.25),
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: FontSize.caption,
      letterSpacing: 1,
      color: c.onSurface,
    },
    copyBtnSuccess: {
      backgroundColor: theme.colors.success,
    },
    copyBtnDefault: {
      backgroundColor: c.primary,
    },
    copyTextSuccess: {
      color: theme.colors.white,
      marginLeft: UI_SIZE_8,
    },
    copyTextDefault: {
      color: c.onPrimary || theme.colors.text,
      marginLeft: UI_SIZE_8,
    },
    warningRow: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
      borderWidth: 1,
      borderRadius: UI_SIZE_12,
      padding: UI_SIZE_14,
      marginTop: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.primary, 0.08),
      borderColor: hexWithAlpha(c.primary, 0.2),
    },
    warningIconMargin: {
      marginTop: UI_SIZE_2,
    },
    warningText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      lineHeight: UI_SIZE_17,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    invitePasteSection: {
      marginTop: UI_SIZE_28,
    },
    invitePasteHeader: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      marginBottom: UI_SIZE_14,
    },
    invitePasteLeft: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    plusIcon: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      lineHeight: UI_SIZE_20,
      color: c.primary,
    },
    invitePasteTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    scanPillSmall: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
      paddingVertical: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_10,
      borderRadius: UI_SIZE_8,
      backgroundColor: hexWithAlpha(c.primary, 0.1),
    },
    scanPillSmallText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    pasteRow: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_9999,
      paddingLeft: UI_SIZE_20,
      paddingRight: UI_SIZE_6,
      paddingVertical: UI_SIZE_6,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surfaceContainer,
      borderColor: hexWithAlpha(c.outlineVariant, 0.15),
    },
    pasteInput: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      paddingVertical: UI_SIZE_10,
      color: c.onSurface,
    },
    linkPillBtn: {
      borderRadius: UI_SIZE_9999,
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      backgroundColor: c.primary,
    },
    linkPillBtnDisabled: {
      opacity: 0.4,
    },
    linkPillText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary || theme.colors.text,
    },
    footNoteRow: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_24,
    },
    footNoteText: {
      fontSize: FontSize.caption,
      ...commonStyles.flex1,
      lineHeight: UI_SIZE_17,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    deviceList: {
      gap: UI_SIZE_10,
    },
    emptyCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: UI_SIZE_24,
      paddingVertical: UI_SIZE_40,
      ...commonStyles.centered,
      gap: UI_SIZE_12,
      borderColor: hexWithAlpha(c.outlineVariant, 0.15),
    },
    emptyText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })

  return styles
}, useSyncHooks)
