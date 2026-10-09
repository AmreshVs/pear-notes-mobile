import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE_STATUS,
  LOCAL_AI_GROUPS,
  LOCAL_AI_NETWORK,
  LOCAL_AI_NOTICE,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  cancelLocalAiFeatureDownload,
  clearLocalAiNotice,
  computeFeatureRow,
  computeReleasableBytes,
  computeReleasableNames,
  disableLocalAiFeature,
  downloadLocalAiModelNow,
  enableLocalAiFeature,
  getDuplicateNotesState,
  getLocalAiState,
  initLocalAi,
  loadDuplicateNotes,
  pauseLocalAiDownload,
  resumeLocalAiDownload,
  selectLocalAiBytesOnDisk,
  setLocalAiWifiOnly,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getDuplicatePairRows } from '@pear-notes/core/store/slices/notesSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { hapticLight, hapticSelection, hapticWarning } from '@/lib/haptics'

export interface OnDeviceAiDevice {
  status: string
  reason: string | null
  totalMemoryBytes: number
  freeDiskBytes: number
}

export interface OnDeviceAiNotice {
  type: string
  feature?: string
  requiredBytes?: number
  shortBytes?: number
}

interface LocalAiScreenState {
  loaded: boolean
  device: OnDeviceAiDevice
  network: string
  config: {
    wifiOnly: boolean
    features: Record<string, { enabled: boolean } | undefined>
  }
  models: Record<string, unknown>
  notice: OnDeviceAiNotice | null
  index: { enabled: boolean; changedAt: number }
}

export interface OnDeviceAiFeatureRow {
  feature: string
  enabled: boolean
  status: string
  percent: number
  downloadedBytes: number
  totalBytes: number
  missingBytes: number
  activeModel: string | null
}

export interface OnDeviceAiGroup {
  id: string
  features: OnDeviceAiFeatureRow[]
}

export interface OnDeviceAiConfirm {
  kind: 'turnOn' | 'turnOff'
  feature: string
  bytes: number
  waitsForNetwork: boolean
}

const DOWNLOAD_BLOCKING_NETWORKS = [
  LOCAL_AI_NETWORK.CELLULAR,
  LOCAL_AI_NETWORK.METERED,
  LOCAL_AI_NETWORK.OFFLINE,
]

function useOnDeviceAiScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const state = useSelector(getLocalAiState) as LocalAiScreenState
  const bytesOnDisk = (useSelector(selectLocalAiBytesOnDisk) as number) ?? 0
  const duplicates = useSelector(getDuplicateNotesState) as { status: string }
  const duplicatePairs = useSelector(getDuplicatePairRows) as unknown[]
  const [confirm, setConfirm] = useState<OnDeviceAiConfirm | null>(null)

  const send = useCallback(
    (actionCreator: { type: string }, payload?: unknown) =>
      dispatch({ type: actionCreator.type, payload }),
    [dispatch],
  )

  useEffect(() => {
    if (LOCAL_AI_ENABLED) dispatch(initLocalAi())
  }, [dispatch])

  const indexEnabled = state.index.enabled
  const indexChangedAt = state.index.changedAt
  useEffect(() => {
    if (LOCAL_AI_ENABLED && indexEnabled) dispatch(loadDuplicateNotes())
  }, [dispatch, indexEnabled, indexChangedAt])

  const isUnsupported = state.device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED

  const groups = useMemo<OnDeviceAiGroup[]>(
    () =>
      LOCAL_AI_GROUPS.map((group) => ({
        id: group.id,
        features: group.features.map(
          (feature) => computeFeatureRow(state, feature) as OnDeviceAiFeatureRow,
        ),
      })),
    [state],
  )

  const getStatusLabel = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      const progress = {
        percent: row.percent,
        downloaded: formatBytes(row.downloadedBytes),
        total: formatBytes(row.totalBytes),
      }
      const onDemandRow = row as OnDeviceAiFeatureRow & {
        onDemand?: boolean
        onDemandBytes?: number
      }
      if (onDemandRow.onDemand && row.status === LOCAL_AI_FEATURE_STATUS.OFF) {
        return t('settings.onDeviceAi.featureStatus.offOnDemand')
      }
      if (onDemandRow.onDemand && row.status === LOCAL_AI_FEATURE_STATUS.READY) {
        return onDemandRow.onDemandBytes
          ? t('settings.onDeviceAi.featureStatus.readyOnDemand', {
              size: formatBytes(onDemandRow.onDemandBytes),
            })
          : t('settings.onDeviceAi.featureStatus.readyOnDemandEmpty')
      }
      switch (row.status) {
        case LOCAL_AI_FEATURE_STATUS.OFF:
          return row.missingBytes > 0
            ? t('settings.onDeviceAi.featureStatus.off', { size: formatBytes(row.missingBytes) })
            : t('settings.onDeviceAi.featureStatus.offDownloaded')
        case LOCAL_AI_FEATURE_STATUS.READY:
          return t('settings.onDeviceAi.featureStatus.ready', { size: formatBytes(row.totalBytes) })
        case LOCAL_AI_FEATURE_STATUS.DOWNLOADING:
          return t('settings.onDeviceAi.featureStatus.downloading', progress)
        case LOCAL_AI_FEATURE_STATUS.PAUSED:
          return t('settings.onDeviceAi.featureStatus.paused', progress)
        case LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK:
          return t('settings.onDeviceAi.featureStatus.waitingNetwork', {
            size: formatBytes(row.missingBytes),
          })
        case LOCAL_AI_FEATURE_STATUS.FAILED:
          return t('settings.onDeviceAi.featureStatus.failed', { percent: row.percent })
        case LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY:
          return t('settings.onDeviceAi.featureStatus.needsMemory')
        default:
          return ''
      }
    },
    [t],
  )

  const toggleFeature = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      if (isUnsupported || !state.loaded) return
      hapticSelection()
      if (!row.enabled) {
        if (row.missingBytes === 0) {
          send(enableLocalAiFeature, { feature: row.feature })
          return
        }
        setConfirm({
          kind: 'turnOn',
          feature: row.feature,
          bytes: row.missingBytes,
          waitsForNetwork:
            state.config.wifiOnly && DOWNLOAD_BLOCKING_NETWORKS.includes(state.network),
        })
        return
      }
      if ((computeReleasableNames(state, row.feature) as string[]).length === 0) {
        send(disableLocalAiFeature, { feature: row.feature, deleteModels: false })
        return
      }
      setConfirm({
        kind: 'turnOff',
        feature: row.feature,
        bytes: computeReleasableBytes(state, row.feature) as number,
        waitsForNetwork: false,
      })
    },
    [isUnsupported, send, state],
  )

  const confirmTurnOn = useCallback(() => {
    if (!confirm) return
    hapticLight()
    send(enableLocalAiFeature, { feature: confirm.feature })
    setConfirm(null)
  }, [confirm, send])

  const confirmTurnOff = useCallback(
    (deleteModels: boolean) => {
      if (!confirm) return
      if (deleteModels) hapticWarning()
      else hapticLight()
      send(disableLocalAiFeature, { feature: confirm.feature, deleteModels })
      setConfirm(null)
    },
    [confirm, send],
  )

  const dismissConfirm = useCallback(() => {
    setConfirm(null)
  }, [])

  const pauseDownload = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      if (!row.activeModel) return
      hapticLight()
      send(pauseLocalAiDownload, { name: row.activeModel })
    },
    [send],
  )

  const resumeDownload = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      if (!row.activeModel) return
      hapticLight()
      send(resumeLocalAiDownload, { name: row.activeModel })
    },
    [send],
  )

  const downloadNow = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      if (!row.activeModel) return
      hapticLight()
      send(downloadLocalAiModelNow, { name: row.activeModel })
    },
    [send],
  )

  const cancelDownload = useCallback(
    (row: OnDeviceAiFeatureRow) => {
      hapticWarning()
      send(cancelLocalAiFeatureDownload, { feature: row.feature })
    },
    [send],
  )

  const toggleWifiOnly = useCallback(() => {
    if (isUnsupported) return
    hapticSelection()
    send(setLocalAiWifiOnly, !state.config.wifiOnly)
  }, [isUnsupported, send, state.config.wifiOnly])

  const dismissNotice = useCallback(() => {
    dispatch(clearLocalAiNotice())
  }, [dispatch])

  const notice = state.notice?.type === LOCAL_AI_NOTICE.INSUFFICIENT_SPACE ? state.notice : null

  return {
    loaded: state.loaded,
    device: state.device,
    isUnsupported,
    wifiOnly: state.config.wifiOnly,
    bytesOnDisk,
    indexEnabled,
    duplicateCount: duplicates.status === 'done' ? duplicatePairs.length : null,
    groups,
    confirm,
    notice,
    getStatusLabel,
    toggleFeature,
    confirmTurnOn,
    confirmTurnOff,
    dismissConfirm,
    pauseDownload,
    resumeDownload,
    downloadNow,
    cancelDownload,
    toggleWifiOnly,
    dismissNotice,
  }
}

export default useOnDeviceAiScreen
