import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearIndexerError,
  getIndexerDevice,
  getIndexerError,
  getIndexerErrorDeviceKey,
  getIndexerPendingKey,
  getIndexerPendingStep,
  setDeviceIndexer,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { hapticSuccess, hapticWarning } from '@/lib/haptics'
import { canPromoteDevice, getIndexerErrorKey, getIndexerStepKey } from '@/utils/indexerUtils'

export function useDeviceIndexer(device: any) {
  const dispatch = useDispatch()
  const pendingKey = useSelector(getIndexerPendingKey)
  const pendingStep = useSelector(getIndexerPendingStep)
  const indexerError = useSelector(getIndexerError)
  const errorDeviceKey = useSelector(getIndexerErrorDeviceKey)
  const currentIndexer = useSelector(getIndexerDevice)

  const [confirmVisible, setConfirmVisible] = useState(false)

  const canPromote = canPromoteDevice(device)
  const isTransferring = !!device?.key && pendingKey === device.key
  const stepKey = getIndexerStepKey(pendingStep)
  const errorKey = errorDeviceKey === device?.key ? getIndexerErrorKey(indexerError) : ''
  const isLocalTarget = device?.isLocal === true
  const outgoingName = currentIndexer ? getDeviceDisplayName(currentIndexer) : ''

  const openConfirm = useCallback(() => {
    hapticWarning()
    dispatch(clearIndexerError())
    setConfirmVisible(true)
  }, [dispatch])

  const closeConfirm = useCallback(() => {
    setConfirmVisible(false)
  }, [])

  const confirmTransfer = useCallback(() => {
    setConfirmVisible(false)
    if (!device?.localKey) return
    hapticSuccess()
    dispatch(
      setDeviceIndexer({ key: device.key, localKey: device.localKey, isIndexer: true } as any),
    )
  }, [dispatch, device?.key, device?.localKey])

  return {
    canPromote,
    isTransferring,
    stepKey,
    errorKey,
    isLocalTarget,
    outgoingName,
    confirmVisible,
    openConfirm,
    closeConfirm,
    confirmTransfer,
  }
}
