import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clearErrorLog,
  confirmClearErrorLog,
  type ErrorLog,
  readErrorLog,
  setErrorLogEnabled,
  shareErrorReport,
} from '@/lib/debugSnapshot'
import type { ConfirmLabels } from '@/utils/debugRows'

export function useErrorLogScreen() {
  const [log, setLog] = useState<ErrorLog | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const mountedRef = useRef(true)

  const fail = useCallback((e: unknown) => {
    if (mountedRef.current) setError(String((e as Error)?.message || e))
  }, [])

  const load = useCallback(async () => {
    try {
      const next = await readErrorLog()
      if (!mountedRef.current) return
      setLog(next)
      setError(next?.error ? String(next.error) : '')
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    mountedRef.current = true
    const initial = setTimeout(load, 0)
    return () => {
      mountedRef.current = false
      clearTimeout(initial)
    }
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    if (mountedRef.current) setRefreshing(false)
  }, [load])

  const handleShare = useCallback(
    async (message: string) => {
      setSharing(true)
      try {
        await shareErrorReport(message)
        await load()
      } catch (e) {
        fail(e)
      } finally {
        if (mountedRef.current) setSharing(false)
      }
    },
    [fail, load],
  )

  const handleClear = useCallback(
    (labels: ConfirmLabels) => {
      confirmClearErrorLog(labels, async () => {
        try {
          await clearErrorLog()
          if (mountedRef.current) setExpanded({})
          await load()
        } catch (e) {
          fail(e)
        }
      })
    },
    [fail, load],
  )

  const toggleRecording = useCallback(
    async (enabled: boolean) => {
      setLog((current) => ({ ...(current ?? {}), enabled }))
      try {
        await setErrorLogEnabled(enabled)
      } catch (e) {
        fail(e)
      }
      await load()
    },
    [fail, load],
  )

  const toggleEntry = useCallback((key: string) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  return {
    entries: log?.entries || [],
    loaded: log !== null,
    recording: log?.enabled === true,
    toggleRecording,
    error,
    refreshing,
    sharing,
    expanded,
    toggleEntry,
    handleRefresh,
    handleShare,
    handleClear,
  }
}
