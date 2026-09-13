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
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { INVITE_EXPIRY_MINUTES } from '@pear-notes/core/constant.js'
import { formatInviteCountdown, isValidInvite } from '@pear-notes/core/utils.js'

import { AndroidDeviceCard } from '@/components/android/AndroidDeviceCard'
import { AndroidScannerModal } from '@/components/android/AndroidScannerModal'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_30,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_120,
  UI_SIZE_180,
  UI_SIZE_200,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import useDevicesScreen from './useDevicesScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

export default function AndroidSyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()

  const {
    indexerOffline,
    indexerName,
    tab,
    handleSelectTab,
    copied,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    deleteSheetVisible,
    setDeleteSheetVisible,
    scrollRef,
    inviteCode,
    inviteRemainingMs,
    inviteExpired,
    isLoading,
    syncedDevices,
    isSynced,
    handleCopy,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleGenerateInvite,
    handleShareQr,
    handleAttachQrImage,
    isSharingQr,
    scanError,
    handleQrRef,
    inviteExpiringSoon,
    handleScrollToEnd,
    handleDeleteDevice,
    handleConfirmDelete,
  } = useDevicesScreen()

  const canLink = isValidInvite(pasteCode)
  const linkDisabled = isLoading || !canLink
  const linkHint =
    isLoading || canLink || scanError
      ? null
      : t(pasteCode.trim().length === 0 ? 'sync.paste.hintEmpty' : 'sync.paste.hintInvalid')

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
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.appBar}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_8}
          style={styles.iconBtn}
        >
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
          <View style={styles.segRow}>
            <View style={styles.segTrack}>
              {(['link', 'devices'] as const).map((tValue) => {
                const active = tab === tValue
                return (
                  <Pressable
                    key={tValue}
                    onPress={() => handleSelectTab(tValue)}
                    android_ripple={ripple}
                    style={[styles.segPill, active && styles.segPillActive]}
                  >
                    <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                      {tValue === 'link' ? t('sync.tabs.link') : t('sync.tabs.devices')}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {tab === 'link' ? (
            <MotionView
              key="link-tab"
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.tabContent}
            >
              {!inviteCode || inviteExpired ? (
                <View style={styles.heroCard}>
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

                  <Text style={styles.heroTitle}>
                    {inviteExpired ? t('sync.invite.expiredTitle') : t('sync.hero.title')}
                  </Text>
                  <Text style={styles.heroDesc}>
                    {inviteExpired
                      ? t('sync.invite.expiredDesc', { minutes: INVITE_EXPIRY_MINUTES })
                      : t('sync.hero.description')}
                  </Text>

                  <Pressable
                    onPress={handleGenerateInvite}
                    disabled={isLoading}
                    android_ripple={ripplePrimary}
                    style={[styles.generateBtn, isLoading && styles.btnDisabled]}
                  >
                    {isLoading && (
                      <ActivityIndicator size="small" color={loaderColor} style={styles.mr8} />
                    )}
                    <Text style={styles.generateBtnText}>
                      {isLoading
                        ? t('sync.hero.preparing')
                        : inviteExpired
                          ? t('sync.invite.regenerateBtn')
                          : t('sync.hero.generateBtn')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.heroCard}>
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
                  <View
                    style={[styles.countdownPill, inviteExpiringSoon && styles.countdownPillUrgent]}
                  >
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={UI_ICON_SIZE_14}
                      color={inviteExpiringSoon ? c.error : c.primary}
                    />
                    <Text
                      style={[
                        styles.countdownText,
                        inviteExpiringSoon && styles.countdownTextUrgent,
                      ]}
                    >
                      {t('sync.invite.expiresIn', {
                        countdown: formatInviteCountdown(inviteRemainingMs),
                      })}
                    </Text>
                  </View>

                  <View style={styles.qrWrap}>
                    <View style={styles.qrBox}>
                      <QRCode
                        getRef={handleQrRef}
                        value={inviteCode}
                        size={UI_SIZE_180}
                        backgroundColor={theme.colors.white}
                        color={theme.colors.qrDark}
                      />
                    </View>
                    <Text style={styles.qrTitle}>{t('sync.invite.qrTitle')}</Text>
                    <Text style={styles.qrDescription}>{t('sync.invite.qrDescription')}</Text>
                    <Pressable
                      onPress={handleShareQr}
                      disabled={isSharingQr}
                      android_ripple={ripple}
                      style={[styles.shareQrBtn, isSharingQr && styles.btnDisabled]}
                    >
                      <MaterialCommunityIcons
                        name="share-variant"
                        size={UI_ICON_SIZE_14}
                        color={c.primary}
                      />
                      <Text style={styles.shareQrBtnText}>{t('sync.invite.shareQrBtn')}</Text>
                    </Pressable>
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
                    android_ripple={ripplePrimary}
                    style={[
                      styles.generateBtn,
                      copied ? styles.copyBtnSuccess : styles.copyBtnDefault,
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
                </View>
              )}

              {!isSynced && (
                <View style={styles.invitePasteSection}>
                  <View style={styles.invitePasteHeader}>
                    <View style={styles.invitePasteLeft}>
                      <Text style={styles.plusIcon}>+</Text>
                      <Text style={styles.invitePasteTitle}>{t('sync.alreadyHaveInvite')}</Text>
                    </View>
                    <View style={styles.pastePillRow}>
                      <Pressable
                        onPress={handleAttachQrImage}
                        android_ripple={ripple}
                        accessibilityRole="button"
                        accessibilityLabel={t('sync.paste.attachBtn')}
                        style={styles.scanPillSmall}
                      >
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={UI_ICON_SIZE_14}
                          color={c.primary}
                        />
                        <Text style={styles.scanPillSmallText}>{t('sync.paste.attachBtn')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleOpenScanner}
                        android_ripple={ripple}
                        accessibilityRole="button"
                        accessibilityLabel={t('sync.paste.scanBtn')}
                        style={styles.scanPillSmall}
                      >
                        <MaterialCommunityIcons
                          name="qrcode-scan"
                          size={UI_ICON_SIZE_14}
                          color={c.primary}
                        />
                        <Text style={styles.scanPillSmallText}>{t('sync.paste.scanBtn')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.pasteRow}>
                    <TextInput
                      value={pasteCode}
                      onChangeText={setPasteCode}
                      onSubmitEditing={handleConnect}
                      onFocus={handleScrollToEnd}
                      placeholder={t('sync.paste.placeholder')}
                      placeholderTextColor={c.onSurfaceVariant}
                      style={styles.pasteInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline={false}
                    />
                    <Pressable
                      onPress={handleConnect}
                      disabled={linkDisabled}
                      android_ripple={ripplePrimary}
                      style={[styles.linkPillBtn, linkDisabled && styles.linkPillBtnDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={loaderColor} />
                      ) : (
                        <Text style={styles.linkPillText}>{t('sync.paste.linkBtn')}</Text>
                      )}
                    </Pressable>
                  </View>

                  {!scannerVisible && !!scanError && (
                    <Text style={styles.pasteError}>{t(scanError)}</Text>
                  )}

                  {!scannerVisible && !!linkHint && (
                    <Text style={styles.pasteHint}>{linkHint}</Text>
                  )}
                </View>
              )}

              <View style={styles.footNoteRow}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={UI_ICON_SIZE_12}
                  color={c.primary}
                  style={styles.warningIconMargin}
                />
                <Text style={styles.footNoteText}>{t('sync.footer')}</Text>
              </View>
            </MotionView>
          ) : (
            <MotionView
              key="devices-tab"
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.tabContent}
            >
              {localDevices.length > 0 && (
                <>
                  <Text style={md3Styles.settingsSectionCamelCase}>
                    {t('sync.devices.thisDevice')}
                  </Text>
                  <View style={styles.deviceList}>{localDevices.map(renderLocalDeviceCard)}</View>
                </>
              )}

              <Text
                style={[
                  commonStyles.sectionHeader,
                  md3Styles.settingsSectionCamelCase,
                  localDevices.length > 0 && md3Styles.settingsSectionCamelCase,
                ]}
              >
                {t('sync.devices.otherDevices')}
              </Text>

              {otherDevices.length > 0 ? (
                <View style={styles.deviceList}>{otherDevices.map(renderOtherDeviceCard)}</View>
              ) : (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons
                    name="cellphone-link"
                    size={UI_ICON_SIZE_30}
                    color={c.onSurfaceVariant}
                  />
                  <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
                </View>
              )}

              <View style={styles.footNoteRow}>
                <MaterialCommunityIcons
                  name="crown-outline"
                  size={UI_ICON_SIZE_12}
                  color={c.primary}
                  style={styles.warningIconMargin}
                />
                <Text style={styles.footNoteText}>{t('sync.devices.indexerExplain')}</Text>
              </View>

              {indexerOffline && (
                <View style={styles.footNoteRow}>
                  <MaterialCommunityIcons
                    name="alert-outline"
                    size={UI_ICON_SIZE_12}
                    color={c.onSurfaceVariant}
                    style={styles.warningIconMargin}
                  />
                  <Text style={styles.footNoteWarningText}>
                    {t('sync.devices.indexerOfflineNotice', { name: indexerName })}
                  </Text>
                </View>
              )}

              <View style={styles.footNoteRow}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={UI_ICON_SIZE_12}
                  color={c.primary}
                  style={styles.warningIconMargin}
                />
                <Text style={styles.footNoteText}>{t('sync.footer')}</Text>
              </View>
            </MotionView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AndroidScannerModal
        visible={scannerVisible}
        onClose={handleCloseScanner}
        onBarcodeScanned={handleBarcodeScanned}
        onAttachImage={handleAttachQrImage}
        scanError={scanError}
        hasScanned={hasScanned}
      />

      <BottomActionSheet
        visible={deleteSheetVisible}
        onDismiss={() => setDeleteSheetVisible(false)}
        title={t('sync.delete.title')}
        subtitle={t('sync.delete.description')}
        showHeader
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
      overflow: 'hidden',
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
      paddingHorizontal: UI_SIZE_16,
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
      overflow: 'hidden',
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
    heroCard: {
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    heroSection: {
      alignItems: 'center',
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
      paddingHorizontal: UI_SIZE_8,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    generateBtn: {
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
      width: '100%',
      ...commonStyles.row,
      justifyContent: 'center',
      paddingVertical: UI_SIZE_18,
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
    shareQrBtn: {
      overflow: 'hidden',
      ...commonStyles.row,
      gap: UI_SIZE_6,
      marginTop: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primary, 0.1),
    },
    shareQrBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    countdownPill: {
      ...commonStyles.row,
      alignSelf: 'center',
      gap: UI_SIZE_6,
      paddingVertical: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      marginBottom: UI_SIZE_32,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    countdownPillUrgent: {
      backgroundColor: hexWithAlpha(c.error, 0.14),
    },
    countdownText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    countdownTextUrgent: {
      color: c.error,
    },
    codeLabelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.4,
      marginBottom: UI_SIZE_10,
      color: c.onSurfaceVariant,
    },
    codeBox: {
      borderStyle: 'dashed',
      borderRadius: UI_SIZE_12,
      paddingVertical: UI_SIZE_14,
      paddingHorizontal: UI_SIZE_14,
      marginBottom: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
      borderColor: hexWithAlpha(c.outlineVariant, 0.25),
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: FontSize.body,
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
    pastePillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
    },
    pasteError: {
      marginTop: UI_SIZE_8,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.error,
    },
    pasteHint: {
      marginTop: UI_SIZE_8,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurfaceVariant,
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
      overflow: 'hidden',
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
      overflow: 'hidden',
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
    footNoteWarningText: {
      fontSize: FontSize.caption,
      ...commonStyles.flex1,
      lineHeight: UI_SIZE_17,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    deviceList: {
      gap: UI_SIZE_12,
    },
    emptyCard: {
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
