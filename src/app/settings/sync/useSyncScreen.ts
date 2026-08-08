import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'

import {
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@/lib/haptics'
import { pendingInviteState } from '@/lib/pendingInviteState'

function useSyncScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const localPreferences = useSelector(getLocalPreferences) as any
  const isSynced = localPreferences?.isSynced === 'true'
  const notes = useSelector(getNotes) as any[]

  const [tab, setTab] = useState<'link' | 'devices'>('link')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false)
  const [deviceToDeleteKey, setDeviceToDeleteKey] = useState<string | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scrollRef = useRef<ScrollView>(null)

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

  const handleCloseScanner = useCallback(() => {
    setScannerVisible(false)
    setHasScanned(false)
  }, [])

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

  const handleGenerateInvite = useCallback(() => {
    hapticLight()
    dispatch(createInvite())
  }, [dispatch])

  const handleScrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)
  }, [])

  const formatExpiry = useCallback(
    (ts: number | null) => {
      if (!ts) return t('sync.invite.permanent')
      const ms = ts < 10000000000 ? ts * 1000 : ts
      const d = new Date(ms)
      if (isNaN(d.getTime())) return t('sync.invite.permanent')
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return t('sync.invite.expiry', { time: timeStr })
    },
    [t],
  )

  const handleDeleteDevice = useCallback((deviceKey: string) => {
    hapticLight()
    setDeviceToDeleteKey(deviceKey)
    setDeleteSheetVisible(true)
  }, [])

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
    isLoading,
    syncedDevices,
    isSynced,
    handleCopy,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleGenerateInvite,
    handleScrollToEnd,
    formatExpiry,
    handleDeleteDevice,
    handleConfirmDelete,
  }
}

export default useSyncScreen
