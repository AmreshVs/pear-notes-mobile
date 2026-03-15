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
import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
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

  const textMuted = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'),
    [isDark],
  )
  const cardBg = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'),
    [isDark],
  )
  const cardBorder = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
    [isDark],
  )
  const segBg = useMemo(() => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'), [isDark])

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

  const scrollStyle = useMemo(
    () => [st.container, { backgroundColor: colors.background }],
    [colors.background],
  )
  const segRowStyle = useMemo(() => [st.segRow, { backgroundColor: segBg }], [segBg])
  const heroCardStyle = useMemo(
    () => [st.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }],
    [cardBg, cardBorder],
  )
  const iconRingStyle = useMemo(
    () => [
      st.iconRing,
      { backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)' },
    ],
    [isDark],
  )
  const heroTitleStyle = useMemo(() => [st.heroTitle, { color: colors.text }], [colors.text])
  const heroDescStyle = useMemo(() => [st.heroDesc, { color: textMuted }], [textMuted])
  const inviteTitleStyle = useMemo(() => [st.inviteTitle, { color: colors.text }], [colors.text])
  const inviteSubStyle = useMemo(() => [st.inviteSub, { color: textMuted }], [textMuted])
  const iconPillStyle = useMemo(
    () => [
      st.iconPill,
      { backgroundColor: isDark ? 'rgba(220,163,35,0.13)' : 'rgba(220,163,35,0.1)' },
    ],
    [isDark],
  )
  const codeLabelStyle = useMemo(
    () => [st.codeLabel, { color: textMuted, borderTopColor: cardBorder, borderTopWidth: 1 }],
    [textMuted, cardBorder],
  )
  const codeBoxStyle = useMemo(
    () => [st.codeBox, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }],
    [isDark],
  )
  const codeTextStyle = useMemo(() => [st.codeText, { color: colors.text }], [colors.text])
  const warningCardStyle = useMemo(
    () => [
      st.warningCard,
      {
        backgroundColor: isDark ? 'rgba(220,163,35,0.07)' : 'rgba(220,163,35,0.08)',
        borderColor: isDark ? 'rgba(220,163,35,0.2)' : 'rgba(220,163,35,0.25)',
      },
    ],
    [isDark],
  )
  const warningTextStyle = useMemo(() => [st.warningText, { color: textMuted }], [textMuted])
  const inputRowStyle = useMemo(
    () => [
      st.inputRow,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
      },
    ],
    [isDark],
  )
  const codeInputStyle = useMemo(() => [st.codeInput, { color: colors.text }], [colors.text])
  const footNoteStyle = useMemo(() => [st.footNote, { color: textMuted }], [textMuted])
  const sectionCapStyle = useMemo(() => [st.sectionCap, { color: textMuted }], [textMuted])
  const sectionCapDeviceStyle = useMemo(
    () => [st.sectionCap, { color: textMuted, marginTop: 30 }],
    [textMuted],
  )
  const emptyCardStyle = useMemo(
    () => [st.emptyCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }],
    [isDark],
  )

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={scrollStyle}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
    >
      <RNView style={segRowStyle}>
        {(['link', 'devices'] as const).map((t) => {
          const active = tab === t
          const pillStyle = [
            st.segPill,
            active &&
              ({
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 4,
              } as any),
          ]
          const labelStyle = [
            st.segLabel,
            { color: active ? '#000000' : textMuted },
            active && ({ fontWeight: '700' } as any),
          ]

          return (
            <Pressable key={t} onPress={() => setTab(t)} style={pillStyle}>
              <Text style={labelStyle}>{t === 'link' ? 'Link Device' : 'My Devices'}</Text>
            </Pressable>
          )
        })}
      </RNView>

      {tab === 'link' ? (
        <RNView style={st.pad}>
          <RNView style={heroCardStyle}>
            {!inviteCode ? (
              <>
                <RNView style={iconRingStyle}>
                  <Globe size={26} color={colors.primary} strokeWidth={1.5} />
                </RNView>

                <Text style={heroTitleStyle}>Link Your Devices</Text>
                <Text style={heroDescStyle}>
                  Create a secure, end-to-end encrypted connection to sync your notes across devices
                  instantly.
                </Text>

                <Pressable
                  onPress={() => dispatch(createInvite())}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    st.generateBtn,
                    { backgroundColor: colors.primary, opacity: isLoading || pressed ? 0.7 : 1 },
                  ]}
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
                  <RNView style={iconPillStyle}>
                    <ShieldCheck size={18} color={colors.primary} strokeWidth={1.5} />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={inviteTitleStyle}>Invitation Ready</Text>
                    <Text style={inviteSubStyle}>{formatExpiry(expiresAt)}</Text>
                  </RNView>
                </RNView>

                <Text style={codeLabelStyle}>SECURE PAIR CODE</Text>

                <RNView style={codeBoxStyle}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={st.codeScrollContent}
                  >
                    <Text selectable style={codeTextStyle}>
                      {inviteCode}
                    </Text>
                  </ScrollView>
                </RNView>

                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => [
                    st.copyBtn,
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
                  <Text style={[st.btnText, copied && { color: '#fff' }]}>
                    {copied ? 'Copied!' : 'Copy Invite Code'}
                  </Text>
                </Pressable>
              </>
            )}
          </RNView>

          {inviteCode && (
            <RNView style={warningCardStyle}>
              <ShieldCheck
                size={14}
                color={colors.primary}
                strokeWidth={1.8}
                style={{ marginTop: 1 }}
              />
              <Text style={warningTextStyle}>
                For security, don't share this code in public channels as it grants full access to
                your notes.
              </Text>
            </RNView>
          )}

          {!isSynced && (
            <RNView style={{ marginBottom: 24 }}>
              <RNView style={st.invitePasteHeader}>
                <Text style={[st.plusIcon, { color: colors.primary }]}>+</Text>
                <Text style={[st.invitePasteText, { color: colors.text }]}>
                  Already have an invite?
                </Text>
              </RNView>

              <RNView style={inputRowStyle}>
                <TextInput
                  value={pasteCode}
                  onChangeText={setPasteCode}
                  onSubmitEditing={handleConnect}
                  placeholder="Paste invite code here..."
                  placeholderTextColor={textMuted}
                  style={codeInputStyle}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={handleConnect}
                  disabled={isLoading || pasteCode.trim().length === 0}
                  style={({ pressed }) => [
                    st.linkBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: isLoading || pasteCode.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={st.linkBtnText}>Link</Text>
                  )}
                </Pressable>
              </RNView>
            </RNView>
          )}

          <RNView style={st.footNoteRow}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={footNoteStyle}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      ) : (
        <RNView style={st.pad}>
          <Text style={sectionCapStyle}>THIS DEVICE</Text>

          <RNView style={[st.deviceGroup, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {syncedDevices
              .filter((d: any) => d.isLocal)
              .map((device: any, index: number, arr: any[]) => (
                <DeviceCard
                  key={device.key}
                  device={device}
                  isDark={isDark}
                  colors={colors}
                  text={colors.text}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  showSep={index < arr.length - 1}
                />
              ))}
          </RNView>

          <Text style={sectionCapDeviceStyle}>OTHER DEVICES</Text>

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
                    text={colors.text}
                    textMuted={textMuted}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    showSep={index < arr.length - 1}
                  />
                ))}
            </RNView>
          ) : (
            <RNView style={emptyCardStyle}>
              <Smartphone size={22} color={textMuted} strokeWidth={1.5} />
              <Text style={[st.emptyText, { color: textMuted }]}>
                No other devices connected yet.
              </Text>
            </RNView>
          )}

          <RNView style={st.footNoteRowDevice}>
            <ShieldCheck size={13} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={footNoteStyle}>
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

  const RED = '#EF4444'

  const deviceIconStyle = useMemo(
    () => [
      st.deviceIcon,
      { backgroundColor: isDark ? 'rgba(220,163,35,0.1)' : 'rgba(220,163,35,0.08)' },
    ],
    [isDark],
  )
  const renameInputStyle = useMemo(
    () => [
      st.renameInput,
      {
        color: text,
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      },
    ],
    [text, colors.primary, isDark],
  )
  const deviceNameStyle = useMemo(() => [st.deviceName, { color: text }], [text])
  const deviceSubStyle = useMemo(() => [st.deviceSub, { color: textMuted }], [textMuted])
  const tapToRenameStyle = useMemo(
    () => [st.deviceSub, { color: `${colors.primary}80` }],
    [colors.primary],
  )
  const deleteBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 }),
    [],
  )

  return (
    <>
      <RNView>
        <RNView style={st.deviceRow}>
          <RNView style={deviceIconStyle}>
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
                style={renameInputStyle}
                returnKeyType="done"
                autoCapitalize="words"
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Escape') cancelEdit()
                }}
              />
            ) : (
              <Pressable onPress={!isOther ? startEditing : undefined}>
                <Text numberOfLines={1} style={deviceNameStyle}>
                  {device.title || device.key || 'Unknown Device'}
                </Text>
              </Pressable>
            )}
            <Text style={deviceSubStyle}>
              {PLATFORM_NAMES[device.platform || ''] || device.platform || '—'}
              {!isOther && !isEditing && <Text style={tapToRenameStyle}> · Tap to rename</Text>}
            </Text>
          </RNView>

          {isOther && (
            <Pressable onPress={openDeleteModal} hitSlop={12} style={deleteBtnStyle}>
              <Trash2 size={17} color={RED} strokeWidth={1.5} />
            </Pressable>
          )}
        </RNView>

        {showSep && <RNView style={{ height: 1, backgroundColor: cardBorder, marginLeft: 70 }} />}
      </RNView>

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
})

