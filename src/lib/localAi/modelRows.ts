import type { TFunction } from 'i18next'

import {
  LOCAL_AI_LICENSE,
  LOCAL_AI_MODEL_STATUS,
  LOCAL_AI_REGISTRY_MODELS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { computeModelUsers } from '@pear-notes/core/store/slices/localAiSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

type RegistryModels = Record<string, { bytes: number; license: string } | undefined>

export interface LocalAiModelState {
  status?: string
  downloadedBytes?: number
  totalBytes?: number
}

export interface LocalAiModelsState {
  loaded: boolean
  config: {
    features: Record<string, { enabled: boolean; tier: string; language: string } | undefined>
    downloaded?: Record<string, unknown>
  }
  models: Record<string, LocalAiModelState | undefined>
}

export interface OnDeviceAiModelRow {
  name: string
  bytes: number
  license: string
  status: string
  onDevice: boolean
  users: string[]
}

export interface OnDeviceAiDeleteConfirm {
  kind: 'model' | 'all'
  name?: string
  bytes: number
  users: string[]
}

const registry = LOCAL_AI_REGISTRY_MODELS as RegistryModels

export function buildModelRow(state: LocalAiModelsState, name: string): OnDeviceAiModelRow {
  const model = state.models[name]
  const expected = model?.totalBytes || registry[name]?.bytes || 0
  const bytes = !model
    ? expected
    : model.status === LOCAL_AI_MODEL_STATUS.READY
      ? expected
      : Math.min(model.downloadedBytes ?? 0, expected)
  return {
    name,
    bytes,
    license: registry[name]?.license ?? LOCAL_AI_LICENSE.PENDING,
    status: model?.status ?? LOCAL_AI_MODEL_STATUS.NONE,
    onDevice: !!model,
    users: computeModelUsers(state.config, name) as string[],
  }
}

export function getFeatureTitles(t: TFunction, features: string[]) {
  return features.map((feature) => t(`settings.onDeviceAi.features.${feature}.title`)).join(', ')
}

export function getModelSubtitle(t: TFunction, row: OnDeviceAiModelRow) {
  const usage = row.users.length
    ? t('settings.onDeviceAi.usedBy', { features: getFeatureTitles(t, row.users) })
    : t('settings.onDeviceAi.unused')
  return `${formatBytes(row.bytes)} · ${usage}`
}

export function getLicenseLabel(t: TFunction, row: OnDeviceAiModelRow) {
  return t('settings.onDeviceAi.license', {
    license: t(`settings.onDeviceAi.licenses.${row.license}`),
  })
}

export function getDeleteConfirmText(t: TFunction, confirm: OnDeviceAiDeleteConfirm) {
  const size = formatBytes(confirm.bytes)
  if (confirm.kind === 'all') {
    return {
      title: t('settings.onDeviceAi.deleteAllConfirm.title'),
      message: t('settings.onDeviceAi.deleteAllConfirm.message', { size }),
      confirmLabel: t('settings.onDeviceAi.deleteAllModels'),
    }
  }
  const model = t(`settings.onDeviceAi.modelNames.${confirm.name}`)
  return {
    title: t('settings.onDeviceAi.deleteModelConfirm.title', { model }),
    message: confirm.users.length
      ? t('settings.onDeviceAi.deleteModelConfirm.messageUsers', {
          size,
          features: getFeatureTitles(t, confirm.users),
        })
      : t('settings.onDeviceAi.deleteModelConfirm.message', { size }),
    confirmLabel: t('settings.onDeviceAi.deleteModel'),
  }
}
