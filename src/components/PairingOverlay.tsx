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
import { extractInvite, getFingerprint, isValidInvite } from '@pear-notes/core/utils.js'
import { BlurView } from 'expo-blur'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Check, Globe, Link2, ScanLine, ShieldAlert, ShieldCheck, X } from 'lucide-react-native'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  View as RNView,
  StyleSheet,
  TextInput,
} from 'react-native'
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
import { deleteDbEncryptionKey } from '@/lib/secureStore'

const isAndroid = process.env.EXPO_OS === 'android'

export const PairingOverlay = memo(function PairingOverlay() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useThemedStyles(createStyles)
  const colors = useColors()
  const [pasteCode, setPasteCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
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
    setIsScanning(false)
  }, [dispatch, isInviter, isReceiverActive, deviceRemoved])

  const handleConnect = useCallback(() => {
    if (isValidInvite(pasteCode)) {
      const rawInvite = extractInvite(pasteCode)
      dispatch(subscribePairUser({ invite: rawInvite } as any))
      dispatch(setShowPairingInput(false))
      setPasteCode('')
      setIsScanning(false)
    }
  }, [dispatch, pasteCode])

  const handleOpenScanner = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission()
      if (!result.granted) return
    }
    setHasScanned(false)
    setIsScanning(true)
  }, [cameraPermission?.granted, requestCameraPermission])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      setHasScanned(true)
      if (isValidInvite(data)) {
        const rawInvite = extractInvite(data)
        dispatch(subscribePairUser({ invite: rawInvite } as any))
        dispatch(setShowPairingInput(false))
        setIsScanning(false)
      } else {
        setPasteCode(data.trim())
        setIsScanning(false)
      }
      setTimeout(() => setHasScanned(false), 1000)
    },
    [dispatch, hasScanned],
  )

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
  const mainLabel = isConfirm ? t('pairing.overlay.remoteId') : t('pairing.overlay.myId')
  const subLabel = isConfirm
    ? t('pairing.overlay.myId')
    : peerFp
      ? t('pairing.overlay.remoteId')
      : null
  const subFp = isConfirm ? myFp : peerFp || null

  const getMessage = useCallback(() => {
    switch (step) {
      case 'searching':
        return t('pairing.status.searching')
      case 'connected':
        return t('pairing.status.connected')
      case 'authenticating':
        return t('pairing.status.authenticating')
      case 'authorizing':
        return t('pairing.status.authorizing')
      case 'initializing_storage':
        return t('pairing.status.initializing')
      case 'replicating_data':
        return t('pairing.status.replicating')
      case 'syncing':
        return t('pairing.status.startingReplication')
      case 'receiving_data':
        return t('pairing.status.receivingWithCount', { count: data || 0 })
      default:
        return t('pairing.status.establishing')
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
          <Text style={styles.title}>{t('pairing.overlay.deviceRemovedTitle')}</Text>
          <Text style={styles.sub}>{t('pairing.overlay.deviceRemovedDesc')}</Text>
          <Pressable
            onPress={() => {
              deleteDbEncryptionKey().catch(console.error)
              dispatch(clearStorage())
              dispatch(setDeviceRemoved(false))
            }}
            style={[styles.btn, styles.errorBtn]}
          >
            <Text style={styles.errorBtnText}>{t('pairing.overlay.okay')}</Text>
          </Pressable>
        </View>
      )
    }

    if (isDone) {
      return (
        <View style={styles.cardInner}>
          {renderIcon()}
          <Text style={styles.title}>{t('pairing.overlay.linkedTitle')}</Text>
          <Text style={styles.sub}>
            {isInviter ? t('pairing.overlay.linkedInviter') : t('pairing.overlay.linkedReceiver')}
          </Text>
          <Pressable onPress={handleClose} style={styles.greenBtn}>
            <Text style={styles.greenBtnText}>
              {isInviter ? t('pairing.overlay.returnToNotes') : t('pairing.overlay.openWorkspace')}
            </Text>
          </Pressable>
        </View>
      )
    }

    if (isSyncing) {
      return (
        <View style={styles.cardInner}>
          {renderSyncIcon()}
          <Text style={styles.title}>{t('pairing.overlay.syncingTitle')}</Text>
          <Text style={styles.sub}>{t('pairing.overlay.syncingDesc')}</Text>
          <View style={styles.progressWrap}>
            <View style={styles.progressLabel}>
              <Text style={styles.labelText}>
                {getMessage()} • {t('pairing.overlay.complete', { progress: progress ?? 0 })}
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
          <Text style={styles.title}>{t('pairing.overlay.linkTitle')}</Text>
          <Text style={styles.sub}>{t('pairing.overlay.linkDesc')}</Text>
          <View style={styles.inputArea}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabelText}>{t('pairing.overlay.inviteCode')}</Text>
              <Pressable onPress={handleOpenScanner} style={styles.scanBtn}>
                <ScanLine size={16} color={colors.primary} />
                <Text style={styles.scanBtnText}>{t('pairing.overlay.scanBtn')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={pasteCode}
              onChangeText={setPasteCode}
              onSubmitEditing={handleConnect}
              placeholder={t('pairing.overlay.placeholder')}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Pressable onPress={handleClose} style={styles.cancelPressable}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleConnect}
              disabled={!isValidInvite(pasteCode)}
              style={[
                styles.btn,
                { backgroundColor: colors.primary, opacity: !isValidInvite(pasteCode) ? 0.3 : 1 },
              ]}
            >
              <Text style={styles.confirmBtnText}>{t('pairing.overlay.connectBtn')}</Text>
            </Pressable>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.cardInner}>
        {renderIcon()}
        <Text style={styles.title}>
          {isConfirm ? t('pairing.overlay.verifyTitle') : t('pairing.overlay.identityTitle')}
        </Text>
        <Text style={styles.sub}>
          {isConfirm ? t('pairing.overlay.verifyDesc') : t('pairing.overlay.identityDesc')}
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
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => dispatch(confirmPairing())}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmBtnText}>{t('pairing.overlay.verifyBtn')}</Text>
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
    handleOpenScanner,
  ])

  const fadeStyle = useMemo(
    () => [StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 1000 }],
    [fadeAnim],
  )

  if (!isVisible) return null

  return (
    <Animated.View style={fadeStyle}>
      {isAndroid ? (
        <RNView style={styles.androidScrim} />
      ) : (
        <>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlay} />
        </>
      )}
      <Pressable style={StyleSheet.absoluteFill} />

      <View style={styles.center} pointerEvents="box-none">
        <Reanimated.View
          key={`${step}-${showPairingInput ? 'input' : 'flow'}`}
          entering={FadeInDown.duration(240)}
        >
          <Reanimated.View entering={FadeInDown.springify()} style={styles.card}>
            {isAndroid ? (
              <RNView style={styles.androidCard}>{renderContent()}</RNView>
            ) : (
              <GlassView intensity={50} style={{ borderRadius: Radii.card }}>
                {renderContent()}
              </GlassView>
            )}
          </Reanimated.View>
        </Reanimated.View>
      </View>
      <Modal
        visible={isScanning}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsScanning(false)}
      >
        <View style={styles.scannerScreen}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
              <View style={styles.scannerOverlay} pointerEvents="none">
                <View style={styles.scannerFrame} />
              </View>
              <View style={styles.scannerHeader}>
                <Pressable onPress={() => setIsScanning(false)} style={styles.scannerCloseBtn}>
                  <X size={20} color="#fff" strokeWidth={2.2} />
                </Pressable>
              </View>
              <View style={styles.scannerFooter}>
                <Text style={styles.scannerTitle}>{t('sync.scanner.title')}</Text>
                <Text style={styles.scannerDescription}>{t('sync.scanner.description')}</Text>
              </View>
            </>
          ) : (
            <View style={styles.scannerPermissionCard}>
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
              <Pressable onPress={() => setIsScanning(false)} style={styles.permissionCancelBtn}>
                <Text style={styles.permissionCancelText}>{t('sync.permissions.cancelBtn')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
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
    androidScrim: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0,0,0,0.4)',
    },
    androidCard: {
      borderRadius: 28,
      backgroundColor: theme.isDark ? '#1e1e20' : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      overflow: 'hidden',
      elevation: 6,
    },
    cardInner: {
      padding: isAndroid ? 28 : Space.xl,
      alignItems: 'center',
      width: '100%',
      backgroundColor: 'transparent',
    },
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
      width: isAndroid ? 72 : 80,
      height: isAndroid ? 72 : 80,
      borderRadius: isAndroid ? 36 : Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isAndroid ? 0 : 1,
      marginBottom: isAndroid ? Space.md : Space.sm,
      backgroundColor: isAndroid ? `${theme.colors.success}1A` : `${theme.colors.success}26`,
      borderColor: `${theme.colors.success}4D`,
    },
    iconGold: {
      width: isAndroid ? 72 : 80,
      height: isAndroid ? 72 : 80,
      borderRadius: isAndroid ? 36 : Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isAndroid ? 0 : 1,
      marginBottom: isAndroid ? Space.md : Space.sm,
      backgroundColor: isAndroid ? `${theme.colors.primary}1A` : `${theme.colors.primary}26`,
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
      backgroundColor: 'transparent',
    },
    title: {
      fontSize: isAndroid ? 22 : FontSize.heading,
      fontWeight: isAndroid ? ('600' as any) : FontWeight.bold,
      textAlign: 'center',
      letterSpacing: isAndroid ? 0 : LetterSpacing.tight,
      marginBottom: isAndroid ? 4 : Space.sm,
      color: theme.colors.text,
    },
    sub: {
      fontSize: isAndroid ? 14 : FontSize.body,
      textAlign: 'center',
      lineHeight: isAndroid ? 20 : 22,
      opacity: isAndroid ? 0.64 : 0.7,
      marginBottom: Space.xl,
      maxWidth: 280,
      color: theme.colors.textSecondary,
    },
    idCard: {
      width: '100%',
      paddingHorizontal: Space.xl,
      paddingVertical: isAndroid ? Space.md : Space.base,
      borderRadius: isAndroid ? 16 : Space.base,
      borderWidth: isAndroid ? 0 : 1,
      borderColor: theme.colors.borderSecondary,
      marginBottom: Space.lg,
      ...(isAndroid
        ? {
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }
        : {}),
    },
    idLabel: {
      fontSize: FontSize.micro,
      fontWeight: isAndroid ? ('900' as any) : FontWeight.bold,
      letterSpacing: 2,
      marginBottom: Space.xs,
      textAlign: 'center',
      color: theme.colors.text,
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
      fontSize: FontSize.caption,
      color: theme.colors.text,
      fontWeight: 'bold',
      fontFamily: MonoFontFamily,
      letterSpacing: 2,
      textAlign: 'center',
    },
    scannerScreen: {
      flex: 1,
      backgroundColor: '#000',
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
      zIndex: 1,
    },
    scannerTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      color: '#ffffff',
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    scannerDescription: {
      fontSize: FontSize.body,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      lineHeight: 20,
    },
    scannerPermissionCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Space.xl,
      gap: Space.md,
    },
    permissionBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    permissionBtnText: {
      color: '#fff',
      fontWeight: FontWeight.bold,
    },
    permissionCancelBtn: {
      marginTop: 16,
    },
    permissionCancelText: {
      color: 'rgba(255,255,255,0.5)',
    },
    scannerOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
      backgroundColor: 'transparent',
      zIndex: 1,
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
    fingerprintContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      gap: Space.xs,
    },
    row: {
      flexDirection: 'row',
      gap: isAndroid ? 12 : Space.md,
      width: '100%',
      paddingTop: isAndroid ? Space.md : Space.sm,
      backgroundColor: 'transparent',
    },
    btn: {
      flex: 1,
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    globeIcon: { opacity: 0.2 },
    greenBtnText: { color: theme.colors.success, fontWeight: FontWeight.bold, fontSize: 15 },
    cancelPressable: {
      flex: 1,
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isAndroid
        ? theme.isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.05)'
        : theme.colors.cardPressed,
      borderWidth: isAndroid ? 0 : 1,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontWeight: isAndroid ? ('500' as any) : FontWeight.bold,
      fontSize: isAndroid ? 14 : FontSize.body,
      letterSpacing: isAndroid ? 0.1 : 0,
    },
    confirmBtnText: {
      color: theme.isDark ? '#000' : '#fff',
      fontWeight: isAndroid ? ('500' as any) : FontWeight.bold,
      fontSize: isAndroid ? 14 : 15,
      letterSpacing: isAndroid ? 0.1 : 0,
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
    inputHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Space.sm,
      width: '100%',
      backgroundColor: 'transparent',
    },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isAndroid ? 6 : 4,
      paddingVertical: isAndroid ? 6 : 4,
      paddingHorizontal: isAndroid ? 12 : 8,
      borderRadius: isAndroid ? 9999 : 6,
      backgroundColor: `${theme.colors.primary}1A`,
    },
    scanBtnText: {
      fontSize: FontSize.micro,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    input: {
      width: '100%',
      height: isAndroid ? 52 : 44,
      borderRadius: isAndroid ? 12 : Radii.md,
      borderWidth: isAndroid ? StyleSheet.hairlineWidth : 1,
      paddingHorizontal: Space.base,
      fontSize: FontSize.small,
      textAlign: 'center',
      fontFamily: MonoFontFamily,
      letterSpacing: 1,
      color: theme.colors.text,
      borderColor: isAndroid
        ? theme.isDark
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(0,0,0,0.12)'
        : theme.colors.borderSecondary,
      backgroundColor: isAndroid
        ? theme.isDark
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.03)'
        : theme.colors.cardPressed,
    },
    subFpWrapper: { opacity: 0.4, marginBottom: Space.base, backgroundColor: 'transparent' },
    progressWrap: { width: '100%', paddingTop: Space.sm, backgroundColor: 'transparent' },
    fill: { height: '100%', borderRadius: 3 },
    inputArea: { width: '100%', marginBottom: Space.xl, backgroundColor: 'transparent' },
    greenBtn: {
      width: '100%',
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      borderWidth: isAndroid ? 0 : 1,
      backgroundColor: isAndroid ? `${theme.colors.success}1A` : `${theme.colors.success}1A`,
      borderColor: `${theme.colors.success}33`,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 0,
    },
    trackContainer: {
      width: '100%',
      height: isAndroid ? 4 : 6,
      borderRadius: isAndroid ? 2 : 3,
      overflow: 'hidden',
      borderWidth: isAndroid ? 0 : 1,
      backgroundColor: isAndroid
        ? theme.isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)'
        : theme.colors.cardPressed,
      borderColor: theme.colors.borderSecondary,
    },
    errorIcon: {
      backgroundColor: `${theme.colors.error}26`,
      borderColor: `${theme.colors.error}4D`,
    },
    errorBtn: {
      backgroundColor: theme.colors.error,
      borderRadius: isAndroid ? 9999 : Radii.md,
      width: '100%',
      flex: 0,
    },
    errorBtnText: {
      color: '#fff',
      fontWeight: FontWeight.bold,
      fontSize: 15,
    },
    progressLabel: { marginTop: Space.md, alignItems: 'center', backgroundColor: 'transparent' },
    labelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      color: theme.colors.text,
    },
  })
}
