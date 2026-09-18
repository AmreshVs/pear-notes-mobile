import {
  applyTextEdits,
  ASK_KIND,
  createAskTurn,
  getAskHistory as getCoreAskHistory,
  getAskScopeInfo as getCoreAskScopeInfo,
  hasDroppedAskTurns,
  resolveAskTurn as resolveCoreAskTurn,
} from '@pear-notes/core/store/services/localAiAsk.js'
import { SUMMARY_MAX_TRANSCRIPT_CHARS } from '@pear-notes/core/store/services/localAiPrompts.js'

import type { NoteTextEdit } from '@/components/TiptapEditor'
import type { RewriteDiff } from '@/lib/localAi/rewriteChanges'

export type AskScope = 'selection' | 'note'
export type AskKind = (typeof ASK_KIND)[keyof typeof ASK_KIND]
export type AskTurnStatus = 'working' | 'done' | 'failed'
export type AskError = 'failed' | 'notEnoughMemory' | 'unstable' | 'noMatch'

export interface AskTurnView {
  id: number
  question: string
  status: AskTurnStatus
  kind: AskKind | null
  answer: string
  edits: NoteTextEdit[]
  diff: RewriteDiff | null
  editedText: string | null
  applied: boolean
  error: AskError | null
  reply: string
}

export interface AskScopeInfo {
  scope: AskScope
  words: number
  truncated: boolean
}

export interface AskApplyRequest {
  scope: AskScope
  edits: NoteTextEdit[]
  lengthDelta: number
}

export interface AskNoteSheetProps {
  visible: boolean
  selectionText: string
  noteText: string
  insertBlocked: boolean
  onApplyEdits: (request: AskApplyRequest) => void
  onClose: () => void
}

export const ASK_KINDS = ASK_KIND as Record<'ANSWER' | 'EDITS' | 'NOT_FOUND', AskKind>
export const ASK_MAX_CHARACTERS = SUMMARY_MAX_TRANSCRIPT_CHARS as number

export const createWorkingTurn = (id: number, question: string) =>
  createAskTurn(id, question) as AskTurnView

export const resolveAskTurn = (turn: AskTurnView, sourceText: string, raw: string) =>
  resolveCoreAskTurn(turn, sourceText, raw) as AskTurnView

export const applyEditsToText = (text: string, edits: NoteTextEdit[]) =>
  (applyTextEdits(text, edits) as { after: string }).after

export const getAskHistory = (turns: AskTurnView[]) =>
  getCoreAskHistory(turns) as { question: string; reply: string }[]

export const hasDroppedTurns = (turns: AskTurnView[]) => hasDroppedAskTurns(turns) as boolean

export const getAskScopeInfo = (scope: AskScope, text: string) =>
  getCoreAskScopeInfo(scope, text) as AskScopeInfo
