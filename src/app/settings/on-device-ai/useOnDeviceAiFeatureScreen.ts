import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  canRunFeature,
  canRunModels,
  getAskModelChoices,
  getFeatureLanguages,
  getFeatureRegistryNames,
  getFeatureTiers,
  getOnDemandModelNames,
  getRegistryNamesBytes,
  getTextModelLabel,
  getTextTaskModel,
  isDesktopPlatform,
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE,
  LOCAL_AI_FEATURE_IDS,
  LOCAL_AI_REGISTRY_MODELS,
  LOCAL_AI_TEXT_TASK,
  LOCAL_AI_TIER,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  deleteLocalAiModel,
  getLocalAiState,
  initLocalAi,
  setLocalAiFeatureLanguage,
  setLocalAiFeatureModel,
  setLocalAiFeatureTier,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { hapticLight, hapticSelection, hapticWarning } from '@/lib/haptics'
import {
  buildModelRow,
  type LocalAiModelsState,
  type OnDeviceAiDeleteConfirm,
  type OnDeviceAiModelRow,
} from '@/lib/localAi/modelRows'

export interface OnDeviceAiTierOption {
  tier: string
  bytes: number
  modelLabel: string
  selected: boolean
  fits: boolean
}

export interface OnDeviceAiAdvancedChoice {
  key: string
  model: string | null
  modelLabel: string
  bytes: number
  selected: boolean
  fits: boolean
  largeOnPhone: boolean
}

export type OnDeviceAiRouting = {
  ask: string
  write: string
}

export interface OnDeviceAiLanguageOption {
  language: string
  selected: boolean
}

