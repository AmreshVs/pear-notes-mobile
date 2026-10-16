import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  deleteSyncedDevice,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { useOpenVault } from '@/hooks/useOpenVault'
import { hapticLight, hapticWarning } from '@/lib/haptics'

function useDevicesScreen() {
  const dispatch = useDispatch()
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const { openVault, hasSeveralVaults } = useOpenVault()

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false)
  const [deviceToDeleteKey, setDeviceToDeleteKey] = useState<string | null>(null)

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
    openVault,
    hasSeveralVaults,
    deleteSheetVisible,
    setDeleteSheetVisible,
    syncedDevices,
    handleDeleteDevice,
    handleConfirmDelete,
  }
}

export default useDevicesScreen
