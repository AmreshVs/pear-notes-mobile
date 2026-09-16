import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createWorkProgress,
  getWorkProgressView,
  reduceWorkProgress,
} from '@pear-notes/core/store/services/localAiWorkProgress.js'

import type { LocalAiWorkEvent } from '@/lib/localAi/qvacAdapter'
import type { BeginWorkOptions, WorkKind, WorkProgressView } from '@/lib/localAi/workProgress'

type WorkProgress = ReturnType<typeof createWorkProgress>

const WORK_RENDER_INTERVAL_MS = 120
const ELAPSED_TICK_MS = 1000

export function useLocalAiWorkProgress() {
  const progressRef = useRef<WorkProgress | null>(null)
  const runRef = useRef(0)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progress, setProgress] = useState<WorkProgress | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const clearFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = null
  }, [])

  const flush = useCallback(() => {
    flushTimerRef.current = null
    setProgress(progressRef.current)
  }, [])

  const beginWork = useCallback(
    (kind: WorkKind, options: BeginWorkOptions = {}) => {
      runRef.current += 1
      const run = runRef.current
      clearFlush()
      progressRef.current = createWorkProgress(kind, options)
      setProgress(progressRef.current)
      setNow(Date.now())
      return (event: LocalAiWorkEvent) => {
        if (run !== runRef.current || !progressRef.current) return
        progressRef.current = reduceWorkProgress(progressRef.current, event)
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flush, WORK_RENDER_INTERVAL_MS)
        }
      }
    },
    [clearFlush, flush],
  )

  const endWork = useCallback(() => {
    runRef.current += 1
    clearFlush()
    progressRef.current = null
    setProgress(null)
  }, [clearFlush])

  const isWorking = progress !== null

  useEffect(() => {
    if (!isWorking) return
    const timer = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS)
    return () => clearInterval(timer)
  }, [isWorking])

  useEffect(() => clearFlush, [clearFlush])

  const workView = useMemo(
    () => (progress ? (getWorkProgressView(progress, now) as WorkProgressView) : null),
    [now, progress],
  )

  return { workView, beginWork, endWork }
}
