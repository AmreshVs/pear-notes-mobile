import type { TFunction } from 'i18next'

import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import type { IndexProgressView } from './onDeviceAiExtras.types'

const MINUTE_MS = 60 * 1000

export const SUGGESTION_KINDS = [
  AI_SUGGESTION.TASKS,
  AI_SUGGESTION.TITLES,
  AI_SUGGESTION.FOLDERS,
  AI_SUGGESTION.RELATED,
]

export function getIndexCaption(t: TFunction, progress: IndexProgressView, bytes: number | null) {
  const parts = [t('settings.onDeviceAi.index.percent', { percent: progress.percent })]
  if (progress.remainingMs != null) {
    parts.push(
      progress.remainingMs < MINUTE_MS
        ? t('settings.onDeviceAi.index.lessThanMinute')
        : t('settings.onDeviceAi.index.minutesLeft', {
            count: Math.round(progress.remainingMs / MINUTE_MS),
          }),
    )
  }
  return {
    progressText: parts.join(' · '),
    sizeText:
      bytes == null ? null : t('settings.onDeviceAi.index.size', { size: formatBytes(bytes) }),
  }
}
