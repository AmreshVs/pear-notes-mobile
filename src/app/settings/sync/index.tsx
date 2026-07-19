import { isValidInvite } from '@pear-notes/core/utils.js'
import { Check, Globe, Link2, ScanLine, ShieldCheck, Smartphone } from 'lucide-react-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Reanimated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import useSyncScreen from './useSyncScreen'

import { SyncDeviceCard } from '@/components/sync/SyncDeviceCard'
import { SyncScannerModal } from '@/components/sync/SyncScannerModal'
import { Text, createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  MonoFontFamily,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_26,
  UI_SIZE_180,
  UI_SIZE_200,
  commonStyles,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

export default function SyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()

  const {
    tab,
    setTab,
    copied,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    cameraPermission,
    requestCameraPermission,
    scrollRef,
    inviteCode,
    expiresAt,
    isLoading,
    syncedDevices,
    handleCopy,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleGenerateInvite,
    handleScrollToEnd,
    formatExpiry,
  } = useSyncScreen()

  const renderTabPill = useCallback(
    (tabKey: 'link' | 'devices') => {
      const active = tab === tabKey
      const handlePress = () => setTab(tabKey)
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
    [tab, t, styles, setTab],
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
              {!inviteCode ? (
                <>
                  <RNView style={styles.iconRing}>
                    <Globe size={UI_ICON_SIZE_26} color={colors.primary} strokeWidth={1.5} />
                  </RNView>

                  <Text style={styles.heroTitle}>{t('sync.hero.title')}</Text>
                  <Text style={styles.heroDesc}>{t('sync.hero.description')}</Text>

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
                      {isLoading ? t('sync.hero.preparing') : t('sync.hero.generateBtn')}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <RNView style={styles.inviteHeader}>
                    <RNView style={styles.iconPill}>
                      <ShieldCheck
                        size={UI_ICON_SIZE_18}
                        color={colors.primary}
                        strokeWidth={1.5}
                      />
                    </RNView>
                    <RNView style={commonStyles.flex1}>
                      <Text style={styles.inviteTitle}>{t('sync.invite.header')}</Text>
                      <Text style={styles.inviteSub}>{formatExpiry(expiresAt)}</Text>
                    </RNView>
                  </RNView>

                  {inviteCode ? (
                    <Reanimated.View
                      entering={FadeIn.duration(220).delay(70)}
                      style={styles.qrSection}
                    >
                      <RNView style={styles.qrImageWrap}>
                        <QRCode
                          value={inviteCode}
                          size={UI_SIZE_180}
                          backgroundColor={colors.white}
                          color={colors.qrDark}
                        />
                      </RNView>
                      <Text style={styles.qrTitle}>{t('sync.invite.qrTitle')}</Text>
                      <Text style={styles.qrDescription}>{t('sync.invite.qrDescription')}</Text>
                    </Reanimated.View>
                  ) : null}

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
                      <Check size={UI_ICON_SIZE_14} color={colors.white} strokeWidth={2.5} />
                    ) : (
                      <Link2 size={UI_ICON_SIZE_14} color={colors.onPrimary} strokeWidth={2.2} />
                    )}
                    <Text style={[styles.btnText, copied && styles.btnTextCopied]}>
                      {copied ? t('sync.invite.copied') : t('sync.invite.copyBtn')}
                    </Text>
                  </Pressable>
                </>
              )}
            </Reanimated.View>

            {inviteCode && (
              <Reanimated.View entering={FadeIn.duration(220).delay(80)} style={styles.warningCard}>
                <ShieldCheck
                  size={UI_ICON_SIZE_14}
                  color={colors.primary}
                  strokeWidth={1.8}
                  style={styles.iconTopFix}
                />
                <Text style={styles.warningText}>{t('sync.invite.warning')}</Text>
              </Reanimated.View>
            )}

            <Reanimated.View entering={FadeInDown.duration(220).delay(110)}>
              <RNView style={styles.invitePasteHeader}>
                <RNView style={styles.invitePasteLeft}>
                  <Text style={styles.plusIcon}>+</Text>
                  <Text style={styles.invitePasteText}>{t('sync.paste.header')}</Text>
                </RNView>
                <Pressable onPress={handleOpenScanner} style={styles.scanPillBtn}>
                  <ScanLine size={UI_ICON_SIZE_14} color={colors.primary} />
                  <Text style={styles.scanPillBtnText}>{t('sync.paste.scanBtn')}</Text>
                </Pressable>
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
            </Reanimated.View>

            <Reanimated.View entering={FadeIn.duration(220).delay(140)} style={styles.footNoteRow}>
              <ShieldCheck
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
              <Text style={styles.sectionCap}>{t('sync.devices.thisDevice')}</Text>
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
              <Text style={styles.sectionCapDevice}>{t('sync.devices.otherDevices')}</Text>
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
                <Smartphone size={UI_ICON_SIZE_22} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
              </Reanimated.View>
            )}

            <Reanimated.View entering={FadeIn.duration(220).delay(140)} style={styles.footNoteRow}>
              <ShieldCheck
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
        hasScanned={hasScanned}
        cameraGranted={cameraPermission?.granted ?? false}
        onClose={handleCloseScanner}
        onBarcodeScanned={handleBarcodeScanned}
        onRequestPermission={requestCameraPermission}
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
      paddingHorizontal: Space.xl,
      paddingTop: 28,
      paddingBottom: Space.xl,
      alignItems: 'center',
      marginBottom: Space.base,
      backgroundColor: cardBg,
      borderColor: cardBorder,
    },
    iconRing: {
      width: 58,
      height: 58,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.13 : 0.1),
    },
    heroTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
      marginBottom: Space.md,
      textAlign: 'center',
      color: theme.colors.text,
    },
    heroDesc: {
      fontSize: FontSize.body,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 22,
      paddingHorizontal: 6,
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
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      width: '100%',
      paddingBottom: Space.base,
    },
    iconPill: {
      width: 42,
      height: 42,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.13 : 0.1),
    },
    inviteTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    inviteSub: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    codeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingTop: 14,
      paddingBottom: Space.md,
      width: '100%',
      color: theme.colors.textMuted,
      borderTopColor: cardBorder,
      borderTopWidth: 1,
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
      marginBottom: Space.md,
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
      marginBottom: Space.xl,
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
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    sectionCapDevice: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      marginTop: Space.lg + Space.sm,
      textTransform: 'uppercase',
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
