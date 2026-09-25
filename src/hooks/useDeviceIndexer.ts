import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  canAddSyncLeader,
  canRemoveSyncLeader,
  clearIndexerError,
  getIndexerError,
  getIndexerErrorDeviceKey,
  getIndexerPendingKey,
  getIndexerPendingStep,
  getSyncLeaderPlan,
  setDeviceIndexer,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { hapticSuccess, hapticWarning } from '@/lib/haptics'
import { getIndexerErrorKey, getIndexerStepKey } from '@/utils/indexerUtils'

export function useDeviceIndexer(device: any) {
  const dispatch = useDispatch()
  const pendingKey = useSelector(getIndexerPendingKey)
  const pendingStep = useSelector(getIndexerPendingStep)
  const indexerError = useSelector(getIndexerError)
  const errorDeviceKey = useSelector(getIndexerErrorDeviceKey)
  const plan = useSelector(getSyncLeaderPlan) as any

  const [confirmMode, setConfirmMode] = useState<'add' | 'remove' | null>(null)

  const canAddLeader = canAddSyncLeader(device, plan)
  const canRemoveLeader = canRemoveSyncLeader(device, plan)
  const isTransferring = !!device?.key && pendingKey === device.key
  const stepKey = getIndexerStepKey(pendingStep)
  const errorKey = errorDeviceKey === device?.key ? getIndexerErrorKey(indexerError) : ''
  const isLocalTarget = device?.isLocal === true

  const open = useCallback(
    (mode: 'add' | 'remove') => {
      hapticWarning()
      dispatch(clearIndexerError())
      setConfirmMode(mode)
    },
    [dispatch],
  )

  const openAdd = useCallback(() => open('add'), [open])
  const openRemove = useCallback(() => open('remove'), [open])
  const closeConfirm = useCallback(() => setConfirmMode(null), [])

  const confirmChange = useCallback(() => {
    const mode = confirmMode
    setConfirmMode(null)
    if (!mode || !device?.localKey) return
    hapticSuccess()
    dispatch(
      setDeviceIndexer({
        key: device.key,
        localKey: device.localKey,
        isIndexer: mode === 'add',
      } as any),
    )
  }, [dispatch, confirmMode, device?.key, device?.localKey])

  return {
    plan,
    canAddLeader,
    canRemoveLeader,
    isTransferring,
    stepKey,
    errorKey,
    isLocalTarget,
    confirmMode,
    openAdd,
    openRemove,
    closeConfirm,
    confirmChange,
  }
}
