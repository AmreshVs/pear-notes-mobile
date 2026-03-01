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
  ViewStyle,
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
  const { step, progress, userData, localKey } = activeStatus

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

  const renderStatusIcon = () => {
    if (step === 'done') {
      return (
        <View
          style={[
            styles.iconLarge,
            { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: 'rgba(52, 199, 89, 0.3)' },
          ]}
        >
          <Check size={40} color="#34C759" strokeWidth={3} />
        </View>
      )
    }
    if (step === 'confirmation') {
      return (
        <View
          style={[
            styles.iconLarge,
            { backgroundColor: 'rgba(220, 163, 35, 0.15)', borderColor: 'rgba(220, 163, 35, 0.3)' },
          ]}
        >
          <ShieldCheck size={40} color="#DCA323" />
        </View>
      )
    }
    return (
      <View style={styles.loaderContainer}>
        <View
          style={[
            styles.iconLarge,
            { backgroundColor: 'rgba(220, 163, 35, 0.05)', borderColor: 'rgba(220, 163, 35, 0.1)' },
          ]}
        >
          <Globe size={40} color="#DCA323" style={{ opacity: 0.2 }} />
        </View>
        <ActivityIndicator size="large" color="#DCA323" style={styles.absoluteLoader} />
      </View>
    )
  }

  const renderContent = () => {
    if (step === 'done') {
      return (
        <View style={styles.content}>
          {renderStatusIcon()}
          <View style={styles.textGroup}>
            <Text variant="bodyBold" style={styles.title}>
              Device Linked
            </Text>
            <Text variant="caption" style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isInviter
                ? 'Your new device has been verified.'
                : 'This device is now part of your library.'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={[
              styles.mainButton,
              { backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.2)' },
            ]}
          >
            <Text style={{ color: '#34C759', fontWeight: '800' }}>Done</Text>
          </Pressable>
        </View>
      )
    }

    if (['syncing', 'receiving_data', 'replicating_data'].includes(step)) {
      return (
        <View style={styles.content}>
          {renderStatusIcon()}
          <View style={styles.textGroup}>
            <Text variant="bodyBold" style={styles.title}>
              Syncing Data
            </Text>
            <Text variant="caption" style={[styles.subtitle, { color: colors.textSecondary }]}>
              Moving your notes to this device...
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBase, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text variant="caption" style={[styles.progressText, { color: colors.textSecondary }]}>
              {progress}% COMPLETE
            </Text>
          </View>
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={styles.content}>
          <View
            style={[
              styles.iconLarge,
              {
                backgroundColor: 'rgba(220, 163, 35, 0.15)',
                borderColor: 'rgba(220, 163, 35, 0.3)',
              },
            ]}
          >
            <Link2 size={40} color="#DCA323" />
          </View>
          <View style={styles.textGroup}>
            <Text variant="bodyBold" style={styles.title}>
              Link Your Device
            </Text>
            <Text variant="caption" style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the invite code from your other device to sync securely.
            </Text>
          </View>
          <TextInput
            value={pasteCode}
            onChangeText={setPasteCode}
            placeholder="Paste code here..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
            autoFocus
          />
          <View style={styles.buttonGroup}>
            <Pressable onPress={handleClose} style={[styles.button, styles.cancelButton]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConnect}
              disabled={!pasteCode.trim()}
              style={[styles.button, styles.connectButton, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Connect</Text>
            </Pressable>
          </View>
        </View>
      )
    }

    const peerFingerprint = getFingerprint(userData)
    const myFingerprint = getFingerprint(localKey)
    const displayId = step === 'confirmation' ? peerFingerprint : myFingerprint

    return (
      <View style={styles.content}>
        {renderStatusIcon()}
        <View style={styles.textGroup}>
          <Text variant="bodyBold" style={styles.title}>
            {step === 'confirmation' ? 'Verify Code' : 'Identity Verification'}
          </Text>
          <Text variant="caption" style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'confirmation'
              ? 'Ensure both devices display the same identification code.'
              : 'Verifying connection. Authorize on your other device.'}
          </Text>
        </View>

        {displayId && (
          <View style={[styles.idCard, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={styles.idLabel}>{step === 'confirmation' ? 'REMOTE ID' : 'MY ID'}</Text>
            <Text style={[styles.idValue, { color: colors.text }]}>{displayId.toUpperCase()}</Text>
          </View>
        )}

        {step === 'confirmation' ? (
          <View style={styles.buttonGroup}>
            <Pressable onPress={handleClose} style={[styles.button, styles.cancelButton]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => dispatch(confirmPairing())}
              style={[styles.button, styles.connectButton, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Verify</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Establishing Link...
            </Text>
          </View>
        )}
      </View>
    )
  }

  const modalStyle: ViewStyle[] = [
    styles.modalView,
    { backgroundColor: isDark ? 'rgba(32, 32, 32, 0.7)' : 'rgba(255, 255, 255, 0.8)' },
  ]

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }]}>
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />
        <View style={styles.centeredView}>
          <GlassView borderRadius={32} style={modalStyle}>
            {renderContent()}
          </GlassView>
        </View>
      </BlurView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  loaderContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  absoluteLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  textGroup: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 24,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  connectButton: {
    // bg set dynamically
  },
  mainButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(220, 163, 35, 0.6)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  idValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBase: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
