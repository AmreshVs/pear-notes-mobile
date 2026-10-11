import { useCallback, useEffect, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  getIndexProgress,
  loadIndexBytes,
  nextIndexSample,
} from '@pear-notes/core/store/services/localAiIndexProgress.js'
import {
  enableLocalAiIndex,
  getAiSuggestions,
  getLinkedDesktopTitle,
  getLocalAiIndex,
  loadAiSuggestionPrefs,
  selectCanUseLinkedDesktop,
  selectIndexCoverage,
  selectIsLocalAiFeatureReady,
  selectLocalAiFeatureDisplayNames,
  setAiSuggestion,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { loadIndexOnlyWhileCharging, saveIndexOnlyWhileCharging } from '@/lib/backgroundIndexTask'
import { hapticSelection } from '@/lib/haptics'

import type { IndexProgressView } from './onDeviceAiExtras.types'

const ANSWER_FEATURE = LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS

export function useIndexProgress() {
  const index = useSelector(getLocalAiIndex) as { enabled: boolean; changedAt?: number }
  const coverage = useSelector(selectIndexCoverage)
  const [sample, setSample] = useState<unknown>(null)
  const [bytes, setBytes] = useState<number | null>(null)
  const nextSample = nextIndexSample(sample, index)
  if (nextSample !== sample) setSample(nextSample)
  const progress = getIndexProgress({ index, coverage, sample: nextSample }) as IndexProgressView

  useEffect(() => {
    if (!index.enabled) return
    let live = true
    loadIndexBytes(backendApi)
      .then((value: number | null) => live && setBytes(value))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [index.enabled, index.changedAt])

  return { progress, bytes }
}

export function useIndexOnlyWhileCharging() {
  const dispatch = useDispatch()
  const [on, setOn] = useState(true)

  useEffect(() => {
    let live = true
    loadIndexOnlyWhileCharging().then((value) => live && setOn(value))
    return () => {
      live = false
    }
  }, [])

  const toggle = useCallback(() => {
    hapticSelection()
    const next = !on
    setOn(next)
    dispatch({ type: enableLocalAiIndex.type, payload: { waitForCharging: next } })
    saveIndexOnlyWhileCharging(next).catch(() => {})
  }, [dispatch, on])

  return { on, toggle }
}

export function useSuggestionPrefs() {
  const dispatch = useDispatch()
  const prefs = useSelector(getAiSuggestions, shallowEqual) as Record<string, boolean | undefined>

  useEffect(() => {
    dispatch(loadAiSuggestionPrefs())
  }, [dispatch])

  const toggle = useCallback(
    (kind: string) => {
      hapticSelection()
      dispatch(setAiSuggestion({ kind, on: prefs[kind] === false } as never))
    },
    [dispatch, prefs],
  )

  return { prefs, toggle }
}

export function useAnswers() {
  const names = useSelector(
    (state) => selectLocalAiFeatureDisplayNames(state, ANSWER_FEATURE) as string[],
    shallowEqual,
  )
  const ready = useSelector((state) =>
    selectIsLocalAiFeatureReady(state, ANSWER_FEATURE),
  ) as boolean
  const macTitle = useSelector(getLinkedDesktopTitle) as string
  const macAvailable = useSelector(selectCanUseLinkedDesktop) as boolean
  return { deviceModels: ready ? names.join(', ') : null, macTitle, macAvailable }
}
