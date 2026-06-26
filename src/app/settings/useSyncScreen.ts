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
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'
import { useCameraPermissions } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

export function useSyncScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const localPreferences = useSelector(getLocalPreferences) as any
  const isSynced = localPreferences?.isSynced === 'true'

  const [tab, setTab] = useState<'link' | 'devices'>('link')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false)
  const [deviceToDeleteKey, setDeviceToDeleteKey] = useState<string | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scrollRef = useRef<ScrollView>(null)

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteCode])

  const handleConnect = useCallback(() => {
    if (isValidInvite(pasteCode)) {
      const rawInvite = extractInvite(pasteCode)
      dispatch(subscribePairUser({ invite: rawInvite } as any))
      setPasteCode('')
    }
  }, [dispatch, pasteCode])

  const handleOpenScanner = useCallback(async () => {
    if (Platform.OS === 'ios') {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission()
        if (!result.granted) return
      }
    }
    setHasScanned(false)
    setScannerVisible(true)
  }, [cameraPermission?.granted, requestCameraPermission])

  const handleCloseScanner = useCallback(() => {
    setScannerVisible(false)
    setHasScanned(false)
  }, [])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      setHasScanned(true)
      setPasteCode(data.trim())
      setScannerVisible(false)
      setTimeout(() => setHasScanned(false), 500)
    },
    [hasScanned],
  )

  const handleGenerateInvite = useCallback(() => {
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
    setDeviceToDeleteKey(deviceKey)
    setDeleteSheetVisible(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    setDeleteSheetVisible(false)
    if (deviceToDeleteKey) {
      dispatch(deleteSyncedDevice({ key: deviceToDeleteKey } as any))
    }
  }, [dispatch, deviceToDeleteKey])

  return {
    tab,
    setTab,
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
