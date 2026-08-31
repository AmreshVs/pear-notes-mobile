import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  DimensionValue,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native'
import Reanimated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { BlurView } from 'expo-blur'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'

import {
  clearStorage,
  confirmPairing,
  getDeviceRemoved,
  getInviterStatus,
  getReceiverStatus,
  getShowPairingInput,
  rejectPairing,
  resetInvite,
  resetReceiverStatus,
  setDeviceRemoved,
  setShowPairingInput,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { extractInvite, getFingerprint, isValidInvite } from '@pear-notes/core/utils.js'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { useQrImageAttach } from '@/components/sync/useQrImageAttach'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  LetterSpacing,
  MonoFontFamily,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_40,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { clearStorageState } from '@/lib/clearStorageState'
import { hapticError, hapticMedium, hapticSuccess } from '@/lib/haptics'
import { pendingInviteState } from '@/lib/pendingInviteState'
import { deleteDbEncryptionKey } from '@/lib/secureStore'
import { getRelativeTime } from '@/utils/relativeTime'

import { GlassView } from './GlassView'
import { createThemedStylesheetWithHooks, Text, useColors, useTheme, View } from './Themed'

const isAndroid = process.env.EXPO_OS === 'android'
const REQUESTED_AGE_TICK_MS = 30000

export const PairingOverlay = memo(function PairingOverlay() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const colors = useColors()
  const theme = useTheme()
  const [pasteCode, setPasteCode] = useState('')
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [presenceNow, setPresenceNow] = useState(() => Date.now())
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  useEffect(() => {
    return pendingInviteState.subscribe((invite) => {
      setPendingInvite(invite)
    })
  }, [])

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const showPairingInput = useSelector(getShowPairingInput)
  const deviceRemoved = useSelector(getDeviceRemoved)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'
  const isVisible =
    isInviterActive || isReceiverActive || showPairingInput || deviceRemoved || !!pendingInvite

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, progress, userData, localKey, data, requestedAt } = activeStatus

  useEffect(() => {
    if (deviceRemoved) {
      router.dismissAll()
    }
  }, [])

  useEffect(() => {
    if (step !== 'confirmation') return
    const timer = setInterval(() => setPresenceNow(Date.now()), REQUESTED_AGE_TICK_MS)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    if (step === 'done') hapticSuccess()
    else if (step === 'error' || step === 'rejected' || step === 'expired') hapticError()
    else if (step === 'confirmation') hapticMedium()
  }, [step])

  const handleClose = useCallback(() => {
    if (deviceRemoved) {
      dispatch(setDeviceRemoved(false))
      return
    }
    if (isInviter) dispatch(resetInvite())
    else if (isReceiverActive) dispatch(resetReceiverStatus())
    else dispatch(setShowPairingInput(false))
    setPendingInvite(null)
    setIsScanning(false)
  }, [dispatch, isInviter, isReceiverActive, deviceRemoved])

  const handleReject = useCallback(() => {
    dispatch(rejectPairing())
  }, [dispatch])

  const handleConfirm = useCallback(() => {
    dispatch(confirmPairing())
  }, [dispatch])

  const handleResetAfterFailedPairing = useCallback(() => {
    dispatch(resetReceiverStatus())
  }, [dispatch])

  const handleConnect = useCallback(() => {
    if (isValidInvite(pasteCode)) {
      setPendingInvite(extractInvite(pasteCode))
      setIsScanning(false)
    }
  }, [pasteCode])

  const handleConfirmMerge = useCallback(() => {
    if (!pendingInvite) return
    dispatch(subscribePairUser({ invite: pendingInvite }))
    dispatch(setShowPairingInput(false))
    setPendingInvite(null)
    pendingInviteState.setPendingInvite(null)
    setPasteCode('')
  }, [dispatch, pendingInvite])

  const handleCancelMerge = useCallback(() => {
    setPendingInvite(null)
    pendingInviteState.setPendingInvite(null)
  }, [])

  const handleOpenScanner = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission()
      if (!result.granted) return
    }
    setHasScanned(false)
    setIsScanning(true)
  }, [cameraPermission?.granted, requestCameraPermission])

  const handleInviteFromImage = useCallback((invite: string) => {
    setPasteCode(invite)
    setIsScanning(false)
  }, [])

  const { scanError, clearScanError, attachQrImage } = useQrImageAttach(handleInviteFromImage)

  const handleCloseScanner = useCallback(() => {
    setIsScanning(false)
    clearScanError()
  }, [clearScanError])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      hapticMedium()
      setHasScanned(true)
      if (isValidInvite(data)) {
        setPendingInvite(extractInvite(data))
        setIsScanning(false)
      } else {
        setPasteCode(data.trim())
        setIsScanning(false)
      }
      setTimeout(() => setHasScanned(false), 1000)
    },
    [hasScanned],
  )

  const renderIcon = useCallback(() => {
    if (step === 'done') {
      return (
        <View style={styles.iconDone}>
          <SymbolIcon name="checkmark" size={UI_ICON_SIZE_40} color={colors.success} />
        </View>
      )
    }

    if (showPairingInput) {
      return (
        <View style={styles.iconGold}>
          <SymbolIcon name="link" size={UI_ICON_SIZE_40} color={colors.primary} />
        </View>
      )
    }

    return (
      <View style={styles.iconGold}>
        <SymbolIcon name="checkmark.shield" size={UI_ICON_SIZE_40} color={colors.primary} />
      </View>
    )
  }, [step, showPairingInput, styles.iconDone, styles.iconGold, colors, styles.icon])

  const renderSyncIcon = useCallback(
    () => (
      <View style={styles.loaderWrap}>
        <View style={styles.syncIconWrapper}>
          <SymbolIcon
            name="globe"
            size={UI_ICON_SIZE_40}
            color={colors.primary}
            style={styles.globeIcon}
          />
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
  const requestedTime = useMemo(
    () =>
      isConfirm ? getRelativeTime(requestedAt, Math.max(presenceNow, requestedAt || 0)) : null,
    [isConfirm, requestedAt, presenceNow],
  )
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
        <Text style={styles.idHex}>{hex.toUpperCase()}</Text>
      </View>
    )
  }

  const renderContent = useCallback(() => {
    const isDone = step === 'done'
    const isError = step === 'error'
    const isRejected = step === 'rejected'
    const isExpired = step === 'expired'

    if (deviceRemoved) {
      return (
        <View style={styles.cardInner}>
          <View style={[styles.icon, styles.errorIcon]}>
            <SymbolIcon
              name="exclamationmark.shield"
              size={UI_ICON_SIZE_40}
              color={colors.error}
              weight="semibold"
            />
          </View>
          <Text style={styles.title}>{t('pairing.overlay.deviceRemovedTitle')}</Text>
          <Text style={styles.sub}>{t('pairing.overlay.deviceRemovedDesc')}</Text>
          <Pressable
            onPress={() => {
              clearStorageState.setClearing(true)
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

    if (isError || isRejected || isExpired) {
      return (
        <View style={styles.cardInner}>
          <View style={[styles.icon, styles.errorIcon]}>
            <SymbolIcon
              name="exclamationmark.shield"
              size={UI_ICON_SIZE_40}
              color={colors.error}
              weight="semibold"
            />
          </View>
          <Text style={styles.title}>
            {isExpired
              ? t('pairing.overlay.pairingExpiredTitle')
              : isRejected
                ? t('pairing.overlay.pairingRejectedTitle')
                : t('pairing.overlay.pairingFailedTitle')}
          </Text>
          <Text style={styles.sub}>
            {isExpired
              ? t('pairing.overlay.pairingExpiredDesc')
              : isRejected
                ? t('pairing.overlay.pairingRejectedDesc')
                : t('pairing.overlay.pairingFailedDesc')}
          </Text>
          <Pressable onPress={handleResetAfterFailedPairing} style={[styles.btn, styles.errorBtn]}>
            <Text style={styles.errorBtnText}>{t('pairing.overlay.okay')}</Text>
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
                  styles.progressFill,
                  { width: `${progress ?? 0}%` as DimensionValue },
                ]}
              />
            </View>
          </View>
        </View>
      )
    }

    if (pendingInvite) {
      return (
        <View style={styles.cardInner}>
          <View style={styles.iconGold}>
            <SymbolIcon name="link" size={UI_ICON_SIZE_40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('pairing.overlay.mergeTitle')}</Text>
          <Text style={styles.sub}>{t('pairing.overlay.mergeDesc')}</Text>
          <View style={styles.row}>
            <Pressable onPress={handleCancelMerge} style={styles.cancelPressable}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleConfirmMerge} style={[styles.btn, styles.confirmBtn]}>
              <Text style={styles.confirmBtnText}>{t('pairing.overlay.mergeConfirm')}</Text>
            </Pressable>
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
                <SymbolIcon
                  name="qrcode.viewfinder"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                />
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
                styles.confirmBtn,
                !isValidInvite(pasteCode) && styles.confirmBtnDisabled,
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

        {isConfirm && requestedTime ? (
          <Text style={styles.requestedAtText}>
            {t('sync.confirm.requestedAt', {
              time:
                requestedTime.count === 0
                  ? t(requestedTime.key)
                  : t(requestedTime.key, { count: requestedTime.count }),
            })}
          </Text>
        ) : null}

        {isConfirm ? (
          <View style={styles.row}>
            <Pressable onPress={handleReject} style={styles.rejectPressable}>
              <Text style={styles.rejectBtnText}>{t('pairing.overlay.rejectBtn')}</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={[styles.btn, styles.confirmBtn]}>
              <Text style={styles.confirmBtnText}>{t('pairing.overlay.verifyBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.progressWrap}>
            <View style={styles.trackContainer}>
              <View
                style={[
                  styles.fill,
                  styles.progressFill,
                  { width: `${progress || 25}%` as DimensionValue },
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
    handleReject,
    handleConfirm,
    handleResetAfterFailedPairing,
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
    requestedTime,
    t,
    showPairingInput,
    styles,
    deviceRemoved,
    handleOpenScanner,
    pendingInvite,
    handleConfirmMerge,
    handleCancelMerge,
  ])

  if (!isVisible) return null

  return (
    <MotionView
      style={styles.fadeWrapper}
      entering={FadeIn.duration(Durations.overlayFade)}
      exiting={FadeOut.duration(Durations.overlayFadeOut)}
    >
      {isAndroid ? (
        <RNView style={styles.androidScrim} />
      ) : (
        <>
          <BlurView intensity={100} tint={theme.colorScheme} style={StyleSheet.absoluteFill} />
          <View style={styles.overlay} />
        </>
      )}
      <Pressable style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={isAndroid ? undefined : 'padding'}
        style={styles.center}
        pointerEvents="box-none"
      >
        <Reanimated.View
          key={`${step}-${pendingInvite ? 'merge' : showPairingInput ? 'input' : 'flow'}`}
          entering={FadeInDown.duration(240)}
        >
          <Reanimated.View
            entering={FadeInDown.duration(240).easing(Easing.out(Easing.cubic))}
            style={styles.card}
          >
            {isAndroid ? (
              <RNView style={styles.androidCard}>{renderContent()}</RNView>
            ) : (
              <GlassView intensity={50} style={styles.glassCardInner}>
                {renderContent()}
              </GlassView>
            )}
          </Reanimated.View>
        </Reanimated.View>
      </KeyboardAvoidingView>
      <Modal
        visible={isScanning}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseScanner}
      >
        <View style={styles.scannerScreen}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                style={styles.scannerCamera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
              <View style={styles.scannerOverlay} pointerEvents="none">
                <View style={styles.scannerFrame} />
              </View>
              <View style={styles.scannerHeader}>
                <Pressable onPress={handleCloseScanner} style={styles.scannerCloseBtn}>
                  <SymbolIcon
                    name="xmark"
                    size={UI_ICON_SIZE_20}
                    color={theme.colors.white}
                    weight="semibold"
                  />
                </Pressable>
              </View>
              <View style={styles.scannerFooter}>
                <Text style={styles.scannerTitle}>{t('sync.scanner.title')}</Text>
                <Text style={styles.scannerDescription}>{t('sync.scanner.description')}</Text>
                {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
                <Pressable
                  onPress={attachQrImage}
                  style={({ pressed }) => [styles.attachBtn, pressed && commonStyles.pressed]}
                >
                  <SymbolIcon
                    name="photo.on.rectangle"
                    size={UI_ICON_SIZE_20}
                    color={theme.colors.white}
                    weight="semibold"
                  />
                  <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
                </Pressable>
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
                style={({ pressed }) => [styles.permissionBtn, pressed && commonStyles.pressed]}
              >
                <Text style={styles.permissionBtnText}>{t('sync.permissions.allowBtn')}</Text>
              </Pressable>
              <Pressable
                onPress={attachQrImage}
                style={({ pressed }) => [styles.attachBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="photo.on.rectangle"
                  size={UI_ICON_SIZE_20}
                  color={theme.colors.white}
                  weight="semibold"
                />
                <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
              </Pressable>
              {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
              <Pressable onPress={handleCloseScanner} style={styles.permissionCancelBtn}>
                <Text style={styles.permissionCancelText}>{t('sync.permissions.cancelBtn')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </MotionView>
  )
})

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    center: {
      ...commonStyles.centered,
      flex: 1,
      paddingHorizontal: Space.xl,
      backgroundColor: theme.colors.transparent,
    },
    card: {
      width: '100%',
      maxWidth: 384,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 20,
    },
    androidScrim: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundColor: theme.isDark
        ? hexWithAlpha(theme.colors.black, 0.8)
        : hexWithAlpha(theme.colors.black, 0.4),
    },
    androidCard: {
      borderRadius: 28,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? hexWithAlpha(theme.colors.white, 0.08)
        : hexWithAlpha(theme.colors.black, 0.05),
      overflow: 'hidden',
      elevation: 6,
    },
    cardInner: {
      padding: isAndroid ? 28 : Space.xl,
      alignItems: 'center',
      width: '100%',
      backgroundColor: theme.colors.transparent,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      ...commonStyles.centered,
      borderWidth: 1,
      marginBottom: Space.sm,
    },
    iconDone: {
      width: isAndroid ? 72 : 80,
      height: isAndroid ? 72 : 80,
      borderRadius: isAndroid ? 36 : Space.xl,
      ...commonStyles.centered,
      borderWidth: isAndroid ? 0 : 1,
      marginBottom: isAndroid ? Space.md : Space.sm,
      backgroundColor: isAndroid ? `${theme.colors.success}1A` : `${theme.colors.success}26`,
      borderColor: `${theme.colors.success}4D`,
    },
    iconGold: {
      width: isAndroid ? 72 : 80,
      height: isAndroid ? 72 : 80,
      borderRadius: isAndroid ? 36 : Space.xl,
      ...commonStyles.centered,
      borderWidth: isAndroid ? 0 : 1,
      marginBottom: isAndroid ? Space.md : Space.sm,
      backgroundColor: isAndroid ? `${theme.colors.primary}1A` : `${theme.colors.primary}26`,
      borderColor: `${theme.colors.primary}4D`,
    },
    syncIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      ...commonStyles.centered,
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
      backgroundColor: theme.colors.transparent,
    },
    title: {
      fontSize: FontSize.heading,
      lineHeight: UI_SIZE_32,
      fontWeight: isAndroid ? FontWeight.semibold : FontWeight.bold,
      textAlign: 'center',
      letterSpacing: isAndroid ? 0 : LetterSpacing.tight,
      marginBottom: Space.md,
      width: '100%',
      color: theme.colors.text,
    },
    sub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: isAndroid ? 20 : 22,
      opacity: isAndroid ? 0.64 : 0.7,
      marginBottom: Space.xl,
      width: '100%',
      color: theme.colors.textSecondary,
    },
    idCard: {
      width: '100%',
      paddingHorizontal: Space.md,
      paddingVertical: isAndroid ? Space.base : Space.lg,
      borderRadius: isAndroid ? 16 : Space.base,
      borderWidth: isAndroid ? 0 : 1,
      borderColor: theme.colors.borderSecondary,
      marginBottom: Space.lg,
      ...(isAndroid
        ? {
            backgroundColor: theme.isDark
              ? hexWithAlpha(theme.colors.white, 0.06)
              : hexWithAlpha(theme.colors.black, 0.04),
          }
        : {}),
    },
    idLabel: {
      fontSize: FontSize.caption,
      fontWeight: isAndroid ? FontWeight.black : FontWeight.bold,
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
      fontSize: UI_SIZE_40,
      lineHeight: UI_SIZE_48,
      letterSpacing: LetterSpacing.loose,
      textAlign: 'center',
    },
    idHex: {
      fontSize: FontSize.title,
      color: theme.colors.text,
      fontWeight: FontWeight.bold,
      fontFamily: MonoFontFamily,
      letterSpacing: LetterSpacing.code,
      textAlign: 'center',
    },
    scannerScreen: {
      flex: 1,
      backgroundColor: theme.colors.black,
    },
    scannerHeader: {
      position: 'absolute',
      top: insets.top + UI_ICON_SIZE_12,
      left: 0,
      right: 0,
      paddingHorizontal: Space.lg,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      zIndex: 2,
      backgroundColor: theme.colors.transparent,
    },
    scannerCloseBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.black, 0.45),
    },
    scannerFooter: {
      position: 'absolute',
      left: Space.lg,
      right: Space.lg,
      bottom: 56,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.lg,
      borderRadius: Radii.card,
      backgroundColor: hexWithAlpha(theme.colors.black, 0.55),
      gap: Space.sm,
      zIndex: 1,
    },
    scannerError: {
      fontSize: FontSize.caption,
      textAlign: 'center',
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
    attachBtn: {
      ...commonStyles.row,
      alignSelf: 'center',
      gap: Space.sm,
      marginTop: Space.xs,
      paddingVertical: Space.md,
      paddingHorizontal: Space.lg,
      borderRadius: Radii.pill,
      backgroundColor: hexWithAlpha(theme.colors.white, 0.16),
    },
    attachBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.white,
    },
    scannerTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      color: theme.colors.white,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    scannerDescription: {
      fontSize: FontSize.body,
      color: theme.colors.overlayText,
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
      backgroundColor: theme.colors.primary,
    },
    permissionBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
    },
    permissionCancelBtn: {
      marginTop: 16,
    },
    permissionCancelText: {
      color: theme.colors.overlayTextMuted,
    },
    scannerOverlay: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
      backgroundColor: theme.colors.transparent,
      zIndex: 1,
    },
    scannerFrame: {
      width: '100%',
      maxWidth: 280,
      maxHeight: 280,
      aspectRatio: 1,
      borderRadius: Radii.card,
      borderWidth: 2,
      borderColor: hexWithAlpha(theme.colors.white, 0.92),
      backgroundColor: theme.colors.transparent,
    },
    fingerprintContainer: {
      ...commonStyles.centered,
      backgroundColor: theme.colors.transparent,
      gap: Space.xs,
    },
    row: {
      flexDirection: 'row',
      gap: isAndroid ? 12 : Space.md,
      width: '100%',
      paddingTop: isAndroid ? Space.md : Space.sm,
      backgroundColor: theme.colors.transparent,
    },
    btn: {
      ...commonStyles.centered,
      flex: 1,
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: hexWithAlpha(theme.colors.black, 0.35),
    },
    globeIcon: { opacity: 0.2 },
    greenBtnText: {
      color: theme.colors.success,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.subtitle,
    },
    cancelPressable: {
      ...commonStyles.centered,
      flex: 1,
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      backgroundColor: isAndroid
        ? theme.isDark
          ? hexWithAlpha(theme.colors.white, 0.08)
          : hexWithAlpha(theme.colors.black, 0.05)
        : theme.colors.cardPressed,
      borderWidth: isAndroid ? 0 : 1,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
      letterSpacing: isAndroid ? 0.1 : 0,
    },
    rejectPressable: {
      ...commonStyles.centered,
      flex: 1,
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      backgroundColor: `${theme.colors.error}1A`,
      borderWidth: isAndroid ? 0 : 1,
      borderColor: `${theme.colors.error}4D`,
    },
    rejectBtnText: {
      color: theme.colors.error,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
      letterSpacing: isAndroid ? 0.1 : 0,
    },
    confirmBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: isAndroid ? FontSize.body : FontSize.subtitle,
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
      backgroundColor: theme.colors.transparent,
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
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    input: {
      width: '100%',
      height: isAndroid ? 52 : 44,
      borderRadius: isAndroid ? 12 : Radii.md,
      borderWidth: isAndroid ? StyleSheet.hairlineWidth : 1,
      paddingHorizontal: Space.base,
      fontSize: FontSize.caption,
      textAlign: 'center',
      fontFamily: MonoFontFamily,
      letterSpacing: 1,
      color: theme.colors.text,
      borderColor: isAndroid
        ? theme.isDark
          ? hexWithAlpha(theme.colors.white, 0.12)
          : hexWithAlpha(theme.colors.black, 0.12)
        : theme.colors.borderSecondary,
      backgroundColor: isAndroid
        ? theme.isDark
          ? hexWithAlpha(theme.colors.white, 0.04)
          : hexWithAlpha(theme.colors.black, 0.03)
        : theme.colors.cardPressed,
    },
    requestedAtText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      textAlign: 'center',
      marginBottom: Space.sm,
      color: theme.colors.textSecondary,
    },
    subFpWrapper: {
      opacity: 0.4,
      marginBottom: Space.base,
      backgroundColor: theme.colors.transparent,
    },
    progressWrap: {
      width: '100%',
      paddingTop: Space.sm,
      backgroundColor: theme.colors.transparent,
    },
    fill: { height: '100%', borderRadius: 3 },
    progressFill: {
      backgroundColor: theme.colors.primary,
    },
    inputArea: { width: '100%', marginBottom: Space.xl, backgroundColor: theme.colors.transparent },
    greenBtn: {
      ...commonStyles.centered,
      width: '100%',
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 9999 : Radii.md,
      borderWidth: isAndroid ? 0 : 1,
      backgroundColor: isAndroid ? `${theme.colors.success}1A` : `${theme.colors.success}1A`,
      borderColor: `${theme.colors.success}33`,
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
          ? hexWithAlpha(theme.colors.white, 0.08)
          : hexWithAlpha(theme.colors.black, 0.06)
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
      color: theme.colors.white,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.subtitle,
    },
    progressLabel: {
      marginTop: Space.md,
      alignItems: 'center',
      backgroundColor: theme.colors.transparent,
    },
    labelText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      color: theme.colors.text,
    },
    fadeWrapper: {
      ...StyleSheet.absoluteFill,
      zIndex: 1000,
    },
    glassCardInner: {
      borderRadius: Radii.card,
    },
    scannerCamera: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      opacity: 0.3,
    },
  })
  return styles
}, useSafeAreaInsets)
