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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
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

  const systemGreen = '#34C759'
  const gold = colors.primary
  const cancelBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const getMessage = () => {
    switch (step) {
      case 'searching': return 'Searching for device...'
      case 'connected': return 'Device connected'
      case 'authenticating': return 'Authenticating peer...'
      case 'authorizing': return 'Authorizing device...'
      case 'initializing_storage': return 'Initializing storage...'
      case 'replicating_data': return 'Replicating data...'
      case 'syncing': return 'Starting data replication...'
      case 'receiving_data': return `Receiving data... (${data || 0} notes found)`
      default: return 'Establishing Link...'
    }
  }

  // Parse fingerprint: "🥝🍊🍒 (925B3)" → { emoji: "🥝🍊🍒", hex: "925B3" }
  const parseFp = (fp: string | null | undefined) => {
    if (!fp) return { emoji: '', hex: '' }
    const hexMatch = fp.match(/\(([A-Fa-f0-9]+)\)/i)
    const hex = hexMatch ? hexMatch[1].toUpperCase() : fp.replace(/[^A-Fa-f0-9]/g, '').toUpperCase()
    const emoji = fp.replace(/\s*\([A-Fa-f0-9]+\)/i, '').trim()
    return { emoji, hex }
  }

  const renderStatusIcon = () => {
    if (step === 'done') {
      return (
        <View style={[s.iconBox, { backgroundColor: 'rgba(52,199,89,0.15)', borderColor: 'rgba(52,199,89,0.3)' }]}>
          <Check size={40} color={systemGreen} strokeWidth={3} />
        </View>
      )
    }
    if (step === 'confirmation' || showPairingInput) {
      return (
        <View style={[s.iconBox, { backgroundColor: `${gold}18`, borderColor: `${gold}30` }]}>
          {showPairingInput ? <Link2 size={38} color={gold} /> : <ShieldCheck size={38} color={gold} />}
        </View>
      )
    }
    return (
      <View style={s.loaderWrap}>
        <View style={[s.iconBox, { backgroundColor: `${gold}08`, borderColor: `${gold}12` }]}>
          <Globe size={38} color={gold} style={{ opacity: 0.3 }} />
        </View>
        <ActivityIndicator size="large" color={gold} style={s.spinner} />
      </View>
    )
  }

  const renderContent = () => {
    const isDone = step === 'done'
    const isConfirmation = step === 'confirmation'
    const isSyncing = ['initializing_storage', 'replicating_data', 'syncing', 'receiving_data'].includes(step)

    // ── DONE ──
    if (isDone) {
      return (
        <>
          {renderStatusIcon()}
          <Text style={[s.title, { color: colors.text }]}>Device Linked</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            {isInviter
              ? 'Your new device has been verified and linked successfully.'
              : 'Welcome! This device is now a secure part of your notes library.'}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [s.fullBtn, { backgroundColor: 'rgba(52,199,89,0.10)', borderColor: 'rgba(52,199,89,0.20)', opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: systemGreen, fontWeight: '700', fontSize: 15 }}>
              {isInviter ? 'Return to Notes' : 'Open Workspace'}
            </Text>
          </Pressable>
        </>
      )
    }

    // ── SYNCING ──
    if (isSyncing) {
      return (
        <>
          {renderStatusIcon()}
          <Text style={[s.title, { color: colors.text }]}>Syncing Data</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            Moving your notes and media to this device...
          </Text>
          <View style={s.progressWrap}>
            <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
              {getMessage()} • {progress ?? 0}% Complete
            </Text>
            <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[s.progressFill, { width: `${progress ?? 0}%`, backgroundColor: gold }]} />
            </View>
          </View>
        </>
      )
    }

    // ── LINK INPUT ──
    if (showPairingInput) {
      return (
        <>
          {renderStatusIcon()}
          <Text style={[s.title, { color: colors.text }]}>Link Your Device</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            Enter the invite code from your other device to sync your notes securely.
          </Text>
          <View style={[s.inputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Invite Code</Text>
            <TextInput
              value={pasteCode}
              onChangeText={setPasteCode}
              onSubmitEditing={handleConnect}
              placeholder="Paste your code here..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}
              style={[s.input, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={s.btnRow}>
            <Pressable onPress={handleClose} style={({ pressed }) => [s.btn, { backgroundColor: cancelBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConnect} disabled={!pasteCode.trim()} style={({ pressed }) => [s.btn, { backgroundColor: gold, opacity: !pasteCode.trim() ? 0.3 : pressed ? 0.8 : 1 }]}>
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Connect</Text>
            </Pressable>
          </View>
        </>
      )
    }

    // ── VERIFY / SEARCHING ──
    const peerFp = getFingerprint(userData)
    const myFp = getFingerprint(localKey)

    const mainLabel = isConfirmation ? 'REMOTE ID' : 'MY ID'
    const mainFp = isConfirmation ? peerFp : myFp
    const subLabel = isConfirmation ? 'MY ID' : (peerFp ? 'REMOTE ID' : null)
    const subFp = isConfirmation ? myFp : (peerFp || null)

    const { emoji, hex } = parseFp(mainFp)

    return (
      <>
        {renderStatusIcon()}
        <Text style={[s.title, { color: colors.text }]}>
          {isConfirmation ? 'Verify Secure Code' : 'Identity Verification'}
        </Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>
          {isConfirmation
            ? 'Ensure both devices display the same identification code.'
            : 'Verifying connection. Please authorize on your other device.'}
        </Text>

        {mainFp ? (
          <View style={[s.idCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[s.idLabel, { color: `${gold}99` }]}>{mainLabel}</Text>
            {emoji ? <Text style={s.idEmoji}>{emoji}</Text> : null}
            <Text style={[s.idHex, { color: colors.text }]}>{hex ? `( ${hex.split('').join(' ')} )` : ''}</Text>
          </View>
        ) : null}

        {subFp ? (
          <View style={s.subIdRow}>
            <Text style={[s.subIdText, { color: colors.textSecondary }]}>
              {subLabel}: {subFp.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {isConfirmation ? (
          <View style={s.btnRow}>
            <Pressable onPress={handleClose} style={({ pressed }) => [s.btn, { backgroundColor: cancelBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => dispatch(confirmPairing())} style={({ pressed }) => [s.btn, { backgroundColor: gold, opacity: pressed ? 0.8 : 1, shadowColor: gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 }]}>
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Verify Code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.progressWrap}>
            <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[s.progressFill, { width: `${progress || 25}%`, backgroundColor: gold }]} />
            </View>
            <Text style={[s.progressLabel, { color: colors.textSecondary }]}>{getMessage()}</Text>
          </View>
        )}
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — exact mirror of desktop PairingStatusOverlay.jsx
  // Desktop: fixed inset-0 → bg-black/50 backdrop-blur-xl
  //          → bg-bg-panel/60 backdrop-blur-2xl border-white/0.08 rounded-2rem p-10 overflow-hidden
  //            → absolute glow orbs + relative z-10 content
  // ═══════════════════════════════════════════════════════════
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }]}>
      {/* bg-black/50 backdrop-blur-xl */}
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.50)' }]} />
      <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />

      <View style={s.centeredView} pointerEvents="box-none">
        {/* bg-bg-panel/60 backdrop-blur-2xl border-white/0.08 rounded-2rem p-10 overflow-hidden */}
        <GlassView intensity={40} borderRadius={32} style={s.card}>
          {/* absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] */}
          <View style={[s.glowOrb, { top: -96, left: -96, backgroundColor: `${gold}1A` }]} pointerEvents="none" />
          {/* absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] */}
          <View style={[s.glowOrb, { bottom: -96, right: -96, backgroundColor: `${gold}0D` }]} pointerEvents="none" />
          {/* relative z-10 content */}
          <View style={s.content}>
            {renderContent()}
          </View>
        </GlassView>
      </View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  glowOrb: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    padding: 32,
  },
  // Icon
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  loaderWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  spinner: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
  },
  // Text
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
    lineHeight: 21,
    opacity: 0.7,
    marginBottom: 24,
    maxWidth: 280,
  },
  // ID card
  idCard: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  idEmoji: {
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  idHex: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  subIdRow: {
    marginBottom: 24,
    opacity: 0.4,
  },
  subIdText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  // Input
  inputWrap: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  // Progress
  progressWrap: {
    width: '100%',
    marginTop: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
    textAlign: 'center',
  },
})
