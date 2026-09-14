import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  deleteAllLocalAiModels,
  deleteLocalAiModel,
  getLocalAiState,
  initLocalAi,
  selectLocalAiBytesOnDisk,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { hapticLight, hapticWarning } from '@/lib/haptics'
import {
  buildModelRow,
  type LocalAiModelsState,
  type OnDeviceAiDeleteConfirm,
  type OnDeviceAiModelRow,
} from '@/lib/localAi/modelRows'

function useOnDeviceAiModelsScreen() {
  const dispatch = useDispatch()
  const state = useSelector(getLocalAiState) as LocalAiModelsState
  const bytesOnDisk = (useSelector(selectLocalAiBytesOnDisk) as number) ?? 0
  const [confirm, setConfirm] = useState<OnDeviceAiDeleteConfirm | null>(null)

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !state.loaded) dispatch(initLocalAi())
  }, [dispatch, state.loaded])

  const models = useMemo<OnDeviceAiModelRow[]>(() => {
    const names = new Set([
      ...Object.keys(state.models),
      ...Object.keys(state.config.downloaded ?? {}),
    ])
    return [...names].map((name) => buildModelRow(state, name)).filter((row) => row.onDevice)
  }, [state])

  const requestDeleteModel = useCallback((row: OnDeviceAiModelRow) => {
    hapticLight()
    setConfirm({ kind: 'model', name: row.name, bytes: row.bytes, users: row.users })
  }, [])

  const requestDeleteAll = useCallback(() => {
    hapticLight()
    setConfirm({ kind: 'all', bytes: bytesOnDisk, users: [] })
  }, [bytesOnDisk])

  const confirmDelete = useCallback(() => {
    if (!confirm) return
    hapticWarning()
    if (confirm.kind === 'all') dispatch(deleteAllLocalAiModels())
    else if (confirm.name)
      dispatch({ type: deleteLocalAiModel.type, payload: { name: confirm.name } })
    setConfirm(null)
  }, [confirm, dispatch])

  const dismissConfirm = useCallback(() => {
    setConfirm(null)
  }, [])

  return {
    loaded: state.loaded,
    models,
    bytesOnDisk,
    confirm,
    requestDeleteModel,
    requestDeleteAll,
    confirmDelete,
    dismissConfirm,
  }
}

export default useOnDeviceAiModelsScreen
