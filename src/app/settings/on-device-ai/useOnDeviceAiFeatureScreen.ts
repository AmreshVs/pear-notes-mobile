import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  getFeatureLanguages,
  getFeatureRegistryNames,
  getFeatureTiers,
  getRegistryNamesBytes,
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE_IDS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  deleteLocalAiModel,
  getLocalAiState,
  initLocalAi,
  setLocalAiFeatureLanguage,
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
  selected: boolean
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
  const featureConfig = featureId ? state.config.features[featureId] : undefined

  const tiers = useMemo<OnDeviceAiTierOption[]>(() => {
    if (!featureId) return []
    const available = getFeatureTiers(featureId) as string[]
    if (available.length < 2) return []
    return available.map((tier) => ({
      tier,
      bytes: getRegistryNamesBytes(
        getFeatureRegistryNames(featureId, { tier, language: featureConfig?.language }),
      ) as number,
      selected: featureConfig?.tier === tier,
    }))
  }, [featureConfig?.language, featureConfig?.tier, featureId])

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
    return (getFeatureRegistryNames(featureId, featureConfig) as string[]).map((name) =>
      buildModelRow(state, name),
    )
  }, [featureConfig, featureId, state])

  const selectTier = useCallback(
    (tier: string) => {
      if (!featureId || featureConfig?.tier === tier) return
      hapticSelection()
      send(setLocalAiFeatureTier, { feature: featureId, tier })
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
