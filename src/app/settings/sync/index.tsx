import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Reanimated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { INVITE_EXPIRY_MINUTES } from '@pear-notes/core/constant.js'
import { formatInviteCountdown, isValidInvite } from '@pear-notes/core/utils.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { SyncDeviceCard } from '@/components/sync/SyncDeviceCard'
import { SyncScannerModal } from '@/components/sync/SyncScannerModal'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  MonoFontFamily,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_44,
  UI_SIZE_36,
  UI_SIZE_120,
  UI_SIZE_180,
  UI_SIZE_200,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import useSyncScreen from './useSyncScreen'

export default function SyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const {
    tab,
    handleSelectTab,
    copied,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    cameraPermission,
    handleRequestCameraPermission,
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
  } = useSyncScreen()

  const renderTabPill = useCallback(
    (tabKey: 'link' | 'devices') => {
      const active = tab === tabKey
      const handlePress = () => handleSelectTab(tabKey)
      return (
        <Pressable
          key={tabKey}
          onPress={handlePress}
          style={[styles.segPill, active && styles.segPillActive]}
        >
          <Text style={[styles.segLabel, active ? styles.segLabelActive : styles.segLabelInactive]}>
            {tabKey === 'link' ? t('sync.tabs.link') : t('sync.tabs.devices')}
          </Text>
        </Pressable>
      )
    },
    [tab, t, styles, handleSelectTab],
  )

  const renderLocalDevices = useCallback(() => {
    return (syncedDevices as any[])
      .filter((d) => d.isLocal)
      .map((device, index, arr) => (
        <SyncDeviceCard
          key={device.key}
          device={device}
          showSep={index < arr.length - 1}
          animationIndex={index}
        />
      ))
  }, [syncedDevices])

  const renderOtherDevices = useCallback(() => {
    return (syncedDevices as any[])
      .filter((d) => !d.isLocal)
      .map((device, index, arr) => (
        <SyncDeviceCard
          key={device.key}
          device={device}
          isOther
          showSep={index < arr.length - 1}
          animationIndex={index + 1}
        />
      ))
  }, [syncedDevices])

  const otherDevices = (syncedDevices as any[]).filter((d) => !d.isLocal)

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={process.env.EXPO_OS === 'ios' ? 96 : 0}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Reanimated.View entering={FadeIn.duration(220)} style={styles.segRow}>
          {(['link', 'devices'] as const).map(renderTabPill)}
        </Reanimated.View>

        {tab === 'link' ? (
          <Reanimated.View
            key="link-tab"
            entering={FadeIn.duration(220)}
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.pad}
          >
            <Reanimated.View entering={FadeInDown.duration(240).delay(40)} style={styles.heroCard}>
              {!inviteCode || inviteExpired ? (
                <>
                  <RNView style={styles.heroSection}>
                    <RNView style={styles.heroCircle}>
                      <SymbolIcon
                        name="laptopcomputer.and.iphone"
                        size={UI_ICON_SIZE_44}
                        color={colors.primary}
                      />
                    </RNView>
                    <RNView style={styles.heroBadge}>
                      <SymbolIcon
                        name="arrow.triangle.2.circlepath"
                        size={UI_ICON_SIZE_16}
                        color={colors.onPrimary}
                        weight="semibold"
                      />
                    </RNView>
                  </RNView>

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
                    style={({ pressed }) => [
                      styles.generateBtn,
                      styles.generateBtnBg,
                      (isLoading || pressed) && commonStyles.pressed,
                    ]}
                  >
                    {isLoading && (
                      <ActivityIndicator
                        size="small"
                        color={colors.onPrimary}
                        style={styles.indicatorMargin}
                      />
                    )}
                    <Text style={styles.btnText}>
                      {isLoading
                        ? t('sync.hero.preparing')
                        : inviteExpired
                          ? t('sync.invite.regenerateBtn')
                          : t('sync.hero.generateBtn')}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <RNView style={styles.heroSection}>
                    <RNView style={styles.heroCircle}>
                      <SymbolIcon
                        name="checkmark.shield"
                        size={UI_ICON_SIZE_44}
                        color={colors.primary}
                      />
                    </RNView>
                  </RNView>

                  <Text style={styles.heroTitle}>{t('sync.invite.header')}</Text>
                  <RNView
                    style={[styles.countdownPill, inviteExpiringSoon && styles.countdownPillUrgent]}
                  >
                    <SymbolIcon
                      name="timer"
                      size={UI_ICON_SIZE_13}
                      color={inviteExpiringSoon ? colors.error : colors.primary}
                      weight="semibold"
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
                  </RNView>

                  <Reanimated.View
                    entering={FadeIn.duration(220).delay(70)}
                    style={styles.qrSection}
                  >
                    <RNView style={styles.qrImageWrap}>
                      <QRCode
                        getRef={handleQrRef}
                        value={inviteCode}
                        size={UI_SIZE_180}
                        backgroundColor={colors.white}
                        color={colors.qrDark}
                      />
                    </RNView>
                    <Text style={styles.qrTitle}>{t('sync.invite.qrTitle')}</Text>
                    <Text style={styles.qrDescription}>{t('sync.invite.qrDescription')}</Text>
                    <Pressable
                      onPress={handleShareQr}
                      disabled={isSharingQr}
                      style={({ pressed }) => [
                        styles.shareQrBtn,
                        isSharingQr && styles.linkBtnDisabled,
                        pressed && commonStyles.pressed,
                      ]}
                    >
                      <SymbolIcon
                        name="square.and.arrow.up"
                        size={UI_ICON_SIZE_13}
                        color={colors.primary}
                        weight="semibold"
                      />
                      <Text style={styles.shareQrBtnText}>{t('sync.invite.shareQrBtn')}</Text>
                    </Pressable>
                  </Reanimated.View>

                  <Text style={styles.codeLabel}>{t('sync.invite.codeLabel')}</Text>

                  <RNView style={styles.codeBox}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.codeScrollContent}
                    >
                      <Text selectable style={styles.codeText}>
                        {inviteCode}
                      </Text>
                    </ScrollView>
                  </RNView>

                  <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      copied ? styles.copyBtnCopied : styles.copyBtnDefault,
                      pressed && commonStyles.pressed,
                    ]}
                  >
                    {copied ? (
                      <SymbolIcon
                        name="checkmark"
                        size={UI_ICON_SIZE_14}
                        color={colors.white}
                        weight="semibold"
                      />
                    ) : (
                      <SymbolIcon
                        name="link"
                        size={UI_ICON_SIZE_14}
                        color={colors.onPrimary}
                        weight="semibold"
                      />
                    )}
                    <Text style={[styles.btnText, copied && styles.btnTextCopied]}>
                      {copied ? t('sync.invite.copied') : t('sync.invite.copyBtn')}
                    </Text>
                  </Pressable>

                  <RNView style={styles.warningCard}>
                    <SymbolIcon
                      name="checkmark.shield"
                      size={UI_ICON_SIZE_14}
                      color={colors.primary}
                      style={styles.iconTopFix}
                    />
                    <Text style={styles.warningText}>{t('sync.invite.warning')}</Text>
                  </RNView>
                </>
              )}
            </Reanimated.View>

            {!isSynced && (
              <Reanimated.View entering={FadeInDown.duration(220).delay(110)}>
                <RNView style={styles.invitePasteHeader}>
                  <RNView style={styles.invitePasteLeft}>
                    <Text style={styles.plusIcon}>+</Text>
                    <Text style={styles.invitePasteText}>{t('sync.paste.header')}</Text>
                  </RNView>
                  <RNView style={styles.pastePillRow}>
                    <Pressable
                      onPress={handleAttachQrImage}
                      accessibilityRole="button"
                      accessibilityLabel={t('sync.paste.attachBtn')}
                      style={({ pressed }) => [styles.scanPillBtn, pressed && commonStyles.pressed]}
                    >
                      <SymbolIcon
                        name="photo.on.rectangle"
                        size={UI_ICON_SIZE_14}
                        color={colors.primary}
                      />
                      <Text style={styles.scanPillBtnText}>{t('sync.paste.attachBtn')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleOpenScanner}
                      accessibilityRole="button"
                      accessibilityLabel={t('sync.paste.scanBtn')}
                      style={({ pressed }) => [styles.scanPillBtn, pressed && commonStyles.pressed]}
                    >
                      <SymbolIcon
                        name="qrcode.viewfinder"
                        size={UI_ICON_SIZE_14}
                        color={colors.primary}
                      />
                      <Text style={styles.scanPillBtnText}>{t('sync.paste.scanBtn')}</Text>
                    </Pressable>
                  </RNView>
                </RNView>

                <RNView style={styles.inputRow}>
                  <TextInput
                    value={pasteCode}
                    onChangeText={setPasteCode}
                    onSubmitEditing={handleConnect}
                    onFocus={handleScrollToEnd}
                    placeholder={t('sync.paste.placeholder')}
                    placeholderTextColor={colors.textMuted}
                    style={styles.codeInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Pressable
                    onPress={handleConnect}
                    disabled={isLoading || !isValidInvite(pasteCode)}
                    style={({ pressed }) => [
                      styles.linkBtn,
                      styles.linkBtnBg,
                      (isLoading || !isValidInvite(pasteCode)) && styles.linkBtnDisabled,
                      pressed && commonStyles.pressed,
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.linkBtnText}>{t('sync.paste.linkBtn')}</Text>
                    )}
                  </Pressable>
                </RNView>

                {!scannerVisible && !!scanError && (
                  <Text style={styles.pasteError}>{t(scanError)}</Text>
                )}
              </Reanimated.View>
            )}

            <Reanimated.View entering={FadeIn.duration(220).delay(140)} style={styles.footNoteRow}>
              <SymbolIcon
                name="checkmark.shield"
                size={UI_ICON_SIZE_13}
                color={colors.primary}
                style={styles.iconTopFix}
              />
              <Text style={styles.footNote}>{t('sync.footer')}</Text>
            </Reanimated.View>
          </Reanimated.View>
        ) : (
          <Reanimated.View
            key="devices-tab"
            entering={FadeIn.duration(220)}
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.pad}
          >
            <Reanimated.View entering={FadeIn.duration(200)}>
              <Text style={commonThemedStyles.settingsSectionCap}>
                {t('sync.devices.thisDevice')}
              </Text>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.duration(220).delay(30)}
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.deviceGroup}
            >
              {renderLocalDevices()}
            </Reanimated.View>

            <Reanimated.View
              entering={FadeIn.duration(200).delay(70)}
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            >
              <Text style={commonThemedStyles.settingsSectionCapSpaced}>
                {t('sync.devices.otherDevices')}
              </Text>
            </Reanimated.View>

            {otherDevices.length > 0 ? (
              <Reanimated.View
                entering={FadeInDown.duration(220).delay(100)}
                layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
                style={styles.deviceGroup}
              >
                {renderOtherDevices()}
              </Reanimated.View>
            ) : (
              <Reanimated.View
                entering={FadeInDown.duration(220).delay(100)}
                style={styles.emptyCard}
              >
                <SymbolIcon name="iphone" size={UI_ICON_SIZE_22} color={colors.textMuted} />
                <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
              </Reanimated.View>
            )}

            <Reanimated.View entering={FadeIn.duration(220).delay(140)} style={styles.footNoteRow}>
              <SymbolIcon
                name="checkmark.shield"
                size={UI_ICON_SIZE_13}
                color={colors.primary}
                style={styles.iconTopFix}
              />
              <Text style={styles.footNote}>{t('sync.footer')}</Text>
            </Reanimated.View>
          </Reanimated.View>
        )}
      </ScrollView>

      <SyncScannerModal
        visible={scannerVisible}
        onAttachImage={handleAttachQrImage}
        scanError={scanError}
        hasScanned={hasScanned}
        cameraGranted={cameraPermission?.granted ?? false}
        onClose={handleCloseScanner}
        onBarcodeScanned={handleBarcodeScanned}
        onRequestPermission={handleRequestCameraPermission}
      />
    </KeyboardAvoidingView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const isDark = theme.isDark
  const cardBg = isDark
    ? hexWithAlpha(theme.colors.white, 0.05)
    : hexWithAlpha(theme.colors.white, 0.9)
  const cardBorder = theme.colors.borderSecondary

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      paddingBottom: Space.huge,
    },
    segRow: {
      flexDirection: 'row',
      borderRadius: Radii.lg,
      padding: 3,
      marginHorizontal: Space.lg,
      marginTop: Space.md,
      marginBottom: 28,
      alignSelf: 'center',
      width: 264,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
    },
    segLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
    },
    segLabelActive: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
    },
    segLabelInactive: {
      color: theme.colors.textMuted,
    },
    pad: {
      paddingHorizontal: Space.lg,
    },
    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      paddingHorizontal: Space.lg,
      paddingTop: Space.xl,
      paddingBottom: Space.xl,
      marginBottom: Space.xl,
      backgroundColor: cardBg,
      borderColor: cardBorder,
    },
    heroSection: {
      alignItems: 'center',
      position: 'relative',
    },
    heroCircle: {
      width: UI_SIZE_120,
      height: UI_SIZE_120,
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.13 : 0.1),
    },
    heroBadge: {
      position: 'absolute',
      bottom: 0,
      right: '33%',
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
      marginTop: Space.lg,
      marginBottom: Space.md,
      textAlign: 'center',
      color: theme.colors.text,
    },
    heroDesc: {
      fontSize: FontSize.body,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: Space.xxl,
      paddingHorizontal: Space.sm,
      color: theme.colors.textMuted,
    },
    generateBtn: {
      borderRadius: 14,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 17,
    },
    generateBtnBg: {
      backgroundColor: theme.colors.primary,
    },
    btnText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.2,
    },
    btnTextCopied: {
      color: theme.colors.white,
    },
    codeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingBottom: Space.md,
      width: '100%',
      color: theme.colors.textMuted,
    },
    codeBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: Radii.md,
      paddingVertical: 15,
      paddingHorizontal: Space.md,
      width: '100%',
      borderColor: isDark
        ? hexWithAlpha(theme.colors.white, 0.18)
        : hexWithAlpha(theme.colors.black, 0.12),
    },
    codeScrollContent: {
      paddingHorizontal: 2,
    },
    codeText: {
      fontFamily: MonoFontFamily,
      fontSize: FontSize.caption,
      letterSpacing: 1,
      color: theme.colors.text,
    },
    qrSection: {
      width: '100%',
      alignItems: 'center',
      marginBottom: Space.lg,
    },
    qrImageWrap: {
      width: UI_SIZE_200,
      height: UI_SIZE_200,
      borderRadius: Radii.md,
      marginBottom: Space.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.white,
    },
    qrTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      marginBottom: Space.xs,
      color: theme.colors.text,
    },
    qrDescription: {
      fontSize: FontSize.caption,
      lineHeight: 18,
      textAlign: 'center',
      color: theme.colors.textMuted,
      paddingHorizontal: Space.sm,
    },
    shareQrBtn: {
      ...commonStyles.row,
      gap: Space.xs,
      marginTop: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.base,
      borderRadius: Radii.pill,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
    },
    shareQrBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    countdownPill: {
      ...commonStyles.row,
      alignSelf: 'center',
      gap: Space.xs,
      paddingVertical: Space.xs,
      paddingHorizontal: Space.md,
      borderRadius: Radii.pill,
      marginBottom: Space.lg,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.12),
    },
    countdownPillUrgent: {
      backgroundColor: hexWithAlpha(theme.colors.error, 0.14),
    },
    countdownText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    countdownTextUrgent: {
      color: theme.colors.error,
    },
    copyBtn: {
      borderRadius: 14,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      paddingVertical: Space.base,
      marginTop: Space.md,
    },
    copyBtnDefault: {
      backgroundColor: theme.colors.primary,
    },
    copyBtnCopied: {
      backgroundColor: theme.colors.success,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      borderWidth: 1,
      borderRadius: Radii.md,
      padding: 14,
      marginTop: Space.md,
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.07 : 0.08),
      borderColor: hexWithAlpha(theme.colors.primary, isDark ? 0.2 : 0.25),
    },
    warningText: {
      flex: 1,
      fontSize: FontSize.caption,
      lineHeight: 17,
      color: theme.colors.textMuted,
    },
    invitePasteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 6,
      justifyContent: 'space-between',
    },
    pastePillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pasteError: {
      marginTop: Space.sm,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
    invitePasteLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    plusIcon: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      lineHeight: 20,
      color: theme.colors.primary,
    },
    invitePasteText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: Space.base,
      paddingLeft: Space.base,
      paddingRight: Space.sm,
      paddingVertical: 6,
      gap: Space.sm,
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
    },
    codeInput: {
      flex: 1,
      fontSize: FontSize.body,
      paddingVertical: 9,
      color: theme.colors.text,
    },
    scanPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
    },
    scanPillBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    linkBtn: {
      borderRadius: Space.md,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    linkBtnBg: {
      backgroundColor: theme.colors.primary,
    },
    linkBtnDisabled: {
      opacity: 0.4,
    },
    linkBtnText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    footNoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      marginTop: Space.xl,
    },
    footNote: {
      fontSize: FontSize.body,
      flex: 1,
      lineHeight: 17,
      color: theme.colors.textMuted,
    },
    deviceGroup: {
      borderRadius: Radii.card,
      borderWidth: 1,
      overflow: 'hidden',
      backgroundColor: cardBg,
      borderColor: cardBorder,
    },
    emptyCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: Space.base,
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: isDark
        ? hexWithAlpha(theme.colors.white, 0.08)
        : hexWithAlpha(theme.colors.black, 0.08),
    },
    emptyText: {
      fontSize: FontSize.caption,
      marginTop: Space.md,
      color: theme.colors.textMuted,
    },
    iconTopFix: {
      marginTop: 1,
    },
    indicatorMargin: {
      marginRight: Space.sm,
    },
  })
  return styles
})
