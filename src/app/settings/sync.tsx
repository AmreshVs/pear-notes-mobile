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
import React, { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
  ScrollView,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { Text, useTheme } from '@/components/Themed'

const PLATFORM_NAMES: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
}

export default function SyncScreen() {
  const { isDark, colors } = useTheme()
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

  const pageBg = colors.background
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const text = colors.text
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const segBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const handleCopy = async () => {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = () => {
    if (!pasteCode.trim()) return
    dispatch(subscribePairUser({ invite: pasteCode.trim() } as any))
    setPasteCode('')
  }

  const formatExpiry = (ts: number | null) => {
    if (!ts) return 'Permanent Link'
    const ms = ts < 10000000000 ? ts * 1000 : ts
    const d = new Date(ms)
    if (isNaN(d.getTime())) return 'Permanent Link'
    return `Expires ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: pageBg }}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Segmented Control ─────────────────────── */}
      <RNView style={[st.segRow, { backgroundColor: segBg }]}>
        {(['link', 'devices'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                st.segPill,
                active && {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 4,
                },
              ]}
            >
              <Text
                style={[
                  st.segLabel,
                  { color: active ? '#000000' : textMuted },
                  active && { fontWeight: '700' },
                ]}
              >
                {t === 'link' ? 'Link Device' : 'My Devices'}
              </Text>
            </Pressable>
          )
        })}
      </RNView>

      {tab === 'link' ? (
        <RNView style={st.pad}>
          {/* ── Hero invite card ──────────────────── */}
          <RNView style={[st.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {!inviteCode ? (
              <>
                <RNView
                  style={[
                    st.iconRing,
                    { backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)' },
                  ]}
                >
                  <Globe size={26} color={colors.primary} strokeWidth={1.5} />
                </RNView>

                <Text style={[st.heroTitle, { color: text }]}>Link Your Devices</Text>
                <Text style={[st.heroDesc, { color: textMuted }]}>
                  Create a secure, end-to-end encrypted connection to sync your notes across devices
                  instantly.
                </Text>

                <Pressable
                  onPress={() => dispatch(createInvite())}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 17,
                    opacity: isLoading || pressed ? 0.7 : 1,
                  })}
                >
                  {isLoading && (
                    <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
                  )}
                  <Text style={st.btnText}>{isLoading ? 'Preparing…' : 'Generate Invite'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <RNView style={st.inviteHeader}>
                  <RNView
                    style={[
                      st.iconPill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(220,163,35,0.13)'
                          : 'rgba(220,163,35,0.1)',
                      },
                    ]}
                  >
                    <ShieldCheck size={18} color={colors.primary} strokeWidth={1.5} />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={[st.inviteTitle, { color: text }]}>Invitation Ready</Text>
                    <Text style={[st.inviteSub, { color: textMuted }]}>
                      {formatExpiry(expiresAt)}
                    </Text>
                  </RNView>
                </RNView>

                <Text
                  style={[
                    st.codeLabel,
                    { color: textMuted, borderTopColor: cardBorder, borderTopWidth: 1 },
                  ]}
                >
                  SECURE PAIR CODE
                </Text>

                <RNView
                  style={[
                    st.codeBox,
                    { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 2 }}
                  >
                    <Text selectable style={[st.codeText, { color: text }]}>
                      {inviteCode}
                    </Text>
                  </ScrollView>
                </RNView>

                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => ({
                    backgroundColor: copied ? '#22C55E' : colors.primary,
                    borderRadius: 14,
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 16,
                    marginTop: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {copied ? (
                    <Check size={16} color="#fff" strokeWidth={2.5} />
                  ) : (
                    <Link2 size={16} color="#000" strokeWidth={2.2} />
                  )}
                  <Text style={[st.btnText, copied && { color: '#fff' }]}>
                    {copied ? 'Copied!' : 'Copy Invite Code'}
                  </Text>
                </Pressable>
              </>
            )}
          </RNView>

          {/* Security notice */}
          {inviteCode && (
            <RNView
              style={[
                st.warningCard,
                {
                  backgroundColor: isDark ? 'rgba(220,163,35,0.07)' : 'rgba(220,163,35,0.08)',
                  borderColor: isDark ? 'rgba(220,163,35,0.2)' : 'rgba(220,163,35,0.25)',
                },
              ]}
            >
              <ShieldCheck
                size={14}
                color={colors.primary}
                strokeWidth={1.8}
                style={{ marginTop: 1 }}
              />
              <Text style={[st.warningText, { color: textMuted }]}>
                For security, don't share this code in public channels as it grants full access to
                your notes.
              </Text>
            </RNView>
          )}

          {/* ── Paste existing invite ──────────────── */}
          {!isSynced && (
            <RNView style={{ marginBottom: 24 }}>
              <RNView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '600', lineHeight: 20 }}>
                  +
                </Text>
                <Text style={{ color: text, fontSize: 15, fontWeight: '600' }}>
                  Already have an invite?
                </Text>
              </RNView>

              <RNView
                style={[
                  st.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
                  },
                ]}
              >
                <TextInput
                  value={pasteCode}
                  onChangeText={setPasteCode}
                  onSubmitEditing={handleConnect}
                  placeholder="Paste invite code here..."
                  placeholderTextColor={textMuted}
                  style={[st.codeInput, { color: text }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={handleConnect}
                  disabled={isLoading || pasteCode.trim().length === 0}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    opacity: isLoading || pasteCode.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={{ color: '#000', fontSize: 14, fontWeight: '700' }}>Link</Text>
                  )}
                </Pressable>
              </RNView>
            </RNView>
          )}

          {/* Footer */}
          <RNView style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[st.footNote, { color: textMuted }]}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      ) : (
        <RNView style={st.pad}>
          <Text style={[st.sectionCap, { color: textMuted }]}>THIS DEVICE</Text>

          <RNView style={[st.deviceGroup, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {syncedDevices
              .filter((d: any) => d.isLocal)
              .map((device: any, index: number, arr: any[]) => (
                <DeviceCard
                  key={device.key}
                  device={device}
                  isDark={isDark}
                  colors={colors}
                  text={text}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  showSep={index < arr.length - 1}
                />
              ))}
          </RNView>

          <Text style={[st.sectionCap, { color: textMuted, marginTop: 30 }]}>OTHER DEVICES</Text>

          {syncedDevices.filter((d: any) => !d.isLocal).length > 0 ? (
            <RNView style={[st.deviceGroup, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              {syncedDevices
                .filter((d: any) => !d.isLocal)
                .map((device: any, index: number, arr: any[]) => (
                  <DeviceCard
                    key={device.key}
                    device={device}
                    isOther
                    isDark={isDark}
                    colors={colors}
                    text={text}
                    textMuted={textMuted}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    showSep={index < arr.length - 1}
                  />
                ))}
            </RNView>
          ) : (
            <RNView
              style={[
                st.emptyCard,
                { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
              ]}
            >
              <Smartphone size={22} color={textMuted} strokeWidth={1.5} />
              <Text style={{ color: textMuted, fontSize: 13, marginTop: 10 }}>
                No other devices connected yet.
              </Text>
            </RNView>
          )}

          <RNView style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 32 }}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[st.footNote, { color: textMuted }]}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      )}
    </ScrollView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DeviceCard — with inline rename (local) + premium delete modal (other)
// ─────────────────────────────────────────────────────────────────────────────
function DeviceCard({
  device,
  isOther,
  isDark,
  colors,
  text,
  textMuted,
  cardBg,
  cardBorder,
  showSep,
}: {
  device: any
  isOther?: boolean
  isDark: boolean
  colors: any
  text: string
  textMuted: string
  cardBg: string
  cardBorder: string
  showSep: boolean
}) {
  const dispatch = useDispatch()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone

  // Rename state (local device only)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  // Delete confirm modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
  }

  const closeDeleteModal = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setShowDeleteModal(false),
    )
  }

  const confirmDelete = () => {
    // Fix: dispatch { key } object as saga expects payload.key
    dispatch(deleteSyncedDevice({ key: device.key } as any))
    setShowDeleteModal(false)
  }

  const startEditing = () => {
    if (isOther) return
    setEditedTitle(device.title || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const commitEdit = () => {
    const trimmed = editedTitle.trim()
    if (trimmed && trimmed !== device.title) {
      dispatch(updateSyncedDevice({ key: device.key, title: trimmed } as any))
    }
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setEditedTitle(device.title || '')
    setIsEditing(false)
  }

  const RED = '#EF4444'

  return (
    <>
      <RNView>
        <RNView style={st.deviceRow}>
          <RNView
            style={[
              st.deviceIcon,
              { backgroundColor: isDark ? 'rgba(220,163,35,0.1)' : 'rgba(220,163,35,0.08)' },
            ]}
          >
            <Icon size={18} color={colors.primary} strokeWidth={1.5} />
            {device.isLocal && <RNView style={[st.onlineDot, { borderColor: cardBg }]} />}
          </RNView>

          <RNView style={{ flex: 1 }}>
            {isEditing ? (
              <TextInput
                ref={inputRef}
                value={editedTitle}
                onChangeText={setEditedTitle}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                style={[
                  st.renameInput,
                  {
                    color: text,
                    borderColor: colors.primary,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  },
                ]}
                returnKeyType="done"
                autoCapitalize="words"
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Escape') cancelEdit()
                }}
              />
            ) : (
              <Pressable onPress={!isOther ? startEditing : undefined}>
                <Text
                  numberOfLines={1}
                  style={[st.deviceName, { color: text }]}
                  title={!isOther ? 'Tap to rename' : undefined}
                >
                  {device.title || device.key || 'Unknown Device'}
                </Text>
              </Pressable>
            )}
            <Text style={[st.deviceSub, { color: textMuted }]}>
              {PLATFORM_NAMES[device.platform || ''] || device.platform || '—'}
              {!isOther && !isEditing && (
                <Text style={[st.deviceSub, { color: `${colors.primary}80` }]}> · Tap to rename</Text>
              )}
            </Text>
          </RNView>

          {isOther && (
            <Pressable
              onPress={openDeleteModal}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
            >
              <Trash2 size={17} color={RED} strokeWidth={1.5} />
            </Pressable>
          )}
        </RNView>

        {showSep && (
          <RNView style={{ height: 1, backgroundColor: cardBorder, marginLeft: 70 }} />
        )}
      </RNView>

      {/* ── Delete confirmation modal ── */}
      <DeleteModal
        visible={showDeleteModal}
        device={device}
        isDark={isDark}
        colors={colors}
        text={text}
        textMuted={textMuted}
        fadeAnim={fadeAnim}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteModal — matches desktop's glassmorphic remove device dialog
// Uses RN Modal so it correctly renders above everything (scroll views, nav, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({
  visible,
  device,
  isDark,
  colors,
  text,
  textMuted,
  fadeAnim,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  device: any
  isDark: boolean
  colors: any
  text: string
  textMuted: string
  fadeAnim: Animated.Value
  onCancel: () => void
  onConfirm: () => void
}) {
  const RED = '#EF4444'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        {/* Backdrop: blur + scrim */}
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

        {/* Dismiss on backdrop tap */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        {/* Card */}
        <RNView style={st.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={st.modalCard}>
            <RNView style={st.modalInner}>
              {/* Danger icon */}
              <RNView
                style={[st.dangerIcon, { backgroundColor: `${RED}26`, borderColor: `${RED}4D` }]}
              >
                <ShieldAlert size={40} color={RED} />
              </RNView>

              <Text style={[st.modalTitle, { color: text }]}>Remove Device?</Text>
              <Text style={[st.modalSub, { color: textMuted }]}>
                The device will lose the data sync and all data will be removed from that device.
              </Text>

              <RNView style={st.modalRow}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [st.modalBtn, st.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={{ color: textMuted, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    st.modalBtn,
                    {
                      backgroundColor: RED,
                      opacity: pressed ? 0.8 : 1,
                      shadowColor: RED,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.35,
                      shadowRadius: 16,
                      elevation: 8,
                    },
                  ]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Remove</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </Animated.View>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll: { paddingBottom: 80 },

  // Segmented control
  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 28,
    alignSelf: 'center',
    width: 264,
  },
  segPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: { fontSize: 13, fontWeight: '500' },

  pad: { paddingHorizontal: 20 },

  // Link card
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconRing: {
    width: 58,
    height: 58,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 6,
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
  },
  inviteTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: 2 },
  inviteSub: { fontSize: 12, fontWeight: '500' },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingTop: 14,
    paddingBottom: 10,
    width: '100%',
  },
  codeBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    width: '100%',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
    fontSize: 13,
    letterSpacing: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 8,
  },
  codeInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  footNote: { fontSize: 12, flex: 1, lineHeight: 17 },

  // Section cap
  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Device list
  deviceGroup: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
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
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  deviceSub: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '500',
  },
  renameInput: {
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Delete modal
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
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  modalSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 28,
    maxWidth: 280,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
})
