import { useSyncExternalStore } from 'react'

import type { SharedItem } from '@/lib/shareIntake.types'

export type ShareSummaryStatus = 'idle' | 'working' | 'done' | 'failed'

export type ShareSummaryFolder = {
  key: string
  name: string
}

export type ShareSummaryState = {
  key: string
  status: ShareSummaryStatus
  summary: string
  keyPoints: string[]
  folder: ShareSummaryFolder | null
}

const IDLE_STATE: ShareSummaryState = {
  key: '',
  status: 'idle',
  summary: '',
  keyPoints: [],
  folder: null,
}

let state = IDLE_STATE
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

function publish(next: ShareSummaryState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function shareSummaryKey(items: SharedItem[]) {
  return items.map((item) => item.id).join('|')
}

export function getShareSummary() {
  return state
}

export function setShareSummary(next: Partial<ShareSummaryState> & { key: string }) {
  publish({ ...(state.key === next.key ? state : IDLE_STATE), ...next })
}

export function clearShareSummary() {
  if (state === IDLE_STATE) return
  publish(IDLE_STATE)
}

export function useShareSummaryState(): ShareSummaryState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
