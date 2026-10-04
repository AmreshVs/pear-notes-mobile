import { useCallback, useRef, useState } from 'react'
import { Linking, Platform, ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'

import { INVITE_KIND } from '@pear-notes/core/constant.js'
import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  deleteSyncedDevice,
  getLocalPreferences,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getSyncIsLoading, subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import {
  extractInvite,
  formatDeviceInvite,
  isInviteForOtherKind,
  isValidInvite,
} from '@pear-notes/core/utils.js'

import { useQrImageAttach } from '@/components/sync/useQrImageAttach'
import { useInviteLink } from '@/hooks/useInviteLink'
import { hapticLight, hapticMedium, hapticSelection, hapticWarning } from '@/lib/haptics'
import { pendingInviteState } from '@/lib/pendingInviteState'

function useSyncScreen() {
  const dispatch = useDispatch()

  const invite = useInviteLink(formatDeviceInvite)
  const isLoading = useSelector(getSyncIsLoading)
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const localPreferences = useSelector(getLocalPreferences) as any
  const isSynced = localPreferences?.isSynced === 'true'
  const showJoinSection = !isSynced
  const notes = useSelector(getNotes) as any[]

  const [tab, setTab] = useState<'link' | 'devices'>('devices')
  const [pasteCode, setPasteCode] = useState('')
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false)
  const [deviceToDeleteKey, setDeviceToDeleteKey] = useState<string | null>(null)

  const pasteIsDeviceInvite = isValidInvite(pasteCode, INVITE_KIND.DEVICE)
  const pasteIsVaultLink = isInviteForOtherKind(pasteCode, INVITE_KIND.DEVICE)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scrollRef = useRef<ScrollView>(null)

  const handleSelectTab = useCallback((next: 'link' | 'devices') => {
    hapticSelection()
    setTab(next)
  }, [])

  const handleConnect = useCallback(() => {
    if (pasteIsDeviceInvite) {
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
  }, [dispatch, pasteCode, pasteIsDeviceInvite, notes.length])

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

  const handleScrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)
  }, [])

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
    invite,
    pasteIsDeviceInvite,
    pasteIsVaultLink,
    isLoading,
    syncedDevices,
    isSynced,
    showJoinSection,
    handleConnect,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeScanned,
    handleAttachQrImage: attachQrImage,
    scanError,
    handleScrollToEnd,
    handleDeleteDevice,
    handleConfirmDelete,
  }
}

export default useSyncScreen
