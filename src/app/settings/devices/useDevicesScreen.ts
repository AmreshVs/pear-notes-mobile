import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Platform, ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useCameraPermissions } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'

import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  deleteSyncedDevice,
  getLocalPreferences,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getInviterStatus,
  getReceiverStatus,
  getSyncIsLoading,
  resetInvite,
  subscribePairUser,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { extractInvite, getInviteRemainingMs, isValidInvite } from '@pear-notes/core/utils.js'

import { useQrImageAttach } from '@/components/sync/useQrImageAttach'
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@/lib/haptics'
import { pendingInviteState } from '@/lib/pendingInviteState'
import { shareQrImage } from '@/lib/qrShare'

const INVITE_COUNTDOWN_TICK_MS = 1000
const INVITE_EXPIRY_WARNING_MS = 60 * 1000

type QrCodeRef = { toDataURL: (callback: (data: string) => void) => void }

function useSyncScreen() {
  const dispatch = useDispatch()

  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const localPreferences = useSelector(getLocalPreferences) as any
  const isSynced = localPreferences?.isSynced === 'true'
  const notes = useSelector(getNotes) as any[]

  const [tab, setTab] = useState<'link' | 'devices'>('devices')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false)
  const [deviceToDeleteKey, setDeviceToDeleteKey] = useState<string | null>(null)
  const [countdownTick, setCountdownTick] = useState(0)

  const [isSharingQr, setIsSharingQr] = useState(false)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scrollRef = useRef<ScrollView>(null)
  const qrRef = useRef<QrCodeRef | null>(null)

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const inviterStatusRef = useRef(inviterStatus)
  const receiverStatusRef = useRef(receiverStatus)

  useEffect(() => {
    inviterStatusRef.current = inviterStatus
    receiverStatusRef.current = receiverStatus
  }, [inviterStatus, receiverStatus])

  useEffect(() => {
    return () => {
      const inviterStep = inviterStatusRef.current?.step
      const receiverStep = receiverStatusRef.current?.step

      const isInviterActive =
        inviterStep && !['idle', 'generating', 'ready', 'searching'].includes(inviterStep)
      const isReceiverActive = receiverStep && !['idle', 'connecting'].includes(receiverStep)

      if (!isInviterActive && !isReceiverActive) {
        dispatch(resetInvite())
      }
    }
  }, [dispatch])

  useEffect(() => {
    if (!inviteCode || !expiresAt) return
    const timer = setInterval(() => setCountdownTick((n) => n + 1), INVITE_COUNTDOWN_TICK_MS)
    return () => clearInterval(timer)
  }, [inviteCode, expiresAt])

  const handleSelectTab = useCallback((next: 'link' | 'devices') => {
    hapticSelection()
    setTab(next)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    hapticSuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteCode])

  const handleConnect = useCallback(() => {
    if (isValidInvite(pasteCode)) {
      const rawInvite = extractInvite(pasteCode)
      if (notes.length > 0) {
        pendingInviteState.setPendingInvite(rawInvite)
        setPasteCode('')
        if (Platform.OS === 'ios') {
          router.dismissAll()
          router.back()
        } else {
          router.back()
        }
      } else {
        dispatch(subscribePairUser({ invite: rawInvite }))
        setPasteCode('')
        if (Platform.OS === 'ios') {
          router.dismissAll()
          router.back()
        } else {
          router.back()
        }
      }
    }
  }, [dispatch, pasteCode, notes.length])

  const handleRequestCameraPermission = useCallback(async () => {
    if (cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) {
      await Linking.openSettings()
      return cameraPermission
    }
    return requestCameraPermission()
  }, [cameraPermission, requestCameraPermission])

  const handleOpenScanner = useCallback(async () => {
    if (Platform.OS === 'ios') {
      if (!cameraPermission?.granted) {
        const result = await handleRequestCameraPermission()
        if (!result?.granted) return
      }
    }
    setHasScanned(false)
    setScannerVisible(true)
  }, [cameraPermission?.granted, handleRequestCameraPermission])

  const handleInviteFromImage = useCallback((invite: string) => {
    setPasteCode(invite)
    setScannerVisible(false)
  }, [])

  const { scanError, clearScanError, attachQrImage } = useQrImageAttach(handleInviteFromImage)

  const handleCloseScanner = useCallback(() => {
    setScannerVisible(false)
    setHasScanned(false)
    clearScanError()
  }, [clearScanError])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      hapticMedium()
      setHasScanned(true)
      setPasteCode(data.trim())
      setScannerVisible(false)
      setTimeout(() => setHasScanned(false), 500)
    },
    [hasScanned],
  )

  const handleQrRef = useCallback((instance: QrCodeRef | null) => {
    qrRef.current = instance
  }, [])

  const handleShareQr = useCallback(async () => {
    if (!qrRef.current || isSharingQr) return
    hapticLight()
    setIsSharingQr(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('QR_RENDER_TIMEOUT')), 4000)
        qrRef.current?.toDataURL((data) => {
          clearTimeout(timer)
          resolve(data)
        })
      })
      await shareQrImage(base64, '')
    } catch (error) {
      console.error('handleShareQr', error)
      hapticError()
    } finally {
      setIsSharingQr(false)
    }
  }, [isSharingQr])

  const handleGenerateInvite = useCallback(() => {
    hapticLight()
    dispatch(createInvite())
  }, [dispatch])

  const handleScrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)
  }, [])

  const handleDeleteDevice = useCallback((deviceKey: string) => {
    hapticLight()
    setDeviceToDeleteKey(deviceKey)
    setDeleteSheetVisible(true)
  }, [])

  const inviteRemainingMs = useMemo(
    () => getInviteRemainingMs(expiresAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expiresAt, countdownTick],
  )
  const inviteExpired = !!inviteCode && !!expiresAt && inviteRemainingMs <= 0
  const inviteExpiringSoon =
    !inviteExpired && inviteRemainingMs > 0 && inviteRemainingMs <= INVITE_EXPIRY_WARNING_MS

  const handleConfirmDelete = useCallback(() => {
    setDeleteSheetVisible(false)
    if (deviceToDeleteKey) {
      hapticWarning()
      dispatch(deleteSyncedDevice({ key: deviceToDeleteKey }))
    }
  }, [dispatch, deviceToDeleteKey])

  return {
    tab,
    handleSelectTab,
    copied,
    pasteCode,
    setPasteCode,
    scannerVisible,
    setScannerVisible,
    hasScanned,
    deleteSheetVisible,
    setDeleteSheetVisible,
    cameraPermission,
    requestCameraPermission,
    handleRequestCameraPermission,
    scrollRef,
    inviteCode,
    expiresAt,
    inviteRemainingMs,
    inviteExpired,
    inviteExpiringSoon,
    isLoading,
    syncedDevices,
    isSynced,
    handleCopy,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleGenerateInvite,
    handleShareQr,
    handleAttachQrImage: attachQrImage,
    isSharingQr,
    scanError,
    handleQrRef,
    handleScrollToEnd,
    handleDeleteDevice,
    handleConfirmDelete,
  }
}

export default useSyncScreen
