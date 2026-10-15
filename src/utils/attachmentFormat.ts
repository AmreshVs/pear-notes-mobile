import type { TFunction } from 'i18next'

import {
  ATTACHMENT_GROUP,
  ATTACHMENT_KIND,
} from '@pear-notes/core/store/services/noteAttachments.js'

import type {
  AttachmentGroupBy,
  AttachmentItem,
  AttachmentSection,
} from '@/components/attachments/attachments.types'

const SECONDS_PER_MINUTE = 60
const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

const FALLBACK_NAME_KEYS: Record<string, string> = {
  [ATTACHMENT_KIND.PHOTO]: 'attachmentsView.photo',
  [ATTACHMENT_KIND.AUDIO]: 'attachmentsView.recording',
}

export function attachmentName(item: AttachmentItem, t: TFunction): string {
  return item.fileName || t(FALLBACK_NAME_KEYS[item.kind] || 'attachmentsView.file')
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE)
  return `${minutes}:${String(whole % SECONDS_PER_MINUTE).padStart(2, '0')}`
}

export function attachmentDate(item: AttachmentItem, language: string): string {
  return item.updatedAt ? new Date(item.updatedAt).toLocaleDateString(language, DATE_FORMAT) : ''
}

export function attachmentDetail(item: AttachmentItem, t: TFunction, language: string): string {
  const when =
    item.kind === ATTACHMENT_KIND.AUDIO && item.duration
      ? formatDuration(item.duration)
      : attachmentDate(item, language)
  return [item.title || t('noteCard.untitled'), when].filter(Boolean).join(' · ')
}

export function attachmentSectionLabel(
  section: AttachmentSection,
  by: AttachmentGroupBy,
  folderNames: Map<string, string>,
  t: TFunction,
  language: string,
): string {
  if (by === ATTACHMENT_GROUP.TYPE) return t(`attachmentsView.filter.${section.key}`)
  if (by === ATTACHMENT_GROUP.MONTH) {
    const [year, month] = section.key.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString(language, MONTH_FORMAT)
  }
  return folderNames.get(section.key) || t('attachmentsView.noFolder')
}
