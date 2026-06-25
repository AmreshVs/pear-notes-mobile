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
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'
import { BlurView } from 'expo-blur'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import {
  Check,
  Globe,
  Link2,
  Monitor,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react-native'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Reanimated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { Text, Theme, useTheme, useThemedStyles } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  MonoFontFamily,
  Radii,
  Space,
  commonStyles,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

const GET_PLATFORM_NAMES = (t: any): Record<string, string> => ({
  darwin: t('sync.platforms.macOS'),
  win32: t('sync.platforms.Windows'),
  linux: t('sync.platforms.Linux'),
  android: t('sync.platforms.Android'),
  ios: t('sync.platforms.iOS'),
})

export default function SyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useThemedStyles(createStyles)
  const dispatch = useDispatch()

  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices)
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
    if (isValidInvite(pasteCode)) {
      const rawInvite = extractInvite(pasteCode)
      dispatch(subscribePairUser({ invite: rawInvite } as any))
      setPasteCode('')
    }
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

  const formatExpiry = useCallback(
    (ts: number | null) => {
      if (!ts) return t('sync.invite.permanent')
      const ms = ts < 10000000000 ? ts * 1000 : ts
      const d = new Date(ms)
      if (isNaN(d.getTime())) return t('sync.invite.permanent')
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return t('sync.invite.expiry', { time: timeStr })
    },
    [t],
  )

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
          {(['link', 'devices'] as const).map((tabKey) => {
            const active = tab === tabKey
            return (
              <Pressable
                key={tabKey}
                onPress={() => setTab(tabKey)}
                style={[styles.segPill, active && styles.segPillActive]}
              >
                <Text
                  style={[
                    styles.segLabel,
                    active ? styles.segLabelActive : styles.segLabelInactive,
                  ]}
                >
                  {tabKey === 'link' ? t('sync.tabs.link') : t('sync.tabs.devices')}
                </Text>
              </Pressable>
            )
          })}
        </Reanimated.View>

        {tab === 'link' ? (
          <Reanimated.View
            key="link-tab"
            entering={FadeIn.duration(220)}
            layout={LinearTransition.springify().damping(20).stiffness(220)}
            style={styles.pad}
          >
            <Reanimated.View entering={FadeInDown.duration(240).delay(40)} style={styles.heroCard}>
              {!inviteCode ? (
                <>
                  <RNView style={styles.iconRing}>
                    <Globe size={26} color={colors.primary} strokeWidth={1.5} />
                  </RNView>

                  <Text style={styles.heroTitle}>{t('sync.hero.title')}</Text>
                  <Text style={styles.heroDesc}>{t('sync.hero.description')}</Text>

                  <Pressable
                    onPress={() => dispatch(createInvite())}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.generateBtn,
                      { backgroundColor: colors.primary, opacity: isLoading || pressed ? 0.7 : 1 },
                    ]}
                  >
                    {isLoading && (
                      <ActivityIndicator size="small" color="#000" style={styles.indicatorMargin} />
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
                      <ShieldCheck size={18} color={colors.primary} strokeWidth={1.5} />
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
                          size={184}
                          backgroundColor="#FFFFFF"
                          color="#111111"
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
                      {
                        backgroundColor: copied ? '#22C55E' : colors.primary,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {copied ? (
                      <Check size={16} color="#fff" strokeWidth={2.5} />
                    ) : (
                      <Link2 size={16} color="#000" strokeWidth={2.2} />
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
                  size={14}
                  color={colors.primary}
                  strokeWidth={1.8}
                  style={styles.iconTopFix}
                />
                <Text style={styles.warningText}>{t('sync.invite.warning')}</Text>
              </Reanimated.View>
            )}

            {!isSynced && (
              <Reanimated.View
                entering={FadeInDown.duration(220).delay(110)}
                style={styles.invitePasteSection}
              >
                <RNView style={[styles.invitePasteHeader, { justifyContent: 'space-between' }]}>
                  <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.plusIcon}>+</Text>
                    <Text style={styles.invitePasteText}>{t('sync.paste.header')}</Text>
                  </RNView>
                  <Pressable onPress={handleOpenScanner} style={styles.scanPillBtn}>
                    <ScanLine size={16} color={colors.primary} />
                    <Text style={styles.scanPillBtnText}>{t('sync.paste.scanBtn')}</Text>
                  </Pressable>
                </RNView>

                <RNView style={styles.inputRow}>
                  <TextInput
                    value={pasteCode}
                    onChangeText={setPasteCode}
                    onSubmitEditing={handleConnect}
                    onFocus={() =>
                      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)
                    }
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
                      {
                        backgroundColor: colors.primary,
                        opacity: isLoading || !isValidInvite(pasteCode) ? 0.4 : pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.linkBtnText}>{t('sync.paste.linkBtn')}</Text>
                    )}
                  </Pressable>
                </RNView>
              </Reanimated.View>
            )}

            <Reanimated.View entering={FadeIn.duration(220).delay(140)} style={styles.footNoteRow}>
              <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.footNote}>{t('sync.footer')}</Text>
            </Reanimated.View>
          </Reanimated.View>
        ) : (
          <Reanimated.View
            key="devices-tab"
            entering={FadeIn.duration(220)}
            layout={LinearTransition.springify().damping(20).stiffness(220)}
            style={styles.pad}
          >
            <Reanimated.View entering={FadeIn.duration(200)}>
              <Text style={styles.sectionCap}>{t('sync.devices.thisDevice')}</Text>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.duration(220).delay(30)}
              style={styles.deviceGroup}
            >
              {syncedDevices
                .filter((d: any) => d.isLocal)
                .map((device: any, index: number, arr: any[]) => (
                  <DeviceCard
                    key={device.key}
                    device={device}
                    showSep={index < arr.length - 1}
                    animationIndex={index}
                  />
                ))}
            </Reanimated.View>

            <Reanimated.View entering={FadeIn.duration(200).delay(70)}>
              <Text style={styles.sectionCapDevice}>{t('sync.devices.otherDevices')}</Text>
            </Reanimated.View>

            {syncedDevices.filter((d: any) => !d.isLocal).length > 0 ? (
              <Reanimated.View
                entering={FadeInDown.duration(220).delay(100)}
                style={styles.deviceGroup}
              >
                {syncedDevices
                  .filter((d: any) => !d.isLocal)
                  .map((device: any, index: number, arr: any[]) => (
                    <DeviceCard
                      key={device.key}
                      device={device}
                      isOther
                      showSep={index < arr.length - 1}
                      animationIndex={index + 1}
                    />
                  ))}
              </Reanimated.View>
            ) : (
              <Reanimated.View
                entering={FadeInDown.duration(220).delay(100)}
                style={styles.emptyCard}
              >
                <Smartphone size={22} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
              </Reanimated.View>
            )}

            <Reanimated.View
              entering={FadeIn.duration(220).delay(140)}
              style={styles.footNoteRowDevice}
            >
              <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.footNote}>
                Your data moves directly between devices using encrypted Hypercore logs. No central
                server involved.
              </Text>
            </Reanimated.View>
          </Reanimated.View>
        )}
      </ScrollView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseScanner}
      >
        <RNView style={styles.scannerScreen}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
              <RNView style={styles.scannerOverlay} pointerEvents="none">
                <RNView style={styles.scannerFrame} />
              </RNView>
              <RNView style={styles.scannerHeader}>
                <Pressable onPress={handleCloseScanner} style={styles.scannerCloseBtn}>
                  <X size={20} color="#fff" strokeWidth={2.2} />
                </Pressable>
              </RNView>
              <RNView style={styles.scannerFooter}>
                <Text style={styles.scannerTitle}>{t('sync.scanner.title')}</Text>
                <Text style={styles.scannerDescription}>{t('sync.scanner.description')}</Text>
              </RNView>
            </>
          ) : (
            <RNView style={styles.scannerPermissionCard}>
              <Text style={styles.scannerTitle}>{t('sync.permissions.cameraTitle')}</Text>
              <Text style={styles.scannerDescription}>
                {t('sync.permissions.cameraDescription')}
              </Text>
              <Pressable
                onPress={requestCameraPermission}
                style={({ pressed }) => [
                  styles.permissionBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.permissionBtnText}>{t('sync.permissions.allowBtn')}</Text>
              </Pressable>
              <Pressable onPress={handleCloseScanner} style={styles.permissionCancelBtn}>
                <Text style={styles.permissionCancelText}>{t('sync.permissions.cancelBtn')}</Text>
              </Pressable>
            </RNView>
          )}
        </RNView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const DeviceCard = memo(function DeviceCard({
  device,
  isOther,
  showSep,
  animationIndex = 0,
}: {
  device: any
  isOther?: boolean
  showSep: boolean
  animationIndex?: number
}) {
  const theme = useTheme()
  const { colors } = theme
  const styles = useThemedStyles(createStyles)
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone

  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true)
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
  }, [fadeAnim])

  const closeDeleteModal = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setShowDeleteModal(false),
    )
  }, [fadeAnim])

  const confirmDelete = useCallback(() => {
    dispatch(deleteSyncedDevice({ key: device.key } as any))
    setShowDeleteModal(false)
  }, [dispatch, device.key])

  const startEditing = useCallback(() => {
    if (isOther) return
    setEditedTitle(device.title || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOther, device.title])

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
    <>
      <Reanimated.View
        entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
        layout={LinearTransition.springify().damping(20).stiffness(220)}
      >
        <RNView style={styles.deviceRow}>
          <RNView style={styles.deviceIcon}>
            <Icon size={18} color={colors.primary} strokeWidth={1.5} />
            {device.isLocal && <RNView style={styles.onlineDot} />}
          </RNView>

          <RNView style={{ flex: 1 }}>
            {isEditing ? (
              <TextInput
                ref={inputRef}
                value={editedTitle}
                onChangeText={setEditedTitle}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                style={styles.renameInput}
                returnKeyType="done"
                autoCapitalize="words"
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Escape') cancelEdit()
                }}
              />
            ) : (
              <Pressable onPress={!isOther ? startEditing : undefined}>
                <Text numberOfLines={1} style={styles.deviceName}>
                  {device.title || device.key || t('sync.platforms.unknown')}
                </Text>
              </Pressable>
            )}
            <Text style={styles.deviceSub}>
              {GET_PLATFORM_NAMES(t)[device.platform || ''] || device.platform || '—'}
              {!isOther && !isEditing && (
                <Text style={styles.tapToRename}>{t('sync.platforms.renameHint')}</Text>
              )}
            </Text>
          </RNView>

          {isOther && (
            <Pressable
              onPress={openDeleteModal}
              hitSlop={12}
              style={({ pressed }) => [styles.deleteBtn, pressed && commonStyles.pressed]}
            >
              <Trash2 size={17} color={colors.error} strokeWidth={1.5} />
            </Pressable>
          )}
        </RNView>

        {showSep && <RNView style={styles.deviceSep} />}
      </Reanimated.View>

      <DeleteModal
        visible={showDeleteModal}
        device={device}
        fadeAnim={fadeAnim}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </>
  )
})

