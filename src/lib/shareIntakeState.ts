import { useSyncExternalStore } from 'react'

import {
  consumeSharePayloads,
  discardSharePayloads,
  importNativeShares,
  isNativeShareImportActive,
  readShareInbox,
} from '@/lib/shareInbox'
import type { ShareIntakeSnapshot, SharePayload } from '@/lib/shareIntake.types'
import { clearShareSummary } from '@/lib/shareSummaryState'

const EMPTY_SNAPSHOT: ShareIntakeSnapshot = { payloads: [], items: [], preparing: false }

let snapshot = EMPTY_SNAPSHOT
let refreshQueue: Promise<SharePayload[]> = Promise.resolve([])
const listeners = new Set<() => void>()
const retiredPayloadIds = new Set<string>()

function publish(next: Partial<ShareIntakeSnapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

function payloadSignature(payloads: SharePayload[]) {
  return payloads.map((payload) => `${payload.id}:${payload.items.length}`).join('|')
}

function setPayloads(payloads: SharePayload[]) {
  const visible = payloads.filter((payload) => !retiredPayloadIds.has(payload.id))
  if (payloadSignature(visible) === payloadSignature(snapshot.payloads)) return
  publish({ payloads: visible, items: visible.flatMap((payload) => payload.items) })
}

function retireVisiblePayloads(): SharePayload[] {
  const retired = snapshot.payloads
  if (retired.length === 0) return []
  retired.forEach((payload) => retiredPayloadIds.add(payload.id))
  publish({ payloads: [], items: [] })
  return retired
}

async function runRefresh(): Promise<SharePayload[]> {
  setSharePreparing(isNativeShareImportActive())
  await importNativeShares()
  setPayloads(await readShareInbox())
  setSharePreparing(isNativeShareImportActive())
  return snapshot.payloads
}

export function setSharePreparing(preparing: boolean) {
  if (snapshot.preparing === preparing) return
  publish({ preparing })
}

export function refreshShareIntake(): Promise<SharePayload[]> {
  refreshQueue = refreshQueue.catch(() => []).then(() => runRefresh().catch(() => []))
  return refreshQueue
}

export async function discardAllSharedItems() {
  clearShareSummary()
  await discardSharePayloads(retireVisiblePayloads())
}

export async function takeSharedPayloadsForNote(): Promise<SharePayload[]> {
  const payloads = retireVisiblePayloads()
  await consumeSharePayloads(payloads)
  return payloads
}

export function useShareIntakeSnapshot(): ShareIntakeSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
