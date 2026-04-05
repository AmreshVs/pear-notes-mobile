import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  deleteSyncedDevice,
  getLocalPreferences,
  getSyncedDevices,
  updateSyncedDevice,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getSyncIsLoading,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import { router, Stack } from 'expo-router'
import React, { memo, useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { useMD3Theme } from '@/components/android/useMD3Theme'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

const PLATFORM_NAMES: Record<string, string> = {
  darwin: 'MACOS',
  win32: 'WINDOWS',
  linux: 'LINUX',
  android: 'ANDROID',
  ios: 'IOS',
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

export default function AndroidSyncScreen() {
  const insets = useSafeAreaInsets()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const dispatch = useDispatch()

  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const localPreferences = useSelector(getLocalPreferences)
  const isSynced = localPreferences['isSynced'] === 'true'

  const [tab, setTab] = useState<'link' | 'devices'>('link')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scrollRef = useRef<ScrollView>(null)

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteCode])

  const handleConnect = useCallback(() => {
    if (!pasteCode.trim()) return
    dispatch(subscribePairUser({ invite: pasteCode.trim() } as any))
    setPasteCode('')
  }, [dispatch, pasteCode])

  const handleOpenScanner = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission()
      if (!result.granted) return
    }
    setHasScanned(false)
    setScannerVisible(true)
  }, [cameraPermission?.granted, requestCameraPermission])

  const handleCloseScanner = useCallback(() => {
    setScannerVisible(false)
    setHasScanned(false)
  }, [])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      setHasScanned(true)
      setPasteCode(data.trim())
      setScannerVisible(false)
      setTimeout(() => setHasScanned(false), 500)
    },
    [hasScanned],
  )

  const formatExpiry = useCallback((ts: number | null) => {
    if (!ts) return 'Permanent Link'
    const ms = ts < 10000000000 ? ts * 1000 : ts
    const d = new Date(ms)
    if (isNaN(d.getTime())) return 'Permanent Link'
    return `Expires ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [])

  const handleDeleteDevice = useCallback(
    (deviceKey: string) => {
      Alert.alert(
        'Remove Device?',
        'The device will lose data sync and all data will be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => dispatch(deleteSyncedDevice({ key: deviceKey } as any)),
          },
        ],
      )
    },
    [dispatch],
  )

  const otherDevices = syncedDevices.filter((d: any) => !d.isLocal)
  const localDevices = syncedDevices.filter((d: any) => d.isLocal)

  return (
    <View style={[ss.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[ss.appBar, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={ss.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.primary} />
        </Pressable>
        <Text style={[ss.appBarTitle, { color: c.onSurface }]}>Link and Sync</Text>
      </View>

      <KeyboardAvoidingView behavior="height" style={ss.flex1}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[ss.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(220)} style={ss.segRow}>
            <View style={[ss.segTrack, { backgroundColor: c.surfaceContainer }]}>
              {(['link', 'devices'] as const).map((t) => {
                const active = tab === t
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[ss.segPill, active && { backgroundColor: c.primary }]}
                  >
                    <Text
                      style={[
                        ss.segLabel,
                        { color: active ? c.onPrimary || '#000' : c.onSurfaceVariant },
                      ]}
                    >
                      {t === 'link' ? 'Link Device' : 'My Devices'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>

          {tab === 'link' ? (
            <Animated.View
              key="link-tab"
              entering={FadeIn.duration(220)}
              layout={LinearTransition.springify().damping(20).stiffness(220)}
              style={ss.tabContent}
            >
              {!inviteCode ? (
                <Animated.View entering={FadeInDown.duration(240).delay(40)}>
                  <View style={ss.heroSection}>
                    <View
                      style={[
                        ss.heroCircle,
                        { backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.12) },
                      ]}
                    >
                      <MaterialCommunityIcons name="devices" size={48} color={c.primary} />
                    </View>
                    <View style={[ss.heroBadge, { backgroundColor: c.primary }]}>
                      <MaterialCommunityIcons name="sync" size={18} color={c.onPrimary || '#000'} />
                    </View>
                  </View>

                  <Text style={[ss.heroTitle, { color: c.onSurface }]}>Link Your Devices</Text>
                  <Text style={[ss.heroDesc, { color: c.onSurfaceVariant }]}>
                    Securely extend your digital vault by connecting your laptop, tablet, or phone
                    to your encrypted cloud.
                  </Text>

                  <Pressable
                    onPress={() => dispatch(createInvite())}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      ss.generateBtn,
                      {
                        backgroundColor: c.primary,
                        opacity: isLoading || pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isLoading && <ActivityIndicator size="small" color="#000" style={ss.mr8} />}
                    <Text style={[ss.generateBtnText, { color: c.onPrimary || '#000' }]}>
                      {isLoading ? 'Preparing…' : 'Generate Invite'}
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.duration(240).delay(40)}>
                  <View style={ss.heroSection}>
                    <View
                      style={[
                        ss.heroCircle,
                        { backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.12) },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shield-check-outline"
                        size={48}
                        color={c.primary}
                      />
                    </View>
                  </View>

                  <Text style={[ss.heroTitle, { color: c.onSurface }]}>Invitation Ready</Text>
                  <Text style={[ss.heroDesc, { color: c.onSurfaceVariant }]}>
                    {formatExpiry(expiresAt)}
                  </Text>

                  <View style={ss.qrWrap}>
                    <View style={ss.qrBox}>
                      <QRCode
                        value={inviteCode}
                        size={180}
                        backgroundColor="#FFFFFF"
                        color="#111111"
                      />
                    </View>
                  </View>

                  <Text style={[ss.codeLabelText, { color: c.onSurfaceVariant }]}>
                    SECURE PAIR CODE
                  </Text>
                  <View style={[ss.codeBox, { borderColor: hexWithAlpha(c.outlineVariant, 0.25) }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text selectable style={[ss.codeText, { color: c.onSurface }]}>
                        {inviteCode}
                      </Text>
                    </ScrollView>
                  </View>

                  <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [
                      ss.generateBtn,
                      {
                        backgroundColor: copied ? '#22C55E' : c.primary,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={copied ? 'check' : 'content-copy'}
                      size={18}
                      color={copied ? '#fff' : c.onPrimary || '#000'}
                    />
                    <Text
                      style={[
                        ss.generateBtnText,
                        { color: copied ? '#fff' : c.onPrimary || '#000', marginLeft: 8 },
                      ]}
                    >
                      {copied ? 'Copied!' : 'Copy Invite Code'}
                    </Text>
                  </Pressable>

                  <View
                    style={[
                      ss.warningRow,
                      {
                        backgroundColor: hexWithAlpha(c.primary, 0.08),
                        borderColor: hexWithAlpha(c.primary, 0.2),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={14}
                      color={c.primary}
                      style={{ marginTop: 2 }}
                    />
                    <Text style={[ss.warningText, { color: c.onSurfaceVariant }]}>
                      For security, don't share this code in public channels.
                    </Text>
                  </View>
                </Animated.View>
              )}

              {!isSynced && (
                <Animated.View
                  entering={FadeInDown.duration(220).delay(80)}
                  style={ss.invitePasteSection}
                >
                  <View style={ss.invitePasteHeader}>
                    <View style={ss.invitePasteLeft}>
                      <Text style={[ss.plusIcon, { color: c.primary }]}>+</Text>
                      <Text style={[ss.invitePasteTitle, { color: c.onSurface }]}>
                        Already have an invite?
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleOpenScanner}
                      style={[ss.scanPillSmall, { backgroundColor: hexWithAlpha(c.primary, 0.1) }]}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={14} color={c.primary} />
                      <Text style={[ss.scanPillSmallText, { color: c.primary }]}>Scan QR</Text>
                    </Pressable>
                  </View>

                  <View
                    style={[
                      ss.pasteRow,
                      {
                        backgroundColor: c.surfaceContainer,
                        borderColor: hexWithAlpha(c.outlineVariant, 0.15),
                      },
                    ]}
                  >
                    <TextInput
                      value={pasteCode}
                      onChangeText={setPasteCode}
                      onSubmitEditing={handleConnect}
                      onFocus={() =>
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)
                      }
                      placeholder="Paste invite code here..."
                      placeholderTextColor={hexWithAlpha(c.onSurfaceVariant, 0.4)}
                      style={[ss.pasteInput, { color: c.onSurface }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={handleConnect}
                      disabled={isLoading || pasteCode.trim().length === 0}
                      style={({ pressed }) => [
                        ss.linkPillBtn,
                        {
                          backgroundColor: c.primary,
                          opacity:
                            isLoading || pasteCode.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={[ss.linkPillText, { color: c.onPrimary || '#000' }]}>Link</Text>
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              )}

              <Animated.View entering={FadeIn.duration(220).delay(140)} style={ss.footNoteRow}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={13}
                  color={c.primary}
                  style={{ marginTop: 2 }}
                />
                <Text style={[ss.footNoteText, { color: c.onSurfaceVariant }]}>
                  Your data moves directly between devices using encrypted Hypercore logs. No
                  central server involved.
                </Text>
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View
              key="devices-tab"
              entering={FadeIn.duration(220)}
              layout={LinearTransition.springify().damping(20).stiffness(220)}
              style={ss.tabContent}
            >
              {localDevices.length > 0 && (
                <>
                  <Text style={[ss.sectionCap, { color: hexWithAlpha(c.onSurfaceVariant, 0.6) }]}>
                    THIS DEVICE
                  </Text>
                  {localDevices.map((device: any, index: number) => (
                    <AndroidDeviceCard
                      key={device.key}
                      device={device}
                      isLocal
                      colors={c}
                      index={index}
                      onDelete={handleDeleteDevice}
                    />
                  ))}
                </>
              )}

              <Text
                style={[
                  ss.sectionCap,
                  {
                    color: hexWithAlpha(c.onSurfaceVariant, 0.6),
                    marginTop: localDevices.length > 0 ? 28 : 0,
                  },
                ]}
              >
                OTHER DEVICES
              </Text>

              {otherDevices.length > 0 ? (
                otherDevices.map((device: any, index: number) => (
                  <AndroidDeviceCard
                    key={device.key}
                    device={device}
                    colors={c}
                    index={index}
                    onDelete={handleDeleteDevice}
                  />
                ))
              ) : (
                <Animated.View
                  entering={FadeInDown.duration(220)}
                  style={[ss.emptyCard, { borderColor: hexWithAlpha(c.outlineVariant, 0.15) }]}
                >
                  <MaterialCommunityIcons
                    name="cellphone-link"
                    size={28}
                    color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
                  />
                  <Text style={[ss.emptyText, { color: c.onSurfaceVariant }]}>
                    No other devices connected yet
                  </Text>
                </Animated.View>
              )}

              <View style={ss.encryptedBadgeRow}>
                <View style={[ss.encryptedBadge, { backgroundColor: c.surfaceContainer }]}>
                  <MaterialCommunityIcons name="shield-lock" size={16} color={c.primary} />
                  <Text style={[ss.encryptedText, { color: c.onSurfaceVariant }]}>
                    END-TO-END ENCRYPTED
                  </Text>
                </View>
              </View>

              <Text style={[ss.footerText, { color: hexWithAlpha(c.onSurfaceVariant, 0.5) }]}>
                Only linked devices can decrypt your personal vault data. To remove access, revoke
                the device token immediately from settings.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseScanner}
      >
        <View style={ss.scannerScreen}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
              <View style={ss.scannerOverlay} pointerEvents="none">
                <View style={ss.scannerFrame} />
              </View>
              <View style={[ss.scannerHeader, { paddingTop: insets.top + 16 }]}>
                <Pressable onPress={handleCloseScanner} style={ss.scannerCloseBtn}>
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </Pressable>
              </View>
              <View style={[ss.scannerFooter, { paddingBottom: insets.bottom + 24 }]}>
                <Text style={ss.scannerTitle}>Scan invite QR code</Text>
                <Text style={ss.scannerDesc}>
                  Point your camera at the QR code shown on your other device.
                </Text>
              </View>
            </>
          ) : (
            <View style={ss.permissionCard}>
              <Text style={ss.scannerTitle}>Camera access needed</Text>
              <Text style={ss.scannerDesc}>Allow camera access to scan an invite QR code.</Text>
              <Pressable
                onPress={requestCameraPermission}
                style={({ pressed }) => [
                  ss.permissionBtn,
                  { backgroundColor: c.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[ss.permissionBtnText, { color: c.onPrimary || '#000' }]}>
                  Allow Camera
                </Text>
              </Pressable>
              <Pressable onPress={handleCloseScanner} style={ss.permissionCancelBtn}>
                <Text style={ss.permissionCancelText}>Not now</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

type DeviceCardProps = {
  device: any
  isLocal?: boolean
  colors: ExtendedColors
  index: number
  onDelete: (key: string) => void
}

const AndroidDeviceCard = memo(function AndroidDeviceCard({
  device,
  isLocal,
  colors: c,
  index,
  onDelete,
}: DeviceCardProps) {
  const dispatch = useDispatch()
  const platformLabel =
    PLATFORM_NAMES[device.platform || ''] || device.platform?.toUpperCase() || '—'
  const iconName =
    device.deviceType === 'mobile' || device.platform === 'android' || device.platform === 'ios'
      ? 'cellphone'
      : 'monitor'
  const displayName =
    device.title || (device.key ? `${device.key.slice(0, 6)}…${device.key.slice(-5)}` : 'Unknown')
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  const startEditing = useCallback(() => {
    if (!isLocal) return
    setEditedTitle(device.title || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isLocal, device.title])

  const commitEdit = useCallback(() => {
    const trimmed = editedTitle.trim()
    if (trimmed && trimmed !== device.title) {
      dispatch(updateSyncedDevice({ key: device.key, title: trimmed } as any))
    }
    setIsEditing(false)
  }, [dispatch, editedTitle, device.title, device.key])

  const cancelEdit = useCallback(() => {
    setEditedTitle(device.title || '')
    setIsEditing(false)
  }, [device.title])

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(Math.min(index, 6) * 40)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <Pressable
        onPress={!isLocal ? undefined : startEditing}
        style={({ pressed }) => [
          ds.card,
          { backgroundColor: c.surfaceContainer },
          pressed && {
            backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.6),
          },
        ]}
      >
        <View style={[ds.iconCircle, { backgroundColor: hexWithAlpha(c.primary, 0.12) }]}>
          <MaterialCommunityIcons name={iconName} size={22} color={c.primary} />
          {device.isLocal && <View style={ds.onlineDot} />}
        </View>

        <View style={ds.info}>
          {isEditing ? (
            <TextInput
              ref={inputRef}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              style={[
                ds.renameInput,
                {
                  color: c.onSurface,
                  borderColor: c.primary,
                  backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
                },
              ]}
              returnKeyType="done"
              autoCapitalize="words"
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Escape') cancelEdit()
              }}
            />
          ) : (
            <Text style={[ds.name, { color: c.onSurface }]} numberOfLines={1}>
              {displayName}
            </Text>
          )}
          <Text style={[ds.platform, { color: c.onSurfaceVariant }]}>
            {platformLabel}
            {isLocal && !isEditing && (
              <Text style={[ds.tapToRename, { color: hexWithAlpha(c.primary, 0.6) }]}>
                {' · Tap to rename'}
              </Text>
            )}
          </Text>
        </View>

        {!isLocal && (
          <Pressable onPress={() => onDelete(device.key)} hitSlop={12} style={ds.deleteBtn}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={c.error} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  )
})

const ss = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 9999,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  segRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  segTrack: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 4,
    width: '100%',
  },
  segPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  tabContent: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 0,
    right: '33%',
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  generateBtn: {
    borderRadius: 9999,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginBottom: 12,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mr8: { marginRight: 8 },
  scanBtn: {
    borderRadius: 9999,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    marginBottom: 24,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.5,
  },
  pasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pasteInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    paddingVertical: 10,
  },
  linkPillBtn: {
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  linkPillText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  qrWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrBox: {
    width: 200,
    height: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  codeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  codeBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 1,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  invitePasteSection: {
    marginTop: 28,
  },
  invitePasteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  invitePasteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plusIcon: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  invitePasteTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  scanPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  scanPillSmallText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  footNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
  },
  footNoteText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  sectionCap: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  encryptedBadgeRow: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  encryptedText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.5,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  scannerScreen: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scannerFrame: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  scannerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scannerCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scannerFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 8,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
    color: '#fff',
  },
  scannerDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  permissionBtn: {
    marginTop: 8,
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  permissionCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionCancelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
})

const ds = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 9999,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#121212',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  platform: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tapToRename: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0,
  },
  renameInput: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 2,
  },
  deleteBtn: {
    padding: 6,
  },
})
