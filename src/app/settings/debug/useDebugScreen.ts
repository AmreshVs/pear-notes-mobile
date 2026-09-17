import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  captureDebugSnapshot,
  copyDebugReport,
  type DebugSnapshot,
  resetStalledMedia,
  shareDebugReport,
  type StalledMediaResetSummary,
} from '@/lib/debugSnapshot'

const POLL_INTERVAL_MS = 2000
const COPIED_RESET_MS = 2000

function describeReset(
  summary: StalledMediaResetSummary,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (summary.error) return summary.error
  if (summary.reset === 0 && summary.skipped === 0) return t('debug.unblockMediaNothing')
  const reset = t('debug.unblockMediaReset', { count: summary.reset })
  if (summary.skipped === 0) return reset
  return `${reset} ${t('debug.unblockMediaSkipped', { count: summary.skipped, reasons: summary.reasons.join(', ') })}`
}

export function useDebugScreen() {
  const { t } = useTranslation()
  const [unblocking, setUnblocking] = useState(false)
  const [notice, setNotice] = useState('')
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const mountedRef = useRef(true)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heavyStorageRef = useRef<Record<string, unknown> | null>(null)

  const load = useCallback(async (heavy: boolean) => {
    try {
      const next = await captureDebugSnapshot({ heavy })
      if (!mountedRef.current) return
      const storage = (next?.storage as Record<string, unknown> | undefined) || null
      if (heavy && storage) heavyStorageRef.current = storage
      const keepsHeavyStorage = !heavy && next && heavyStorageRef.current
      setSnapshot(
        keepsHeavyStorage ? { ...next, storage: { ...heavyStorageRef.current, ...storage } } : next,
      )
      setError(next?.error ? String(next.error) : '')
    } catch (e) {
      if (!mountedRef.current) return
      setError(String((e as Error)?.message || e))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const initial = setTimeout(() => load(true), 0)
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS)
    return () => {
      mountedRef.current = false
      clearTimeout(initial)
      clearInterval(timer)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load(true)
    if (mountedRef.current) setRefreshing(false)
  }, [load])

  const handleCopy = useCallback(async () => {
    try {
      const done = await copyDebugReport(snapshot)
      if (!done || !mountedRef.current) return
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setCopied(false)
      }, COPIED_RESET_MS)
    } catch (e) {
      if (mountedRef.current) setError(String((e as Error)?.message || e))
    }
  }, [snapshot])

  const handleShare = useCallback(async () => {
    try {
      await shareDebugReport(snapshot)
    } catch (e) {
      if (mountedRef.current) setError(String((e as Error)?.message || e))
    }
  }, [snapshot])

  const handleUnblockMedia = useCallback(async () => {
    setUnblocking(true)
    const summary = await resetStalledMedia().catch((e) => ({
      reset: 0,
      skipped: 0,
      reasons: [],
      error: String((e as Error)?.message || e),
    }))
    if (!mountedRef.current) return
    setNotice(describeReset(summary, t))
    setUnblocking(false)
    await load(true)
  }, [load, t])

  return {
    snapshot,
    error,
    copied,
    refreshing,
    unblocking,
    notice,
    handleRefresh,
    handleCopy,
    handleShare,
    handleUnblockMedia,
  }
}
