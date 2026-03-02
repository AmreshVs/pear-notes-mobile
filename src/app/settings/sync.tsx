import {
  deleteSyncedDevice,
  getLocalPreferences,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getSyncIsLoading,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import * as Clipboard from 'expo-clipboard'
import { Globe, Link2, Monitor, ShieldCheck, Smartphone, Trash2 } from 'lucide-react-native'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Text, useTheme } from '@/components/Themed'

const PLATFORM_NAMES: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
}

const ACCENT = '#EAB308'

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
  const cardBg = isDark ? '#212225' : '#FFFFFF'
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const textMuted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)'
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
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <RNView style={[styles.segRow, { backgroundColor: segBg }]}>
        {(['link', 'devices'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.segPill,
                active && {
                  backgroundColor: ACCENT,
                  shadowColor: ACCENT,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.segLabel,
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
        <RNView style={styles.pad}>
          <RNView
            style={[styles.heroCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}
          >
            {!inviteCode ? (
              <>
                <RNView
                  style={[
                    styles.iconRing,
                    { backgroundColor: isDark ? 'rgba(234,179,8,0.13)' : 'rgba(234,179,8,0.1)' },
                  ]}
                >
                  <Globe size={26} color={ACCENT} strokeWidth={1.5} />
                </RNView>

                <Text style={[styles.heroTitle, { color: text }]}>Link Your Devices</Text>
                <Text style={[styles.heroDesc, { color: textMuted }]}>
                  Create a secure, end-to-end encrypted connection to sync your notes across devices
                  instantly.
                </Text>

                <Pressable
                  onPress={() => dispatch(createInvite())}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    backgroundColor: ACCENT,
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
                  <Text style={styles.btnText}>{isLoading ? 'Preparing…' : 'Generate Invite'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <RNView style={styles.inviteHeader}>
                  <RNView
                    style={[
                      styles.iconPill,
                      { backgroundColor: isDark ? 'rgba(234,179,8,0.13)' : 'rgba(234,179,8,0.1)' },
                    ]}
                  >
                    <ShieldCheck size={18} color={ACCENT} strokeWidth={1.5} />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={[styles.inviteTitle, { color: text }]}>Invitation Ready</Text>
                    <Text style={[styles.inviteSub, { color: textMuted }]}>
                      {formatExpiry(expiresAt)}
                    </Text>
                  </RNView>
                </RNView>

                <Text
                  style={[
                    styles.codeLabel,
                    { color: textMuted, borderTopColor: cardBorderColor, borderTopWidth: 1 },
                  ]}
                >
                  SECURE PAIR CODE
                </Text>

                <RNView
                  style={[
                    styles.codeBox,
                    { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 2 }}
                  >
                    <Text selectable style={[styles.codeText, { color: text }]}>
                      {inviteCode}
                    </Text>
                  </ScrollView>
                </RNView>

                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => ({
                    backgroundColor: copied ? '#22C55E' : ACCENT,
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
                  <Link2 size={16} color="#000" strokeWidth={2.2} />
                  <Text style={styles.btnText}>{copied ? 'Copied!' : 'Copy Invite Code'}</Text>
                </Pressable>
              </>
            )}
          </RNView>

          {inviteCode && (
            <RNView
              style={[
                styles.warningCard,
                {
                  backgroundColor: isDark ? 'rgba(234,179,8,0.07)' : 'rgba(234,179,8,0.08)',
                  borderColor: isDark ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.25)',
                },
              ]}
            >
              <ShieldCheck size={14} color={ACCENT} strokeWidth={1.8} style={{ marginTop: 1 }} />
              <Text style={[styles.warningText, { color: textMuted }]}>
                For security, don't share this code in public channels as it grants full access to
                your notes.
              </Text>
            </RNView>
          )}

          {!isSynced && (
            <RNView style={{ marginBottom: 24 }}>
              <RNView
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 }}
              >
                <Text style={{ color: ACCENT, fontSize: 18, fontWeight: '600', lineHeight: 20 }}>
                  +
                </Text>
                <Text style={{ color: text, fontSize: 15, fontWeight: '600' }}>
                  Already have an invite?
                </Text>
              </RNView>

              <RNView
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
                  },
                ]}
              >
                <TextInput
                  value={pasteCode}
                  onChangeText={setPasteCode}
                  placeholder="Paste invite code here..."
                  placeholderTextColor={textMuted}
                  style={[styles.codeInput, { color: text }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={handleConnect}
                  disabled={isLoading || pasteCode.trim().length === 0}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                    opacity: isLoading || pasteCode.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={text} />
                  ) : (
                    <Text style={{ color: text, fontSize: 14, fontWeight: '600' }}>
                      Link Device
                    </Text>
                  )}
                </Pressable>
              </RNView>
            </RNView>
          )}

          <RNView style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <ShieldCheck size={13} color={ACCENT} style={{ marginTop: 2 }} />
            <Text style={[styles.footNote, { color: textMuted }]}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      ) : (
        <RNView style={styles.pad}>
          <Text style={[styles.sectionCap, { color: textMuted }]}>THIS DEVICE</Text>
          <RNView style={{ gap: 10 }}>
            {syncedDevices
              .filter((d: any) => d.isLocal)
              .map((device: any) => (
                <DeviceCard
                  key={device.key}
                  device={device}
                  text={text}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  cardBorder={cardBorderColor}
                  isDark={isDark}
                />
              ))}
          </RNView>

          <Text style={[styles.sectionCap, { color: textMuted, marginTop: 30 }]}>
            OTHER DEVICES
          </Text>
          {syncedDevices.filter((d: any) => !d.isLocal).length > 0 ? (
            <RNView style={{ gap: 10 }}>
              {syncedDevices
                .filter((d: any) => !d.isLocal)
                .map((device: any) => (
                  <DeviceCard
                    key={device.key}
                    device={device}
                    isOther
                    text={text}
                    textMuted={textMuted}
                    cardBg={cardBg}
                    cardBorder={cardBorderColor}
                    isDark={isDark}
                  />
                ))}
            </RNView>
          ) : (
            <RNView
              style={[
                styles.emptyCard,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Smartphone size={22} color={textMuted} strokeWidth={1.5} />
              <Text style={[{ color: textMuted, fontSize: 13, marginTop: 10 }]}>
                No other devices connected yet.
              </Text>
            </RNView>
          )}

          <RNView style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 32 }}>
            <ShieldCheck size={13} color={ACCENT} style={{ marginTop: 2 }} />
            <Text style={[styles.footNote, { color: textMuted }]}>
              Your data moves directly between devices using encrypted Hypercore logs. No central
              server involved.
            </Text>
          </RNView>
        </RNView>
      )}
    </ScrollView>
  )
}

