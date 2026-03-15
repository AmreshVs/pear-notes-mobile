import {
  confirmPairing,
  getInviterStatus,
  getReceiverStatus,
  getShowPairingInput,
  resetInvite,
  resetReceiverStatus,
  setShowPairingInput,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { getFingerprint } from '@pear-notes/core/utils.js'
import { BlurView } from 'expo-blur'
import { Check, Globe, Link2, ShieldCheck } from 'lucide-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from './GlassView'
import { Text, View, useTheme } from './Themed'

// Parse "🥝🍊🍒 (925B3)" → { emoji: "🥝🍊🍒", hex: "925B3" }
function parseFp(fp: string | null | undefined) {
  if (!fp) return { emoji: '', hex: '' }
  const m = fp.match(/\(([A-Fa-f0-9]+)\)/i)
  return {
    hex: m ? m[1].toUpperCase() : fp.replace(/[^A-Fa-f0-9]/g, '').toUpperCase(),
    emoji: fp.replace(/\s*\([A-Fa-f0-9]+\)/i, '').trim(),
  }
}

export function PairingOverlay() {
  const dispatch = useDispatch()
  const { colors, isDark } = useTheme()
  const [pasteCode, setPasteCode] = useState('')
  const fadeAnim = useMemo(() => new Animated.Value(0), [])

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const showPairingInput = useSelector(getShowPairingInput)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'
  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, progress, userData, localKey, data } = activeStatus

  useEffect(() => {
    if (isInviterActive || isReceiverActive || showPairingInput) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isInviterActive, isReceiverActive, showPairingInput, fadeAnim])

  if (!isInviterActive && !isReceiverActive && !showPairingInput) return null

  const handleClose = () => {
    if (isInviter) dispatch(resetInvite())
    else if (isReceiverActive) dispatch(resetReceiverStatus())
    else dispatch(setShowPairingInput(false))
  }

  const handleConnect = () => {
    if (pasteCode.trim()) {
      dispatch(subscribePairUser({ invite: pasteCode.trim() } as any))
      dispatch(setShowPairingInput(false))
      setPasteCode('')
    }
  }

  const GREEN = '#34C759'
  const GOLD = colors.primary

  const getMessage = () => {
    switch (step) {
      case 'searching':
        return 'Searching for device...'
      case 'connected':
        return 'Device connected'
      case 'authenticating':
        return 'Authenticating peer...'
      case 'authorizing':
        return 'Authorizing device...'
      case 'initializing_storage':
        return 'Initializing storage...'
      case 'replicating_data':
        return 'Replicating data...'
      case 'syncing':
        return 'Starting data replication...'
      case 'receiving_data':
        return `Receiving data... (${data || 0} notes found)`
      default:
        return 'Establishing Link...'
    }
  }

  // ────────────────────────────────────────────────────────────
  // Icon
  // ────────────────────────────────────────────────────────────
  const renderIcon = () => {
    // Done → green check
    if (step === 'done')
      return (
        <View style={[s.icon, { backgroundColor: `${GREEN}26`, borderColor: `${GREEN}4D` }]}>
          <Check size={40} color={GREEN} strokeWidth={3} />
        </View>
      )
    // Link input → chain link
    if (showPairingInput)
      return (
        <View style={[s.icon, { backgroundColor: `${GOLD}26`, borderColor: `${GOLD}4D` }]}>
          <Link2 size={40} color={GOLD} />
        </View>
      )
    // ALL other states (confirmation, searching, authenticating, etc.) → ShieldCheck
    // Desktop shows ShieldCheck for every non-done, non-syncing state
    // Globe+spinner is rendered inline only inside the syncing section
    return (
      <View style={[s.icon, { backgroundColor: `${GOLD}26`, borderColor: `${GOLD}4D` }]}>
        <ShieldCheck size={40} color={GOLD} />
      </View>
    )
  }

  // Globe+spinner — only used inside the syncing section (mirrors desktop renderStatusIcon fallback)
  const renderSyncIcon = () => (
    <View style={s.loaderWrap}>
      <View style={[s.icon, { backgroundColor: `${GOLD}0D`, borderColor: `${GOLD}1A` }]}>
        <Globe size={40} color={GOLD} style={{ opacity: 0.2 }} />
      </View>
      <ActivityIndicator size="large" color={GOLD} style={StyleSheet.absoluteFill} />
    </View>
  )

  // ────────────────────────────────────────────────────────────
  // Content
  // ────────────────────────────────────────────────────────────
  const renderContent = () => {
    const isDone = step === 'done'
    const isConfirm = step === 'confirmation'
    const isSyncing = [
      'initializing_storage',
      'replicating_data',
      'syncing',
      'receiving_data',
    ].includes(step)

    // DONE
    if (isDone) {
      return (
        <>
          {renderIcon()}
          <Text style={[s.title, { color: colors.text }]}>Device Linked</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            {isInviter
              ? 'Your new device has been verified and linked successfully.'
              : 'Welcome! This device is now a secure part of your notes library.'}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [s.greenBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: GREEN, fontWeight: '700', fontSize: 15 }}>
              {isInviter ? 'Return to Notes' : 'Open Workspace'}
            </Text>
          </Pressable>
        </>
      )
    }

    // SYNCING
    if (isSyncing) {
      return (
        <>
          {renderSyncIcon()}
          <Text style={[s.title, { color: colors.text }]}>Syncing Data</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            Moving your notes and media to this device...
          </Text>
          <View style={s.progressWrap}>
            <View style={[s.label, { alignItems: 'center' }]}>
              <Text style={[s.labelText, { color: colors.textSecondary }]}>
                {getMessage()} • {progress ?? 0}% Complete
              </Text>
            </View>
            <View style={[s.track, { borderColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={[s.fill, { width: `${progress ?? 0}%`, backgroundColor: GOLD }]} />
            </View>
          </View>
        </>
      )
    }

    // LINK INPUT
    if (showPairingInput) {
      return (
        <>
          {renderIcon()}
          <Text style={[s.title, { color: colors.text }]}>Link Your Device</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            Enter the invite code from your other device to sync your notes securely.
          </Text>
          <View style={s.inputArea}>
            <Text
              style={[s.labelText, { color: colors.textSecondary, marginBottom: 8, marginLeft: 1 }]}
            >
              Invite Code
            </Text>
            <TextInput
              value={pasteCode}
              onChangeText={setPasteCode}
              onSubmitEditing={handleConnect}
              placeholder="Paste your code here..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
              style={[
                s.input,
                {
                  color: colors.text,
                  borderColor: 'rgba(255,255,255,0.05)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                },
              ]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={s.row}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [s.btn, s.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConnect}
              disabled={!pasteCode.trim()}
              style={({ pressed }) => [
                s.btn,
                s.goldBtn,
                { backgroundColor: GOLD, opacity: !pasteCode.trim() ? 0.3 : pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Connect</Text>
            </Pressable>
          </View>
        </>
      )
    }

    // VERIFY / SEARCHING
    const peerFp = getFingerprint(userData)
    const myFp = getFingerprint(localKey)
    const mainFp = isConfirm ? peerFp : myFp
    const mainLabel = isConfirm ? 'REMOTE ID' : 'MY ID'
    const subLabel = isConfirm ? 'MY ID' : peerFp ? 'REMOTE ID' : null
    const subFp = isConfirm ? myFp : peerFp || null
    const { emoji, hex } = parseFp(mainFp)

    return (
      <>
        {renderIcon()}
        <Text style={[s.title, { color: colors.text }]}>
          {isConfirm ? 'Verify Secure Code' : 'Identity Verification'}
        </Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>
          {isConfirm
            ? 'Ensure both devices display the same identification code.'
            : 'Verifying connection. Please authorize on your other device.'}
        </Text>

        {mainFp ? (
          <View style={[s.idCard, { borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[s.idLabel, { color: `${GOLD}99` }]}>{mainLabel}</Text>
            <Text style={[s.idValue, { color: colors.text }]}>{mainFp.toUpperCase()}</Text>
          </View>
        ) : null}

        {subFp ? (
          <View style={{ opacity: 0.4, marginBottom: 16 }}>
            <Text style={[s.labelText, { color: colors.textSecondary }]}>
              {subLabel}: {subFp.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {isConfirm ? (
          <View style={s.row}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [s.btn, s.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => dispatch(confirmPairing())}
              style={({ pressed }) => [
                s.btn,
                s.goldBtn,
                { backgroundColor: GOLD, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Verify Code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.progressWrap}>
            <View style={[s.track, { borderColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={[s.fill, { width: `${progress || 25}%`, backgroundColor: GOLD }]} />
            </View>
            <View style={[s.label, { alignItems: 'center' }]}>
              <Text style={[s.labelText, { color: colors.textSecondary }]}>{getMessage()}</Text>
            </View>
          </View>
        )}
      </>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Desktop structure:
  //   bg-black/50 backdrop-blur-xl
  //     bg-bg-panel/60 backdrop-blur-2xl border-white/0.08
  //       rounded-[2rem] p-10 overflow-hidden
  // ════════════════════════════════════════════════════════════
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }]}>
      {/* bg-black/50 backdrop-blur-xl — match desktop's dark frosted glass backdrop */}
      {/* Layer 1: native system blur */}
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Layer 2: black scrim on top to reach ~50% darkness, matching desktop */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />

      <View style={s.center} pointerEvents="box-none">
        {/* GlassView = expo-glass-effect + BlurView inside = desktop's backdrop-blur-2xl */}
        <GlassView intensity={40} borderRadius={32} style={s.card}>
          <View style={s.cardInner}>{renderContent()}</View>
        </GlassView>
      </View>
    </Animated.View>
  )
}

// Desktop: p-10 = 40px, rounded-2rem = 32px, max-w-sm = 384px
const s = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    opacity: 1,
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: 384,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  cardInner: { padding: 40, alignItems: 'center', width: '100%' },
  // Icon: w-20 h-20 = 80px, rounded-3xl = 24px, ring-1
  icon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  loaderWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Text: text-2xl = 24px, text-sm = 14px
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 24,
    maxWidth: 280,
  },
  // ID card: px-6=24 py-4=16, rounded-2xl=16, bg-white/0.03, border-white/0.08
  idCard: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 4,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  idValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  // Buttons: py-4=16 → h~50, rounded-xl=12
  row: { flexDirection: 'row', gap: 12, width: '100%', paddingTop: 8 },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  goldBtn: {
    shadowColor: '#DCA323',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  greenBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(52,199,89,0.10)',
    borderColor: 'rgba(52,199,89,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Input
  inputArea: { width: '100%', marginBottom: 24 },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  // Progress
  progressWrap: { width: '100%', paddingTop: 8 },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  fill: { height: '100%', borderRadius: 3 },
  label: { marginTop: 12 },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
})
