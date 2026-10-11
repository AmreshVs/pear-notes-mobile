import { backendApi } from '@pear-notes/core/backend/api.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { getLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { NOTE_TASK } from '@pear-notes/core/store/services/localAiPrompts.js'
import {
  parseShareSummary,
  shareSummaryInput,
  shareSummaryParagraphs,
  suggestShareFolder,
} from '@pear-notes/core/store/services/shareSummary.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getMeaningSearchReady,
  selectAiSuggestionOn,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import { type LocalAiWorkEvent, runNoteTask } from '@/lib/localAi/localAi'
import { isPdfAttachment, PDF_TEXT_MAX_BYTES, readLocalPdfText } from '@/lib/pdfTools'
import type { SharedFileItem, SharedItem, SharedParagraph } from '@/lib/shareIntake.types'
import type { ShareSummaryState } from '@/lib/shareSummaryState'

export type ShareSummaryResult = {
  summary: string
  keyPoints: string[]
}

export function isSharedPdf(item: SharedItem): item is SharedFileItem {
  return item.kind === 'file' && isPdfAttachment(item.name, item.mimeType)
}

async function readSharedPdfText(item: SharedFileItem) {
  if (item.size > PDF_TEXT_MAX_BYTES) return ''
  try {
    return await readLocalPdfText(item.uri)
  } catch {
    return ''
  }
}

export async function prepareShareSummaryText(items: SharedItem[]): Promise<string> {
  const pdfs = items.filter(isSharedPdf)
  const texts = await Promise.all(pdfs.map(readSharedPdfText))
  const fileTexts: Record<string, string> = {}
  pdfs.forEach((item, index) => {
    if (texts[index]) fileTexts[item.id] = texts[index]
  })
  return shareSummaryInput(items, { fileTexts })
}

export async function summarizeShare(
  text: string,
  config: object,
  onProgress?: (event: LocalAiWorkEvent) => void,
): Promise<ShareSummaryResult> {
  const options = { onProgress }
  const summaryOutput = await runNoteTask(NOTE_TASK.NOTE_SUMMARY, text, config, options)
  const keyPointsOutput = await runNoteTask(NOTE_TASK.KEY_POINTS, text, config, options)
  return parseShareSummary(summaryOutput, keyPointsOutput)
}

export async function suggestFolderForShare(text: string): Promise<string | null> {
  const state = store.getState()
  if (!getMeaningSearchReady(state)) return null
  if (!selectAiSuggestionOn(state, AI_SUGGESTION.FOLDERS)) return null
  try {
    return await suggestShareFolder({
      api: backendApi,
      embed: getLocalAiAdapter()?.embedTexts,
      text,
      notes: getNotesData(state),
      folderData: getFoldersData(state),
    })
  } catch {
    return null
  }
}

export function buildSharedSummaryParagraphs(
  stored: ShareSummaryState,
  key: string,
  labels: { summaryLabel: string; keyPointsLabel: string },
): SharedParagraph[] {
  if (stored.key !== key || stored.status !== 'done') return []
  return shareSummaryParagraphs(stored, labels)
}
