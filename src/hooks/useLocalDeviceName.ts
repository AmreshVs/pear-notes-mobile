import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as Device from 'expo-device'

import { DEVICE_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import {
  getSyncedDevices,
  updateSyncedDevice,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { isRawDeviceKey } from '@pear-notes/core/utils.js'

export function useLocalDeviceName() {
  const dispatch = useDispatch()
  const syncedDevices = useSelector(getSyncedDevices) as any[]
  const appliedRef = useRef(false)

  useEffect(() => {
    if (appliedRef.current) return

    const localDevice = syncedDevices.find((device) => device.isLocal)
    if (!localDevice) return

    if (localDevice.title && !isRawDeviceKey(localDevice.title)) {
      appliedRef.current = true
      return
    }

    const modelName = (Device.modelName || '').trim()
    if (!modelName) return

    appliedRef.current = true
    dispatch(
      updateSyncedDevice({
        key: localDevice.key,
        title: modelName.slice(0, DEVICE_NAME_MAX_LENGTH),
      } as any),
    )
  }, [dispatch, syncedDevices])
}
