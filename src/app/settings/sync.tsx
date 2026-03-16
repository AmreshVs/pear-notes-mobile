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
import { BlurView } from 'expo-blur'
import * as Clipboard from 'expo-clipboard'
import {
  Check,
  Globe,
  Link2,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react-native'
import React, { memo, useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { Text, Theme, useTheme, useThemedStyles } from '@/components/Themed'

const PLATFORM_NAMES: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
}

export default function SyncScreen() {
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

  const formatExpiry = useCallback((ts: number | null) => {
    if (!ts) return 'Permanent Link'
    const ms = ts < 10000000000 ? ts * 1000 : ts
    const d = new Date(ms)
    if (isNaN(d.getTime())) return 'Permanent Link'
    return `Expires ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [])

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <RNView style={styles.segRow}>
        {(['link', 'devices'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segPill, active && styles.segPillActive]}
            >
              <Text
                style={[styles.segLabel, active ? styles.segLabelActive : styles.segLabelInactive]}
              >
                {t === 'link' ? 'Link Device' : 'My Devices'}
              </Text>
            </Pressable>
          )
        })}
      </RNView>

      {tab === 'link' ? (
        <RNView style={styles.pad}>
          <RNView style={styles.heroCard}>
            {!inviteCode ? (
              <>
                <RNView style={styles.iconRing}>
                  <Globe size={26} color={colors.primary} strokeWidth={1.5} />
                </RNView>

                <Text style={styles.heroTitle}>Link Your Devices</Text>
                <Text style={styles.heroDesc}>
                  Create a secure, end-to-end encrypted connection to sync your notes across devices
                  instantly.
                </Text>

                <Pressable
                  onPress={() => dispatch(createInvite())}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.generateBtn,
                    { backgroundColor: colors.primary, opacity: isLoading || pressed ? 0.7 : 1 },
                  ]}
                >
                  {isLoading && (
                    <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.btnText}>{isLoading ? 'Preparing…' : 'Generate Invite'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <RNView style={styles.inviteHeader}>
                  <RNView style={styles.iconPill}>
                    <ShieldCheck size={18} color={colors.primary} strokeWidth={1.5} />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={styles.inviteTitle}>Invitation Ready</Text>
                    <Text style={styles.inviteSub}>{formatExpiry(expiresAt)}</Text>
                  </RNView>
                </RNView>

                <Text style={styles.codeLabel}>SECURE PAIR CODE</Text>

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
                  <Text style={[styles.btnText, copied && { color: '#fff' }]}>
                    {copied ? 'Copied!' : 'Copy Invite Code'}
                  </Text>
                </Pressable>
              </>
            )}
          </RNView>

          {inviteCode && (
            <RNView style={styles.warningCard}>
              <ShieldCheck
                size={14}
                color={colors.primary}
                strokeWidth={1.8}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.warningText}>
                For security, don't share this code in public channels as it grants full access to
                your notes.
              </Text>
            </RNView>
          )}

          {!isSynced && (
            <RNView style={{ marginBottom: 24 }}>
              <RNView style={styles.invitePasteHeader}>
                <Text style={styles.plusIcon}>+</Text>
                <Text style={styles.invitePasteText}>Already have an invite?</Text>
              </RNView>

              <RNView style={styles.inputRow}>
                <TextInput
                  value={pasteCode}
                  onChangeText={setPasteCode}
                  onSubmitEditing={handleConnect}
                  placeholder="Paste invite code here..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.codeInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={handleConnect}
                  disabled={isLoading || pasteCode.trim().length === 0}
                  style={({ pressed }) => [
                    styles.linkBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: isLoading || pasteCode.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.linkBtnText}>Link</Text>
                  )}
                </Pressable>
              </RNView>
            </RNView>
          )}

          <RNView style={styles.footNoteRow}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.footNote}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      ) : (
        <RNView style={styles.pad}>
          <Text style={styles.sectionCap}>THIS DEVICE</Text>

          <RNView style={styles.deviceGroup}>
            {syncedDevices
              .filter((d: any) => d.isLocal)
              .map((device: any, index: number, arr: any[]) => (
                <DeviceCard key={device.key} device={device} showSep={index < arr.length - 1} />
              ))}
          </RNView>

          <Text style={styles.sectionCapDevice}>OTHER DEVICES</Text>

          {syncedDevices.filter((d: any) => !d.isLocal).length > 0 ? (
            <RNView style={styles.deviceGroup}>
              {syncedDevices
                .filter((d: any) => !d.isLocal)
                .map((device: any, index: number, arr: any[]) => (
                  <DeviceCard
                    key={device.key}
                    device={device}
                    isOther
                    showSep={index < arr.length - 1}
                  />
                ))}
            </RNView>
          ) : (
            <RNView style={styles.emptyCard}>
              <Smartphone size={22} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No other devices connected yet.</Text>
            </RNView>
          )}

          <RNView style={styles.footNoteRowDevice}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.footNote}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      )}
    </ScrollView>
  )
}

const DeviceCard = memo(function DeviceCard({
  device,
  isOther,
  showSep,
}: {
  device: any
  isOther?: boolean
  showSep: boolean
}) {
  const theme = useTheme()
  const { colors } = theme
  const styles = useThemedStyles(createStyles)
  const dispatch = useDispatch()
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
      <RNView>
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
                  {device.title || device.key || 'Unknown Device'}
                </Text>
              </Pressable>
            )}
            <Text style={styles.deviceSub}>
              {PLATFORM_NAMES[device.platform || ''] || device.platform || '—'}
              {!isOther && !isEditing && <Text style={styles.tapToRename}> · Tap to rename</Text>}
            </Text>
          </RNView>

          {isOther && (
            <Pressable
              onPress={openDeleteModal}
              hitSlop={12}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            >
              <Trash2 size={17} color={colors.error} strokeWidth={1.5} />
            </Pressable>
          )}
        </RNView>

        {showSep && <RNView style={styles.deviceSep} />}
      </RNView>

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
        <RNView style={styles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={styles.modalCard}>
            <RNView style={styles.modalInner}>
              <RNView style={styles.dangerIcon}>
                <ShieldAlert size={40} color={colors.error} />
              </RNView>

              <Text style={styles.modalTitle}>Remove Device?</Text>
              <Text style={styles.modalSub}>
                The device will lose the data sync and all data will be removed from that device.
              </Text>

              <RNView style={styles.modalRow}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.cancelBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.removeBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.removeText}>Remove</Text>
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
    scroll: { paddingBottom: 80 },

    segRow: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 3,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 28,
      alignSelf: 'center',
      width: 264,
      backgroundColor: segBg,
    },
    segPill: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    segLabel: { fontSize: 13, fontWeight: '500' },
    segLabelActive: { color: isDark ? '#000000' : '#ffffff', fontWeight: '700' },
    segLabelInactive: { color: textMuted },

    pad: { paddingHorizontal: 20 },

    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
      alignItems: 'center',
      marginBottom: 16,
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
      fontWeight: '700',
      letterSpacing: -0.5,
      marginBottom: 10,
      textAlign: 'center',
      color: theme.colors.text,
    },
    heroDesc: {
      fontSize: 14,
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
    btnText: { color: '#000000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      width: '100%',
      paddingBottom: 16,
    },
    iconPill: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)',
    },
    inviteTitle: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.3,
      marginBottom: 2,
      color: theme.colors.text,
    },
    inviteSub: { fontSize: 12, fontWeight: '500', color: textMuted },
    codeLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingTop: 14,
      paddingBottom: 10,
      width: '100%',
      color: textMuted,
      borderTopColor: cardBorder,
      borderTopWidth: 1,
    },
    codeBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 15,
      paddingHorizontal: 12,
      width: '100%',
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
    },
    codeScrollContent: { paddingHorizontal: 2 },
    codeText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
      fontSize: 13,
      letterSpacing: 1,
      color: theme.colors.text,
    },
    copyBtn: {
      borderRadius: 14,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      marginTop: 12,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
      backgroundColor: isDark ? 'rgba(220,163,35,0.07)' : 'rgba(220,163,35,0.08)',
      borderColor: isDark ? 'rgba(220,163,35,0.2)' : 'rgba(220,163,35,0.25)',
    },
    warningText: { flex: 1, fontSize: 12, lineHeight: 17, color: textMuted },
    invitePasteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
    plusIcon: { fontSize: 18, fontWeight: '600', lineHeight: 20, color: theme.colors.primary },
    invitePasteText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 16,
      paddingLeft: 16,
      paddingRight: 8,
      paddingVertical: 6,
      gap: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
    },
    codeInput: { flex: 1, fontSize: 14, paddingVertical: 9, color: theme.colors.text },
    linkBtn: {
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    linkBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
    footNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    footNoteRowDevice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 32 },
    footNote: { fontSize: 12, flex: 1, lineHeight: 17, color: textMuted },

    sectionCap: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 12,
      textTransform: 'uppercase',
      color: textMuted,
    },
    sectionCapDevice: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 12,
      textTransform: 'uppercase',
      color: textMuted,
      marginTop: 30,
    },

    deviceGroup: {
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 8,
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
      width: 44,
      height: 44,
      borderRadius: 12,
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
      fontWeight: '600',
      letterSpacing: -0.3,
      marginBottom: 3,
      color: theme.colors.text,
    },
    deviceSub: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      fontWeight: '500',
      color: textMuted,
    },
    tapToRename: {
      color: `${theme.colors.primary}80`,
    },
    renameInput: {
      fontSize: 15,
      fontWeight: '600',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 2,
      color: theme.colors.text,
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    },
    deviceSep: {
      height: 1,
      backgroundColor: cardBorder,
      marginLeft: 70,
    },
    emptyCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 16,
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    emptyText: { fontSize: 13, marginTop: 10, color: textMuted },

    modalFill: {
      ...StyleSheet.absoluteFillObject,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 384,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 20,
    },
    modalInner: { padding: 40, alignItems: 'center', width: '100%' },
    dangerIcon: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.4,
      marginBottom: 8,
      marginTop: 4,
      color: theme.colors.text,
    },
    modalSub: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: 28,
      maxWidth: 280,
      color: theme.colors.text,
    },
    modalRow: { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtn: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    cancelText: { color: textMuted, fontWeight: '700', fontSize: 14 },
    removeBtn: {
      backgroundColor: '#EF4444',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    removeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    deleteBtn: {
      padding: 4,
    },
    pressed: {
      opacity: 0.5,
    },
  })
}
