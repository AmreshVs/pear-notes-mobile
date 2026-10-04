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
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Stack } from 'expo-router'

import { AndroidDeviceCard } from '@/components/android/AndroidDeviceCard'
import { AndroidInviteCard } from '@/components/android/AndroidInviteCard'
import { AndroidScannerModal } from '@/components/android/AndroidScannerModal'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { AndroidSyncLeadersNotes } from '@/components/android/AndroidSyncLeadersNotes'
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
  UI_ICON_SIZE_30,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { buildDeviceInviteCopy } from '@/utils/inviteCopy'

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
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()

  const {
    tab,
    handleSelectTab,
    pasteCode,
    setPasteCode,
    scannerVisible,
    hasScanned,
    deleteSheetVisible,
    setDeleteSheetVisible,
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
    handleDeleteDevice,
    handleConfirmDelete,
  } = useDevicesScreen()

  const deviceInviteCopy = useMemo(() => buildDeviceInviteCopy(t), [t])

  const canLink = pasteIsDeviceInvite
  const linkDisabled = isLoading || !canLink
  const linkHint =
    isLoading || canLink || scanError || pasteIsVaultLink
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

      <AndroidSettingsAppBar title={t('sync.title')} />

      <KeyboardAvoidingView behavior="height" style={styles.flex1}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.segRow}>
            <View style={styles.segTrack}>
              {(['devices', 'link'] as const).map((tValue) => {
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
              <AndroidInviteCard
                invite={invite}
                copy={deviceInviteCopy}
                idleIcon="devices"
                idleBadgeIcon="sync"
              />

              {showJoinSection && (
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

                  {!scannerVisible && !scanError && pasteIsVaultLink && (
                    <Text style={styles.pasteError}>{t('sync.paste.vaultLinkError')}</Text>
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

              <AndroidSyncLeadersNotes />

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
    warningIconMargin: {
      marginTop: UI_SIZE_2,
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