const DeleteModal = memo(function DeleteModal({
  visible,
  fadeAnim,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  device: any
  fadeAnim: Animated.Value
  onCancel: () => void
  onConfirm: () => void
}) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)
  const commonThemedStyles = useCommonThemedStyles()
  const { t } = useTranslation()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.modalFill, { opacity: fadeAnim }]}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={commonStyles.modalCard}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.dangerIcon}>
                <ShieldAlert size={40} color={colors.error} />
              </RNView>

              <Text style={styles.modalTitle}>{t('sync.delete.title')}</Text>
              <Text style={styles.modalSub}>{t('sync.delete.description')}</Text>

              <RNView style={styles.modalRow}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    commonThemedStyles.cancelBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>{t('sync.delete.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.removeBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.removeText}>{t('sync.delete.remove')}</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </Animated.View>
    </Modal>
  )
})

const createStyles = (theme: Theme) => {
  const isDark = theme.isDark
  const textMuted = theme.colors.textMuted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'
  const cardBorder = theme.colors.borderSecondary
  const segBg = theme.colors.controlBackground

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { paddingBottom: Space.huge },

    segRow: {
      flexDirection: 'row',
      borderRadius: Radii.lg,
      padding: 3,
      marginHorizontal: Space.lg,
      marginTop: Space.md,
      marginBottom: 28,
      alignSelf: 'center',
      width: 264,
      backgroundColor: segBg,
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
    segLabel: { fontSize: FontSize.small, fontWeight: FontWeight.medium },
    segLabelActive: { color: '#ffffff', fontWeight: FontWeight.bold },
    segLabelInactive: { color: textMuted },

    pad: { paddingHorizontal: Space.lg },

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
      backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)',
    },
    heroTitle: {
      fontSize: 21,
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
      color: textMuted,
    },
    generateBtn: {
      borderRadius: 14,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 17,
    },
    btnText: {
      color: '#ffffff',
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.2,
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
      backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)',
    },
    inviteTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.3,
      marginBottom: 2,
      color: theme.colors.text,
    },
    inviteSub: { fontSize: FontSize.small, fontWeight: FontWeight.medium, color: textMuted },
    codeLabel: {
      fontSize: FontSize.micro,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingTop: 14,
      paddingBottom: Space.md,
      width: '100%',
      color: textMuted,
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
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
    },
    codeScrollContent: { paddingHorizontal: 2 },
    codeText: {
      fontFamily: MonoFontFamily,
      fontSize: FontSize.small,
      letterSpacing: 1,
      color: theme.colors.text,
    },
    qrSection: {
      width: '100%',
      alignItems: 'center',
      marginBottom: Space.md,
    },
    qrImageWrap: {
      width: 200,
      height: 200,
      borderRadius: Radii.md,
      marginBottom: Space.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    qrTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      marginBottom: Space.xs,
      color: theme.colors.text,
    },
    qrDescription: {
      fontSize: FontSize.small,
      lineHeight: 18,
      textAlign: 'center',
      color: textMuted,
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
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      borderWidth: 1,
      borderRadius: Radii.md,
      padding: 14,
      marginBottom: Space.xl,
      backgroundColor: isDark ? 'rgba(220,163,35,0.07)' : 'rgba(220,163,35,0.08)',
      borderColor: isDark ? 'rgba(220,163,35,0.2)' : 'rgba(220,163,35,0.25)',
    },
    warningText: { flex: 1, fontSize: FontSize.small, lineHeight: 17, color: textMuted },
    invitePasteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
    plusIcon: {
      fontSize: 18,
      fontWeight: FontWeight.semibold,
      lineHeight: 20,
      color: theme.colors.primary,
    },
    invitePasteText: { fontSize: 15, fontWeight: FontWeight.semibold, color: theme.colors.text },
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
    codeInput: { flex: 1, fontSize: FontSize.body, paddingVertical: 9, color: theme.colors.text },
    scanPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: `${theme.colors.primary}1A`,
    },
    scanPillBtnText: {
      fontSize: FontSize.micro,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    linkBtn: {
      borderRadius: Space.md,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    linkBtnText: { color: '#000', fontSize: FontSize.body, fontWeight: FontWeight.bold },
    footNoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      marginTop: Space.xl,
    },
    footNoteRowDevice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      marginTop: Space.xxl,
    },
    footNote: { fontSize: FontSize.small, flex: 1, lineHeight: 17, color: textMuted },

    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      textTransform: 'uppercase',
      color: textMuted,
    },
    sectionCapDevice: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      marginTop: Space.lg,
      textTransform: 'uppercase',
      color: textMuted,
    },

    deviceGroup: {
      borderRadius: Radii.card,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: Space.sm,
      backgroundColor: cardBg,
      borderColor: cardBorder,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    deviceIcon: {
      width: Space.huge,
      height: Space.huge,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: isDark ? 'rgba(220,163,35,0.1)' : 'rgba(220,163,35,0.08)',
    },
    onlineDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: '#22C55E',
      borderWidth: 2,
      borderColor: cardBg,
    },
    deviceName: {
      fontSize: 15,
      fontWeight: FontWeight.semibold,
      letterSpacing: -0.3,
      marginBottom: 3,
      color: theme.colors.text,
    },
    deviceSub: {
      fontSize: FontSize.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      fontWeight: FontWeight.medium,
      color: textMuted,
    },
    tapToRename: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      textTransform: 'none',
      letterSpacing: 0,
      color: `${theme.colors.primary}90`,
    },
    renameInput: {
      fontSize: 15,
      fontWeight: FontWeight.semibold,
      borderWidth: 1,
      borderRadius: Radii.sm,
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      marginBottom: 2,
      color: theme.colors.text,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputBackground,
    },
    deviceSep: {
      height: 1,
      backgroundColor: cardBorder,
      marginLeft: 70,
    },
    emptyCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: Space.base,
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    emptyText: { fontSize: FontSize.small, marginTop: Space.md, color: textMuted },

    scannerScreen: {
      flex: 1,
      backgroundColor: '#000',
    },
    scannerOverlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    scannerFrame: {
      width: '100%',
      maxWidth: 280,
      maxHeight: 280,
      aspectRatio: 1,
      borderRadius: Radii.card,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.92)',
      backgroundColor: 'transparent',
    },
    scannerHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 56,
      paddingHorizontal: Space.lg,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    scannerCloseBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scannerFooter: {
      position: 'absolute',
      left: Space.lg,
      right: Space.lg,
      bottom: 56,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.lg,
      borderRadius: Radii.card,
      backgroundColor: 'rgba(0,0,0,0.55)',
      gap: Space.sm,
    },
    scannerPermissionCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Space.xl,
      gap: Space.md,
    },
    scannerTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      color: '#fff',
    },
    scannerDescription: {
      fontSize: FontSize.body,
      lineHeight: 21,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.82)',
    },
    permissionBtn: {
      marginTop: Space.sm,
      borderRadius: Radii.md,
      paddingHorizontal: Space.xl,
      paddingVertical: Space.base,
    },
    permissionBtnText: {
      color: '#000',
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
    },
    permissionCancelBtn: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
    },
    permissionCancelText: {
      fontSize: FontSize.body,
      color: 'rgba(255,255,255,0.72)',
    },

    modalFill: {
      ...StyleSheet.absoluteFill,
    },
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    // modalCard, modalInner, modalOverlay → use common.*
    modalBtn: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerIcon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    modalTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: LetterSpacing.tight,
      marginBottom: Space.sm,
      marginTop: Space.xs,
      color: theme.colors.text,
    },
    modalSub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: 28,
      maxWidth: 280,
      color: theme.colors.text,
    },
    modalRow: { flexDirection: 'row', gap: Space.md, width: '100%' },
    cancelText: { color: textMuted, fontWeight: FontWeight.bold, fontSize: FontSize.body },
    removeBtn: {
      backgroundColor: '#EF4444',
    },
    removeText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: 15 },
    deleteBtn: {
      padding: Space.xs,
    },
    indicatorMargin: {
      marginRight: Space.sm,
    },
    iconTopFix: {
      marginTop: 1,
    },
    invitePasteSection: {
      marginBottom: Space.xl,
    },
    btnTextCopied: {
      color: '#fff',
    },
  })
}
