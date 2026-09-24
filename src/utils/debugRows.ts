import { SENSITIVE_DEBUG_KEYS, SHOW_SENSITIVE_DEBUG_INFO } from '@pear-notes/core/constant.js'

const HEX_PREVIEW_LENGTH = 8
const HEX_PATTERN = /^[0-9a-f]+$/i
const SECTION_SKIP_KEYS = ['downloads', 'uploads', 'devices']

export function isSensitiveDebugKey(key: string): boolean {
  return SENSITIVE_DEBUG_KEYS.includes(key)
}

export function showsSensitiveDebugInfo(): boolean {
  return SHOW_SENSITIVE_DEBUG_INFO
}

export type DebugRow = {
  key: string
  label: string
  value: string
  emphasis: boolean
  fullValue?: string
}
export type DebugMark = { label: string; at: number }
export type DebugBlock = { continued?: boolean; marks?: DebugMark[] }
export type DebugTimeline = { blocks?: DebugBlock[] }

export const EMPHASIS_KEYS = ['backlog', 'majority', 'indexerCount', 'writable']

const TIMESTAMP_KEYS = [
  'lastBaseErrorAt',
  'lastSyncAt',
  'lastWakeAt',
  'backgroundServiceFailedAt',
  'activityOldestAt',
  'mediaLastRebuildAt',
  'mediaHealthCheckedAt',
  'lastViewBackfillAt',
  'lastFastForwardAt',
  'lastErrorAt',
]

export function shortenHex(value: string): string {
  if (value.length <= HEX_PREVIEW_LENGTH * 2) return value
  if (!HEX_PATTERN.test(value)) return value
  return `${value.slice(0, HEX_PREVIEW_LENGTH)}…`
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—'
  return new Date(value).toLocaleString()
}

export function formatDebugValue(value: unknown, { shorten = true } = {}): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value.map((item) => formatDebugValue(item, { shorten })).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString()
  return shorten ? shortenHex(String(value)) : String(value)
}

export function buildDebugRows(data: unknown): DebugRow[] {
  if (!data || typeof data !== 'object') return []
  return Object.entries(data as Record<string, unknown>)
    .filter(([key]) => !SECTION_SKIP_KEYS.includes(key))
    .filter(([key]) => SHOW_SENSITIVE_DEBUG_INFO || !isSensitiveDebugKey(key))
    .map(([key, value]) => {
      const isTimestamp = TIMESTAMP_KEYS.includes(key)
      const shown = isTimestamp ? formatTimestamp(value) : formatDebugValue(value)
      const full = isTimestamp ? shown : formatDebugValue(value, { shorten: false })
      return {
        key,
        label: key,
        value: shown,
        emphasis: EMPHASIS_KEYS.includes(key),
        ...(full === shown ? null : { fullValue: full }),
      }
    })
}

export function buildTimelineRows(timeline: DebugTimeline | undefined): DebugRow[] {
  const blocks = timeline?.blocks || []
  const rows: DebugRow[] = []
  blocks.forEach((block, blockIndex) => {
    const marks = block.marks || []
    if (marks.length === 0) return
    rows.push({
      key: `block-${blockIndex}`,
      label: block.continued ? '(continued)' : '(boot)',
      value: '',
      emphasis: true,
    })
    let previousAt = 0
    marks.forEach((mark, markIndex) => {
      const step = mark.at - previousAt
      previousAt = mark.at
      rows.push({
        key: `block-${blockIndex}-mark-${markIndex}`,
        label: mark.label,
        value: `${mark.at}ms  +${step}ms`,
        emphasis: false,
      })
    })
  })
  return rows
}

export type ConfirmLabels = {
  title: string
  message: string
  cancel: string
  confirm: string
}

export type CopyFullReportLabels = ConfirmLabels

export function getCopyFullReportLabels(t: (key: string) => string): CopyFullReportLabels {
  return {
    title: t('debug.copyFullTitle'),
    message: t('debug.copyFullDesc'),
    cancel: t('common.cancel'),
    confirm: t('debug.copyFullConfirm'),
  }
}

export function describeDevice(
  device: Record<string, unknown>,
  labels: { local: string; leader: string; online: string; offline: string },
): string {
  return [
    device.platform ? String(device.platform) : null,
    device.isLocal ? labels.local : null,
    device.isIndexer ? labels.leader : null,
    device.isOnline ? labels.online : labels.offline,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function getClearErrorLogLabels(t: (key: string) => string): ConfirmLabels {
  return {
    title: t('debug.errorLog.clearTitle'),
    message: t('debug.errorLog.clearConfirm'),
    cancel: t('common.cancel'),
    confirm: t('debug.errorLog.clearYes'),
  }
}

export function buildWriterRows(
  writers: Record<string, unknown>[],
  devices: Record<string, unknown>[],
  t: (key: string, options?: Record<string, unknown>) => string,
): DebugRow[] {
  const titles = new Map(devices.map((device) => [device.localKey, device.title]))
  return writers.map((writer, index) => ({
    key: `writer-${String(writer.key || index)}`,
    label: String(titles.get(writer.key) || t('debug.untitledDevice')),
    value: t('debug.writerSummary', {
      linearized: writer.linearized ?? '—',
      indexed: writer.indexed ?? '—',
      contiguous: writer.contiguousLength ?? '—',
      length: writer.coreLength ?? '—',
      peers: writer.peers ?? '—',
    }),
    emphasis: !!writer.isIndexer,
  }))
}
