const HEX_PREVIEW_LENGTH = 8
const HEX_PATTERN = /^[0-9a-f]+$/i
const SECTION_SKIP_KEYS = ['downloads', 'uploads', 'devices']

export type DebugRow = { key: string; label: string; value: string; emphasis: boolean }
export type DebugMark = { label: string; at: number }
export type DebugBlock = { continued?: boolean; marks?: DebugMark[] }
export type DebugTimeline = { blocks?: DebugBlock[] }

export const EMPHASIS_KEYS = ['backlog', 'majority', 'indexerCount', 'writable']

export function shortenHex(value: string): string {
  if (value.length <= HEX_PREVIEW_LENGTH * 2) return value
  if (!HEX_PATTERN.test(value)) return value
  return `${value.slice(0, HEX_PREVIEW_LENGTH)}…`
}

export function formatDebugValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value.map((item) => formatDebugValue(item)).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString()
  return shortenHex(String(value))
}

export function buildDebugRows(data: unknown): DebugRow[] {
  if (!data || typeof data !== 'object') return []
  return Object.entries(data as Record<string, unknown>)
    .filter(([key]) => !SECTION_SKIP_KEYS.includes(key))
    .map(([key, value]) => ({
      key,
      label: key,
      value: formatDebugValue(value),
      emphasis: EMPHASIS_KEYS.includes(key),
    }))
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
