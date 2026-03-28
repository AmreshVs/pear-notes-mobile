import {
  clearStorage,
  confirmPairing,
  getDeviceRemoved,
  getInviterStatus,
  getReceiverStatus,
  getShowPairingInput,
  resetInvite,
  resetReceiverStatus,
  setDeviceRemoved,
  setShowPairingInput,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { getFingerprint } from '@pear-notes/core/utils.js'
import { BlurView } from 'expo-blur'
import { Check, Globe, Link2, ShieldAlert, ShieldCheck } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Animated, Pressable, StyleSheet, TextInput } from 'react-native'
import Reanimated, { FadeInDown } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from './GlassView'
import { Text, Theme, View, useColors, useThemedStyles } from './Themed'

import {
  FontSize,
  FontWeight,
  LetterSpacing,
  MonoFontFamily,
  Radii,
  Space,
} from '@/constants/commonStyles'

export const PairingOverlay = memo(function PairingOverlay() {
  const dispatch = useDispatch()
  const styles = useThemedStyles(createStyles)
  const colors = useColors()
  const [pasteCode, setPasteCode] = useState('')
  const fadeAnim = useMemo(() => new Animated.Value(0), [])

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const showPairingInput = useSelector(getShowPairingInput)
  const deviceRemoved = useSelector(getDeviceRemoved)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'
  const isVisible = isInviterActive || isReceiverActive || showPairingInput || deviceRemoved

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
    if (deviceRemoved) {
      dispatch(setDeviceRemoved(false))
      return
    }
    if (isInviter) dispatch(resetInvite())
    else if (isReceiverActive) dispatch(resetReceiverStatus())
    else dispatch(setShowPairingInput(false))
  }, [dispatch, isInviter, isReceiverActive, deviceRemoved])

  const handleConnect = useCallback(() => {
    if (pasteCode.trim()) {
      dispatch(subscribePairUser({ invite: pasteCode.trim() } as any))
      dispatch(setShowPairingInput(false))
      setPasteCode('')
    }
  }, [dispatch, pasteCode])

  const renderIcon = useCallback(() => {
    if (step === 'done') {
      return (
        <View style={styles.iconDone}>
          <Check size={40} color={colors.success} strokeWidth={3} />
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={styles.iconGold}>
          <Link2 size={40} color={colors.primary} />
        </View>
      )
    }

    return (
      <View style={styles.iconGold}>
        <ShieldCheck size={40} color={colors.primary} />
      </View>
    )
  }, [step, showPairingInput, styles.iconDone, styles.iconGold, colors])

  const renderSyncIcon = useCallback(
    () => (
      <View style={styles.loaderWrap}>
        <View style={styles.syncIconWrapper}>
          <Globe size={40} color={colors.primary} style={styles.globeIcon} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={StyleSheet.absoluteFill} />
      </View>
    ),
    [styles.loaderWrap, styles.syncIconWrapper, styles.globeIcon, colors.primary],
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

  const renderFingerprint = (fp: string) => {
    const parts = fp.split(' (')
    if (parts.length < 2) return <Text style={styles.idValue}>{fp.toUpperCase()}</Text>

    const emojis = parts[0]
    const hex = parts[1].replace(')', '')

    return (
      <View style={styles.fingerprintContainer}>
        <Text style={styles.idEmojis}>{emojis}</Text>
        <Text style={styles.idHex}>({hex.split('').join(' ').toUpperCase()})</Text>
      </View>
    )
  }

  const renderContent = useCallback(() => {
    const isDone = step === 'done'

    if (deviceRemoved) {
      return (
        <View style={styles.cardInner}>
          <View style={[styles.icon, styles.errorIcon]}>
            <ShieldAlert size={40} color={colors.error} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Device Removed</Text>
          <Text style={styles.sub}>
            This device has been removed from the synced cluster by another device. Press Okay to
            clear local synced data and reset common storage.
          </Text>
          <Pressable
            onPress={() => {
              dispatch(clearStorage())
              dispatch(setDeviceRemoved(false))
            }}
            style={[styles.btn, styles.errorBtn]}
          >
            <Text style={styles.errorBtnText}>Okay</Text>
          </Pressable>
        </View>
      )
    }

    if (isDone) {
      return (
        <View style={styles.cardInner}>
          {renderIcon()}
          <Text style={styles.title}>Device Linked</Text>
          <Text style={styles.sub}>
            {isInviter
              ? 'Your new device has been verified and linked successfully.'
              : 'Welcome! This device is now a secure part of your notes library.'}
          </Text>
          <Pressable onPress={handleClose} style={styles.greenBtn}>
            <Text style={styles.greenBtnText}>
              {isInviter ? 'Return to Notes' : 'Open Workspace'}
            </Text>
          </Pressable>
        </View>
      )
    }

    if (isSyncing) {
      return (
        <View style={styles.cardInner}>
          {renderSyncIcon()}
          <Text style={styles.title}>Syncing Data</Text>
          <Text style={styles.sub}>Moving your notes and media to this device...</Text>
          <View style={styles.progressWrap}>
            <View style={styles.progressLabel}>
              <Text style={styles.labelText}>
                {getMessage()} • {progress ?? 0}% Complete
              </Text>
            </View>
            <View style={styles.trackContainer}>
              <View
                style={[
                  styles.fill,
                  { width: `${progress ?? 0}%` as any, backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={styles.cardInner}>
          {renderIcon()}
          <Text style={styles.title}>Link Your Device</Text>
          <Text style={styles.sub}>
            Enter the invite code from your other device to sync your notes securely.
          </Text>
          <View style={styles.inputArea}>
            <Text style={styles.inputLabelText}>Invite Code</Text>
            <TextInput
              value={pasteCode}
              onChangeText={setPasteCode}
              onSubmitEditing={handleConnect}
              placeholder="Paste your code here..."
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Pressable onPress={handleClose} style={styles.cancelPressable}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConnect}
              disabled={!pasteCode.trim()}
              style={[
                styles.btn,
                { backgroundColor: colors.primary, opacity: !pasteCode.trim() ? 0.3 : 1 },
              ]}
            >
              <Text style={styles.confirmBtnText}>Connect</Text>
            </Pressable>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.cardInner}>
        {renderIcon()}
        <Text style={styles.title}>
          {isConfirm ? 'Verify Secure Code' : 'Identity Verification'}
        </Text>
        <Text style={styles.sub}>
          {isConfirm
            ? 'Ensure both devices display the same identification code.'
            : 'Verifying connection. Please authorize on your other device.'}
        </Text>

        {mainFp ? (
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>{mainLabel}</Text>
            {renderFingerprint(mainFp)}
          </View>
        ) : null}

        {subFp ? (
          <View style={styles.subFpWrapper}>
            <Text style={styles.labelText}>
              {subLabel}: {subFp.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {isConfirm ? (
          <View style={styles.row}>
            <Pressable onPress={handleClose} style={styles.cancelPressable}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => dispatch(confirmPairing())}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmBtnText}>Verify Code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.progressWrap}>
            <View style={styles.trackContainer}>
              <View
                style={[
                  styles.fill,
                  { width: `${progress || 25}%` as any, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <View style={styles.progressLabel}>
              <Text style={styles.labelText}>{getMessage()}</Text>
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
    pasteCode,
    handleConnect,
    dispatch,
    getMessage,
    renderSyncIcon,
    isSyncing,
    isConfirm,
    mainFp,
    mainLabel,
    subFp,
    subLabel,
    showPairingInput,
    styles,
    deviceRemoved,
  ])

  const fadeStyle = useMemo(
    () => [StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }],
    [fadeAnim],
  )

  if (!isVisible) return null

  return (
    <Animated.View style={fadeStyle}>
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay} />
      <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />

      <View style={styles.center} pointerEvents="box-none">
        <Reanimated.View
          key={`${step}-${showPairingInput ? 'input' : 'flow'}`}
          entering={FadeInDown.duration(240)}
        >
          <Reanimated.View entering={FadeInDown.springify()} style={styles.card}>
            <GlassView intensity={50} style={{ borderRadius: Radii.card }}>
              {renderContent()}
            </GlassView>
          </Reanimated.View>
        </Reanimated.View>
      </View>
    </Animated.View>
  )
})

const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
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
    cardInner: { padding: Space.xl, alignItems: 'center', width: '100%' },
    icon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
    },
    iconDone: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
      backgroundColor: `${theme.colors.success}26`,
      borderColor: `${theme.colors.success}4D`,
    },
    iconGold: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
      backgroundColor: `${theme.colors.primary}26`,
      borderColor: `${theme.colors.primary}4D`,
    },
    syncIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
      backgroundColor: `${theme.colors.primary}0D`,
      borderColor: `${theme.colors.primary}1A`,
    },
    loaderWrap: {
      position: 'relative',
      width: 96,
      height: 96,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Space.sm,
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: LetterSpacing.tight,
      marginBottom: Space.sm,
      color: theme.colors.text,
    },
    sub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: Space.xl,
      maxWidth: 280,
      color: theme.colors.textSecondary,
    },
    idCard: {
      width: '100%',
      paddingHorizontal: Space.xl,
      paddingVertical: Space.base,
      borderRadius: Space.base,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      marginBottom: Space.lg,
    },
    idLabel: {
      fontSize: FontSize.micro,
      fontWeight: FontWeight.bold,
      letterSpacing: 2,
      marginBottom: Space.xs,
      textAlign: 'center',
      color: `${theme.colors.primary}99`,
    },
    idValue: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.black,
      letterSpacing: 3,
      fontFamily: MonoFontFamily,
      textAlign: 'center',
      color: theme.colors.text,
    },
    idEmojis: {
      fontSize: 24,
      textAlign: 'center',
    },
    idHex: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.heavy,
      fontFamily: MonoFontFamily,
      textAlign: 'center',
      color: theme.colors.text,
    },
    fingerprintContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      gap: Space.xs,
    },
    row: { flexDirection: 'row', gap: Space.md, width: '100%', paddingTop: Space.sm },
    btn: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    globeIcon: { opacity: 0.2 },
    greenBtnText: { color: theme.colors.success, fontWeight: FontWeight.bold, fontSize: 15 },
    cancelPressable: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardPressed,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    confirmBtnText: {
      color: theme.isDark ? '#000' : '#fff',
      fontWeight: FontWeight.bold,
      fontSize: 15,
    },
    inputLabelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      opacity: 0.6,
      marginBottom: Space.sm,
      marginLeft: 1,
      color: theme.colors.textSecondary,
    },
    subFpWrapper: { opacity: 0.4, marginBottom: Space.base },
    progressWrap: { width: '100%', paddingTop: Space.sm },
    fill: { height: '100%', borderRadius: 3 },
    inputArea: { width: '100%', marginBottom: Space.xl },
    input: {
      width: '100%',
      height: 44,
      borderRadius: Radii.md,
      borderWidth: 1,
      paddingHorizontal: Space.base,
      fontSize: FontSize.small,
      textAlign: 'center',
      fontFamily: MonoFontFamily,
      letterSpacing: 1,
      color: theme.colors.text,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.cardPressed,
    },
    greenBtn: {
      width: '100%',
      height: 50,
      borderRadius: Radii.md,
      borderWidth: 1,
      backgroundColor: `${theme.colors.success}1A`,
      borderColor: `${theme.colors.success}33`,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 0,
    },
    trackContainer: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      borderWidth: 1,
      backgroundColor: theme.colors.cardPressed,
      borderColor: theme.colors.borderSecondary,
    },
    errorIcon: {
      backgroundColor: `${theme.colors.error}26`,
      borderColor: `${theme.colors.error}4D`,
    },
    errorBtn: {
      backgroundColor: theme.colors.error,
      width: '100%',
      flex: 0,
    },
    errorBtnText: {
      color: '#fff',
      fontWeight: FontWeight.bold,
      fontSize: 15,
    },
    progressLabel: { marginTop: Space.md, alignItems: 'center' },
    labelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },
  })
}