function DeviceCard({
  device,
  isOther,
  text,
  textMuted,
  cardBg,
  cardBorder,
  isDark,
}: {
  device: any
  isOther?: boolean
  text: string
  textMuted: string
  cardBg: string
  cardBorder: string
  isDark: boolean
}) {
  const dispatch = useDispatch()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone

  const handleDelete = () =>
    Alert.alert(
      'Unlink Device?',
      'This device will be removed from your sync network and its local data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => dispatch(deleteSyncedDevice(device.key as any)),
        },
      ],
    )

  return (
    <RNView style={[styles.deviceCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <RNView
        style={[
          styles.deviceIcon,
          { backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.08)' },
        ]}
      >
        <Icon size={18} color={ACCENT} strokeWidth={1.5} />
        {device.isLocal && <RNView style={[styles.onlineDot, { borderColor: cardBg }]} />}
      </RNView>

      <RNView style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.deviceName, { color: text }]} selectable>
          {device.title || device.key || 'Unknown Device'}
        </Text>
        <Text style={[styles.deviceSub, { color: textMuted }]}>
          {PLATFORM_NAMES[device.platform || ''] || device.platform || '—'}
        </Text>
      </RNView>

      {isOther && (
        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Trash2 size={17} color="#EF4444" strokeWidth={1.5} />
        </Pressable>
      )}
    </RNView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 80,
  },
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
  segLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  pad: {
    paddingHorizontal: 20,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 24,
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
  btnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    marginBottom: 0,
    paddingBottom: 16,
  },
  iconPill: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  inviteSub: {
    fontSize: 12,
    fontWeight: '500',
  },
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
    marginBottom: 0,
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
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 9,
  },
  footNote: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  sectionCap: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  deviceIcon: {
    width: 42,
    height: 42,
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
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '500',
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
