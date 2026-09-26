import { useCallback, useState } from 'react'
import { Linking, Platform } from 'react-native'
import { useCameraPermissions } from 'expo-camera'

import { useQrImageAttach } from '@/components/sync/useQrImageAttach'
import { hapticMedium } from '@/lib/haptics'

const SCAN_COOLDOWN_MS = 500

export function useInviteScanner(onInvite: (invite: string) => void) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [scannerVisible, setScannerVisible] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)

  const handleInviteFromImage = useCallback(
    (invite: string) => {
      onInvite(invite)
      setScannerVisible(false)
    },
    [onInvite],
  )

  const { scanError, clearScanError, attachQrImage } = useQrImageAttach(handleInviteFromImage)

  const requestPermission = useCallback(async () => {
    if (cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) {
      await Linking.openSettings()
      return cameraPermission
    }
    return requestCameraPermission()
  }, [cameraPermission, requestCameraPermission])

  const openScanner = useCallback(async () => {
    if (Platform.OS === 'ios' && !cameraPermission?.granted) {
      const result = await requestPermission()
      if (!result?.granted) return
    }
    setHasScanned(false)
    setScannerVisible(true)
  }, [cameraPermission?.granted, requestPermission])

  const closeScanner = useCallback(() => {
    setScannerVisible(false)
    setHasScanned(false)
    clearScanError()
  }, [clearScanError])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data || hasScanned) return
      hapticMedium()
      setHasScanned(true)
      onInvite(data.trim())
      setScannerVisible(false)
      setTimeout(() => setHasScanned(false), SCAN_COOLDOWN_MS)
    },
    [hasScanned, onInvite],
  )

  return {
    scannerVisible,
    hasScanned,
    scanError,
    cameraGranted: cameraPermission?.granted ?? false,
    openScanner,
    closeScanner,
    requestPermission,
    handleBarcodeScanned,
    attachQrImage,
  }
}
