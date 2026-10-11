import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useStore } from 'react-redux'
import { type Href, useRouter } from 'expo-router'

import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  canSummarizeShare,
  shareSummaryInput,
} from '@pear-notes/core/store/services/shareSummary.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getLocalAiFeatureConfig,
  selectIsTextAiAvailable,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import type { SharedItem } from '@/lib/shareIntake.types'
import {
  isSharedPdf,
  prepareShareSummaryText,
  suggestFolderForShare,
  summarizeShare,
} from '@/lib/shareSummary'
import { setShareSummary, shareSummaryKey, useShareSummaryState } from '@/lib/shareSummaryState'

export const MAX_SUMMARY_KEY_POINTS = 6

export function useShareSummary(items: SharedItem[]) {
  const store = useStore()
  const router = useRouter()
  const stored = useShareSummaryState()
  const textAiAvailable = useSelector(selectIsTextAiAvailable) as boolean
  const featureConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as object | undefined
  const [expanded, setExpanded] = useState(false)
  const runIdRef = useRef(0)
  const configRef = useRef(featureConfig)
  configRef.current = featureConfig

  const key = useMemo(() => shareSummaryKey(items), [items])
  const current = stored.key === key ? stored : null

  const canSummarize = useMemo(
    () =>
      textAiAvailable && (items.some(isSharedPdf) || canSummarizeShare(shareSummaryInput(items))),
    [items, textAiAvailable],
  )

  useEffect(() => {
    runIdRef.current += 1
    setExpanded(false)
  }, [key])

  const handleSummarize = useCallback(async () => {
    runIdRef.current += 1
    const runId = runIdRef.current
    hapticLight()
    setShareSummary({ key, status: 'working' })
    try {
      const text = await prepareShareSummaryText(items)
      if (runId !== runIdRef.current) return
      if (!canSummarizeShare(text)) {
        setShareSummary({ key, status: 'failed' })
        return
      }
      const result = await summarizeShare(text, configRef.current ?? {})
      if (runId !== runIdRef.current) return
      if (!result.summary && result.keyPoints.length === 0) {
        hapticWarning()
        setShareSummary({ key, status: 'failed' })
        return
      }
      hapticSuccess()
      setShareSummary({ key, status: 'done', ...result })
      const folderKey = await suggestFolderForShare(text)
      if (runId !== runIdRef.current || !folderKey) return
      const name = (getFoldersData(store.getState()) as Record<string, { title?: string }>)[
        folderKey
      ]?.title
      if (name) setShareSummary({ key, folder: { key: folderKey, name } })
    } catch {
      if (runId !== runIdRef.current) return
      hapticWarning()
      setShareSummary({ key, status: 'failed' })
    }
  }, [items, key, store])

  const handleToggleExpanded = useCallback(() => {
    hapticLight()
    setExpanded((value) => !value)
  }, [])

  const folderKey = current?.folder?.key
  const handleOpenFolder = useCallback(() => {
    if (!folderKey) return
    hapticLight()
    router.push(`/folder/${folderKey}` as Href)
  }, [folderKey, router])

  return {
    canSummarize,
    status: current?.status ?? 'idle',
    summary: current?.summary ?? '',
    keyPoints: (current?.keyPoints ?? []).slice(0, MAX_SUMMARY_KEY_POINTS),
    folder: current?.folder ?? null,
    expanded,
    handleSummarize,
    handleToggleExpanded,
    handleOpenFolder,
  }
}

export type ShareSummaryModel = ReturnType<typeof useShareSummary>
