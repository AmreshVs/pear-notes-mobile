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
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
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

export const PairingOverlay = memo(function PairingOverlay() {
  const dispatch = useDispatch()
  const { colors, isDark } = useTheme()
  const [pasteCode, setPasteCode] = useState('')
  const fadeAnim = useMemo(() => new Animated.Value(0), [])

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const showPairingInput = useSelector(getShowPairingInput)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'
  const isVisible = isInviterActive || isReceiverActive || showPairingInput

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, progress, userData, localKey, data } = activeStatus

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isVisible, fadeAnim])

  const handleClose = useCallback(() => {
    if (isInviter) dispatch(resetInvite())
    else if (isReceiverActive) dispatch(resetReceiverStatus())
    else dispatch(setShowPairingInput(false))
  }, [dispatch, isInviter, isReceiverActive])

  const handleConnect = useCallback(() => {
    if (pasteCode.trim()) {
      dispatch(subscribePairUser({ invite: pasteCode.trim() } as any))
      dispatch(setShowPairingInput(false))
      setPasteCode('')
    }
  }, [dispatch, pasteCode])

  const GOLD = colors.primary
  const GREEN = '#34C759'

  const getMessage = useCallback(() => {
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
  }, [step, data])

  const iconDoneStyle = useMemo(
    () => [s.icon, { backgroundColor: `${GREEN}26`, borderColor: `${GREEN}4D` }],
    [GREEN],
  )
  const iconGoldStyle = useMemo(
    () => [s.icon, { backgroundColor: `${GOLD}26`, borderColor: `${GOLD}4D` }],
    [GOLD],
  )
  const syncIconWrapperStyle = useMemo(
    () => [s.icon, { backgroundColor: `${GOLD}0D`, borderColor: `${GOLD}1A` }],
    [GOLD],
  )

  const renderIcon = useCallback(() => {
    if (step === 'done') {
      return (
        <View style={iconDoneStyle}>
          <Check size={40} color={GREEN} strokeWidth={3} />
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={iconGoldStyle}>
          <Link2 size={40} color={GOLD} />
        </View>
      )
    }

    return (
      <View style={iconGoldStyle}>
        <ShieldCheck size={40} color={GOLD} />
      </View>
    )
  }, [step, showPairingInput, iconDoneStyle, iconGoldStyle, GREEN, GOLD])

  const renderSyncIcon = useCallback(
    () => (
      <View style={s.loaderWrap}>
        <View style={syncIconWrapperStyle}>
          <Globe size={40} color={GOLD} style={s.globeIcon} />
        </View>
        <ActivityIndicator size="large" color={GOLD} style={StyleSheet.absoluteFill} />
      </View>
    ),
    [syncIconWrapperStyle, GOLD],
  )

  const isSyncing = useMemo(
    () => ['initializing_storage', 'replicating_data', 'syncing', 'receiving_data'].includes(step),
    [step],
  )

  const peerFp = useMemo(() => getFingerprint(userData), [userData])
  const myFp = useMemo(() => getFingerprint(localKey), [localKey])
  const isConfirm = step === 'confirmation'
  const mainFp = isConfirm ? peerFp : myFp
  const mainLabel = isConfirm ? 'REMOTE ID' : 'MY ID'
  const subLabel = isConfirm ? 'MY ID' : peerFp ? 'REMOTE ID' : null
  const subFp = isConfirm ? myFp : peerFp || null

  const titleStyle = useMemo(() => [s.title, { color: colors.text }], [colors.text])
  const subStyle = useMemo(() => [s.sub, { color: colors.textSecondary }], [colors.textSecondary])
  const labelTextStyle = useMemo(
    () => [s.labelText, { color: colors.textSecondary }],
    [colors.textSecondary],
  )
  const placeholderColor = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
    [isDark],
  )
  const inputStyle = useMemo(
    () => [
      s.input,
      {
        color: colors.text,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      },
    ],
    [colors.text],
  )
  const confirmBtnStyle = useMemo(
    () => [s.btn, { backgroundColor: GOLD, opacity: !pasteCode.trim() ? 0.3 : 1 }],
    [GOLD, pasteCode],
  )

  const idCardStyle = useMemo(() => [s.idCard, { borderColor: 'rgba(255,255,255,0.08)' }], [])
  const idLabelStyle = useMemo(() => [s.idLabel, { color: `${GOLD}99` }], [GOLD])
  const idValueStyle = useMemo(() => [s.idValue, { color: colors.text }], [colors.text])
  const verifyBtnStyle = useMemo(() => [s.btn, { backgroundColor: GOLD }], [GOLD])

  const renderContent = useCallback(() => {
    const isDone = step === 'done'

    if (isDone) {
      return (
        <View style={s.cardInner}>
          {renderIcon()}
          <Text style={titleStyle}>Device Linked</Text>
          <Text style={subStyle}>
            {isInviter
              ? 'Your new device has been verified and linked successfully.'
              : 'Welcome! This device is now a secure part of your notes library.'}
          </Text>
          <Pressable onPress={handleClose} style={s.greenBtn}>
            <Text style={s.greenBtnText}>{isInviter ? 'Return to Notes' : 'Open Workspace'}</Text>
          </Pressable>
        </View>
      )
    }

    if (isSyncing) {
      return (
        <View style={s.cardInner}>
          {renderSyncIcon()}
          <Text style={titleStyle}>Syncing Data</Text>
          <Text style={subStyle}>Moving your notes and media to this device...</Text>
          <View style={s.progressWrap}>
            <View style={s.progressLabel}>
              <Text style={labelTextStyle}>
                {getMessage()} • {progress ?? 0}% Complete
              </Text>
            </View>
            <View style={s.trackContainer}>
              <View
                style={[s.fill, { width: `${progress ?? 0}%` as any, backgroundColor: GOLD }]}
              />
            </View>
          </View>
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={s.cardInner}>
          {renderIcon()}
          <Text style={titleStyle}>Link Your Device</Text>
          <Text style={subStyle}>
            Enter the invite code from your other device to sync your notes securely.
          </Text>
          <View style={s.inputArea}>
            <Text style={s.inputLabelText}>Invite Code</Text>
            <TextInput
              value={pasteCode}
              onChangeText={setPasteCode}
              onSubmitEditing={handleConnect}
              placeholder="Paste your code here..."
              placeholderTextColor={placeholderColor}
              style={inputStyle}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={s.row}>
            <Pressable onPress={handleClose} style={s.cancelPressable}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConnect} disabled={!pasteCode.trim()} style={confirmBtnStyle}>
              <Text style={s.confirmBtnText}>Connect</Text>
            </Pressable>
          </View>
        </View>
      )
    }

    const progressFillStyle = { width: `${progress || 25}%` as any, backgroundColor: GOLD }

    return (
      <View style={s.cardInner}>
        {renderIcon()}
        <Text style={titleStyle}>{isConfirm ? 'Verify Secure Code' : 'Identity Verification'}</Text>
        <Text style={subStyle}>
          {isConfirm
            ? 'Ensure both devices display the same identification code.'
            : 'Verifying connection. Please authorize on your other device.'}
        </Text>

        {mainFp ? (
          <View style={idCardStyle}>
            <Text style={idLabelStyle}>{mainLabel}</Text>
            <Text style={idValueStyle}>{mainFp.toUpperCase()}</Text>
          </View>
        ) : null}

        {subFp ? (
          <View style={s.subFpWrapper}>
            <Text style={labelTextStyle}>
              {subLabel}: {subFp.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {isConfirm ? (
          <View style={s.row}>
            <Pressable onPress={handleClose} style={s.cancelPressable}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => dispatch(confirmPairing())} style={verifyBtnStyle}>
              <Text style={s.confirmBtnText}>Verify Code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.progressWrap}>
            <View style={s.trackContainer}>
              <View style={[s.fill, progressFillStyle]} />
            </View>
            <View style={s.progressLabel}>
              <Text style={labelTextStyle}>{getMessage()}</Text>
            </View>
          </View>
        )}
      </View>
    )
  }, [
    step,
    isInviter,
    progress,
    renderIcon,
    handleClose,
    colors,
    GOLD,
    pasteCode,
    handleConnect,
    dispatch,
    getMessage,
    renderSyncIcon,
    isSyncing,
    titleStyle,
    subStyle,
    labelTextStyle,
    placeholderColor,
    inputStyle,
    confirmBtnStyle,
    isConfirm,
    mainFp,
    idCardStyle,
    idLabelStyle,
    mainLabel,
    idValueStyle,
    subFp,
    subLabel,
    verifyBtnStyle,
    showPairingInput, // Added showPairingInput to dependencies
  ])

  const fadeStyle = useMemo(
    () => [StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }],
    [fadeAnim],
  )

  if (!isVisible) return null

  return (
    <Animated.View style={fadeStyle}>
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />
      <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />

      <View style={s.center} pointerEvents="box-none">
        <GlassView intensity={40} borderRadius={32} style={s.card}>
          {renderContent()}
        </GlassView>
      </View>
    </Animated.View>
  )
})

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
  row: { flexDirection: 'row', gap: 12, width: '100%', paddingTop: 8 },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  globeIcon: { opacity: 0.2 },
  greenBtnText: { color: '#34C759', fontWeight: '700', fontSize: 15 },
  cancelPressable: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.45)', fontWeight: '700', fontSize: 14 },
  confirmBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  inputLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: 8,
    marginLeft: 1,
  },
  subFpWrapper: { opacity: 0.4, marginBottom: 16 },
  progressWrap: { width: '100%', paddingTop: 8 },
  fill: { height: '100%', borderRadius: 3 },
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
  goldBtn: {
    shadowColor: '#DCA323',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  trackContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressLabel: { marginTop: 12, alignItems: 'center' },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
})
