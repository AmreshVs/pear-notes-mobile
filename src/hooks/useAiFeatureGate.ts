import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { useStore } from 'react-redux'
import { router } from 'expo-router'

import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE_STATUS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  getLocalAiDevice,
  getLocalAiLoaded,
  selectLocalAiFeatureStatus,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { useShowAiTools } from '@/hooks/useShowAiTools'
import { useToast } from '@/providers/ToastContext'

const IN_PROGRESS_KEYS: Record<string, string> = {
  [LOCAL_AI_FEATURE_STATUS.DOWNLOADING]: 'downloading',
  [LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK]: 'waitingNetwork',
  [LOCAL_AI_FEATURE_STATUS.PAUSED]: 'paused',
}

export function useAiToolsVisible(noteLocked: boolean): boolean {
  const showAiTools = useShowAiTools()
  return LOCAL_AI_ENABLED && showAiTools && !noteLocked
}

export function useAiFeatureGate(): (feature: string) => boolean {
  const { t } = useTranslation()
  const store = useStore()
  const { showToast } = useToast()

  return useCallback(
    (feature: string) => {
      const state = store.getState()
      const loaded = getLocalAiLoaded(state) as boolean
      const status = loaded ? (selectLocalAiFeatureStatus(state, feature) as string) : null
      if (status === LOCAL_AI_FEATURE_STATUS.READY) return true

      const name = t(`settings.onDeviceAi.features.${feature}.title`)
      if (status === LOCAL_AI_FEATURE_STATUS.UNSUPPORTED) {
        const reason =
          (getLocalAiDevice(state) as { reason?: string | null })?.reason ?? 'store-build'
        showToast(
          t(`settings.onDeviceAi.unsupportedReason.${reason}`, {
            requirement: t(
              Platform.OS === 'android'
                ? 'settings.onDeviceAi.requirementAndroid'
                : 'settings.onDeviceAi.requirementIos',
            ),
          }),
        )
        return false
      }
      if (status === LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY) {
        showToast(t('localAi.gate.needsMemory', { feature: name }))
        return false
      }

      showToast(
        t(`localAi.gate.${(status && IN_PROGRESS_KEYS[status]) || 'setup'}`, { feature: name }),
      )
      router.push(`/settings/on-device-ai/feature?feature=${feature}` as never)
      return false
    },
    [showToast, store, t],
  )
}
