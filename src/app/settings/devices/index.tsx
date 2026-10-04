import { useCallback, useMemo } from 'react'
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
import { Easing, LinearTransition } from 'react-native-reanimated'

import { isValidInvite } from '@pear-notes/core/utils.js'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { InviteCard } from '@/components/sync/InviteCard'
import { SyncDeviceCard } from '@/components/sync/SyncDeviceCard'
import { SyncLeadersNotes } from '@/components/sync/SyncLeadersNotes'
import { SyncScannerModal } from '@/components/sync/SyncScannerModal'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_22,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { buildDeviceInviteCopy } from '@/utils/inviteCopy'

import useDevicesScreen from './useDevicesScreen'

export default function SyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const {
    tab,
    handleSelectTab,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    cameraPermission,
    handleRequestCameraPermission,
    scrollRef,
    invite,
    pasteIsDeviceInvite,
    pasteIsVaultLink,
    isLoading,
    syncedDevices,
    showJoinSection,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleAttachQrImage,
    scanError,
    handleScrollToEnd,
  } = useDevicesScreen()

  const deviceInviteCopy = useMemo(() => buildDeviceInviteCopy(t), [t])

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
        <RNView style={styles.segRow}>{(['devices', 'link'] as const).map(renderTabPill)}</RNView>

        {tab === 'link' ? (
          <MotionView
            key="link-tab"
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.pad}
          >
            <InviteCard
              invite={invite}
              copy={deviceInviteCopy}
              idleIcon="laptopcomputer.and.iphone"
              idleBadgeIcon="arrow.triangle.2.circlepath"
            />

            {showJoinSection && (
              <RNView>
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
                    disabled={isLoading || !pasteIsDeviceInvite}
                    style={({ pressed }) => [
                      styles.linkBtn,
                      styles.linkBtnBg,
                      (isLoading || !pasteIsDeviceInvite) && styles.linkBtnDisabled,
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

                {!scannerVisible && !scanError && pasteIsVaultLink && (
                  <Text style={styles.pasteError}>{t('sync.paste.vaultLinkError')}</Text>
                )}

                {!scannerVisible &&
                  !scanError &&
                  !pasteIsVaultLink &&
                  pasteCode.trim().length > 0 &&
                  !isValidInvite(pasteCode) && (
                    <Text style={styles.pasteHint}>{t('sync.paste.hintInvalid')}</Text>
                  )}
              </RNView>
            )}

            <SyncLeadersNotes showSuggestion={false} />

            <RNView style={styles.footNoteRow}>
              <SymbolIcon
                name="checkmark.shield"
                size={UI_ICON_SIZE_13}
                color={colors.primary}
                style={styles.iconTopFix}
              />
              <Text style={styles.footNote}>{t('sync.footer')}</Text>
            </RNView>
          </MotionView>
        ) : (
          <MotionView
            key="devices-tab"
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.pad}
          >
            <RNView>
              <Text style={commonThemedStyles.sectionCamelCase}>
                {t('sync.devices.thisDevice')}
              </Text>
            </RNView>

            <MotionView
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
              style={styles.deviceGroup}
            >
              {renderLocalDevices()}
            </MotionView>

            <MotionView layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
              <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
                {t('sync.devices.otherDevices')}
              </Text>
            </MotionView>

            {otherDevices.length > 0 ? (
              <MotionView
                layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
                style={styles.deviceGroup}
              >
                {renderOtherDevices()}
              </MotionView>
            ) : (
              <RNView style={styles.emptyCard}>
                <SymbolIcon name="iphone" size={UI_ICON_SIZE_22} color={colors.textMuted} />
                <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
              </RNView>
            )}

            <SyncLeadersNotes />

            <RNView style={styles.footNoteRow}>
              <SymbolIcon
                name="checkmark.shield"
                size={UI_ICON_SIZE_13}
                color={colors.primary}
                style={styles.iconTopFix}
              />
              <Text style={styles.footNote}>{t('sync.footer')}</Text>
            </RNView>
          </MotionView>
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
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
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
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
    pasteHint: {
      marginTop: Space.sm,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
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
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    deviceGroup: {
      borderRadius: Radii.card,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardSurface,
      borderColor: theme.colors.borderSecondary,
    },
    emptyCard: {
      borderStyle: 'dashed',
      borderRadius: Radii.card,
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
  })
  return styles
})