function useOnDeviceAiFeatureScreen(feature: string | undefined) {
  const dispatch = useDispatch()
  const state = useSelector(getLocalAiState) as LocalAiModelsState
  const [confirm, setConfirm] = useState<OnDeviceAiDeleteConfirm | null>(null)

  const send = useCallback(
    (actionCreator: { type: string }, payload?: unknown) =>
      dispatch({ type: actionCreator.type, payload }),
    [dispatch],
  )

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !state.loaded) dispatch(initLocalAi())
  }, [dispatch, state.loaded])

  const featureId = feature && (LOCAL_AI_FEATURE_IDS as string[]).includes(feature) ? feature : null
  const featureConfig = (featureId ? state.config.features[featureId] : undefined) as
    | { tier?: string; language?: string; model?: string | null }
    | undefined
  const [advancedOpen, setAdvancedOpen] = useState<boolean | null>(null)
  const device = (state as { device?: { totalMemoryBytes?: number; platform?: string } }).device
  const totalMemoryBytes = device?.totalMemoryBytes ?? 0
  const platform = device?.platform ?? ''
  const textDevice = useMemo(() => ({ platform, totalMemoryBytes }), [platform, totalMemoryBytes])
  const isTextFeature = featureId === LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS
  const modelChosen = Boolean(featureConfig?.model)
  const advancedExpanded = advancedOpen ?? modelChosen

  const tiers = useMemo<OnDeviceAiTierOption[]>(() => {
    if (!featureId) return []
    const available = getFeatureTiers(featureId) as string[]
    if (available.length < 2) return []
    return available.map((tier) => ({
      tier,
      bytes: getRegistryNamesBytes(
        getFeatureRegistryNames(featureId, { ...featureConfig, tier }),
      ) as number,
      modelLabel: isTextFeature
        ? (getTextModelLabel(
            getTextTaskModel({ ...featureConfig, tier }, LOCAL_AI_TEXT_TASK.ASK, textDevice),
          ) as string)
        : '',
      selected: featureConfig?.tier === tier,
      fits: canRunFeature(featureId, { ...featureConfig, tier }, totalMemoryBytes) as boolean,
    }))
  }, [featureConfig, featureId, isTextFeature, textDevice, totalMemoryBytes])

  const routing = useMemo<OnDeviceAiRouting | null>(() => {
    if (!isTextFeature || featureConfig?.tier !== LOCAL_AI_TIER.BEST) return null
    return {
      ask: getTextModelLabel(
        getTextTaskModel(featureConfig, LOCAL_AI_TEXT_TASK.ASK, textDevice),
      ) as string,
      write: getTextModelLabel(
        getTextTaskModel(featureConfig, LOCAL_AI_TEXT_TASK.WRITE, textDevice),
      ) as string,
    }
  }, [featureConfig, isTextFeature, textDevice])

  const advancedChoices = useMemo<OnDeviceAiAdvancedChoice[]>(() => {
    if (!isTextFeature) return []
    const onBest = featureConfig?.tier === LOCAL_AI_TIER.BEST
    const autoModel = getTextTaskModel(
      { ...featureConfig, tier: LOCAL_AI_TIER.BEST, model: null },
      LOCAL_AI_TEXT_TASK.ASK,
      textDevice,
    ) as string
    return [
      {
        key: 'auto',
        model: null,
        modelLabel: getTextModelLabel(autoModel) as string,
        bytes: 0,
        selected: onBest && !featureConfig?.model,
        fits: true,
        largeOnPhone: false,
      },
      ...(getAskModelChoices(textDevice) as string[]).map((model) => ({
        key: model,
        model,
        modelLabel: getTextModelLabel(model) as string,
        bytes:
          (LOCAL_AI_REGISTRY_MODELS as Record<string, { bytes: number } | undefined>)[model]
            ?.bytes ?? 0,
        selected: onBest && featureConfig?.model === model,
        fits: canRunModels([model], totalMemoryBytes) as boolean,
        largeOnPhone: !isDesktopPlatform(platform) && model.startsWith('QWEN3_4B'),
      })),
    ]
  }, [featureConfig, isTextFeature, platform, textDevice, totalMemoryBytes])

  const languages = useMemo<OnDeviceAiLanguageOption[]>(() => {
    if (!featureId) return []
    const available = getFeatureLanguages(featureId) as string[]
    if (available.length < 2) return []
    return available.map((language) => ({
      language,
      selected: featureConfig?.language === language,
    }))
  }, [featureConfig?.language, featureId])

  const models = useMemo<OnDeviceAiModelRow[]>(() => {
    if (!featureId) return []
    return [
      ...(getFeatureRegistryNames(featureId, featureConfig) as string[]),
      ...(getOnDemandModelNames(featureId, state.models) as string[]),
    ].map((name) => buildModelRow(state, name))
  }, [featureConfig, featureId, state])

  const selectTier = useCallback(
    (tier: string) => {
      if (!featureId || featureConfig?.tier === tier) return
      hapticSelection()
      send(setLocalAiFeatureTier, { feature: featureId, tier })
    },
    [featureConfig, featureId, send],
  )

  const toggleAdvanced = useCallback(() => {
    hapticSelection()
    setAdvancedOpen(!advancedExpanded)
  }, [advancedExpanded])

  const selectModel = useCallback(
    (model: string | null) => {
      if (!featureId) return
      hapticSelection()
      send(setLocalAiFeatureModel, { feature: featureId, model })
      if (featureConfig?.tier !== LOCAL_AI_TIER.BEST) {
        send(setLocalAiFeatureTier, { feature: featureId, tier: LOCAL_AI_TIER.BEST })
      }
    },
    [featureConfig?.tier, featureId, send],
  )

  const selectLanguage = useCallback(
    (language: string) => {
      if (!featureId || featureConfig?.language === language) return
      hapticSelection()
      send(setLocalAiFeatureLanguage, { feature: featureId, language })
    },
    [featureConfig?.language, featureId, send],
  )

  const requestDeleteModel = useCallback((row: OnDeviceAiModelRow) => {
    hapticLight()
    setConfirm({ kind: 'model', name: row.name, bytes: row.bytes, users: row.users })
  }, [])

  const confirmDelete = useCallback(() => {
    if (!confirm?.name) return
    hapticWarning()
    send(deleteLocalAiModel, { name: confirm.name })
    setConfirm(null)
  }, [confirm, send])

  const dismissConfirm = useCallback(() => {
    setConfirm(null)
  }, [])

  return {
    featureId,
    tiers,
    routing,
    advancedChoices,
    advancedExpanded,
    toggleAdvanced,
    selectModel,
    languages,
    models,
    confirm,
    selectTier,
    selectLanguage,
    requestDeleteModel,
    confirmDelete,
    dismissConfirm,
  }
}

export default useOnDeviceAiFeatureScreen
