import type { TFunction } from 'i18next'

export type AskIndexNotice =
  | { kind: 'indexing'; done: number; total: number }
  | { kind: 'charging'; total: number }
  | { kind: 'waiting' }
  | { kind: 'failed' }

const NOTICE_KEY = 'localAi.askVault.indexNotice'

export function askIndexNoticeText(t: TFunction, notice: AskIndexNotice): string {
  if (notice.kind === 'indexing') {
    return notice.total
      ? t(`${NOTICE_KEY}.indexing`, { done: notice.done, total: notice.total })
      : t(`${NOTICE_KEY}.indexingStart`)
  }
  if (notice.kind === 'charging') return t(`${NOTICE_KEY}.charging`, { count: notice.total })
  return t(`${NOTICE_KEY}.${notice.kind}`)
}