const DeleteModal = memo(function DeleteModal({
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

  const animatedStyle = useMemo(() => [StyleSheet.absoluteFill, { opacity: fadeAnim }], [fadeAnim])
  const overlayStyle = useMemo(
    () => [StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }],
    [],
  )
  const dangerIconStyle = useMemo(
    () => [st.dangerIcon, { backgroundColor: `${RED}26`, borderColor: `${RED}4D` }],
    [RED],
  )
  const modalTitleStyle = useMemo(() => [st.modalTitle, { color: text }], [text])
  const modalSubStyle = useMemo(() => [st.modalSub, { color: textMuted }], [textMuted])
  const cancelTextStyle = useMemo(
    () => ({ color: textMuted, fontWeight: '700' as const, fontSize: 14 }),
    [textMuted],
  )
  const removeTextStyle = useMemo(
    () => ({ color: '#fff', fontWeight: '700' as const, fontSize: 15 }),
    [],
  )

  const cancelBtnPressable = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      st.modalBtn,
      st.cancelBtn,
      { opacity: pressed ? 0.7 : 1 },
    ],
    [],
  )
  const removeBtnPressable = useCallback(
    ({ pressed }: { pressed: boolean }) => [
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
    ],
    [RED],
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={animatedStyle}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={overlayStyle} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={st.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={st.modalCard}>
            <RNView style={st.modalInner}>
              <RNView style={dangerIconStyle}>
                <ShieldAlert size={40} color={RED} />
              </RNView>

              <Text style={modalTitleStyle}>Remove Device?</Text>
              <Text style={modalSubStyle}>
                The device will lose the data sync and all data will be removed from that device.
              </Text>

              <RNView style={st.modalRow}>
                <Pressable onPress={onCancel} style={cancelBtnPressable}>
                  <Text style={cancelTextStyle}>Cancel</Text>
                </Pressable>
                <Pressable onPress={onConfirm} style={removeBtnPressable}>
                  <Text style={removeTextStyle}>Remove</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </Animated.View>
    </Modal>
  )
})

const st = StyleSheet.create({
  container: { flex: 1 },
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
  codeScrollContent: { paddingHorizontal: 2 },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
    fontSize: 13,
    letterSpacing: 1,
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
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17 },
  invitePasteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  plusIcon: { fontSize: 18, fontWeight: '600', lineHeight: 20 },
  invitePasteText: { fontSize: 15, fontWeight: '600' },
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
  linkBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  linkBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  footNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  footNoteRowDevice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 32 },
  footNote: { fontSize: 12, flex: 1, lineHeight: 17 },

  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

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
  emptyText: { fontSize: 13, marginTop: 10 },

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
