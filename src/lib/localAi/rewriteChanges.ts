import type { TFunction } from 'i18next'

import {
  diffRewriteText,
  REWRITE_SEGMENT,
} from '@pear-notes/core/store/services/localAiRewriteDiff.js'

export { REWRITE_SEGMENT }

export type RewriteView = 'changes' | 'result'

export const REWRITE_VIEWS: RewriteView[] = ['changes', 'result']

export type RewriteSegment = {
  type: (typeof REWRITE_SEGMENT)[keyof typeof REWRITE_SEGMENT]
  text: string
}

export type RewriteParagraph = {
  changed: boolean
  segments: RewriteSegment[]
}

export type RewriteDiff = {
  paragraphs: RewriteParagraph[]
  fixes: number
  added: number
  removed: number
  changedRatio: number
  unchanged: boolean
  mostlyChanged: boolean
}

export type RewriteItem =
  | { type: 'paragraph'; paragraph: RewriteParagraph }
  | { type: 'unchanged'; paragraphs: RewriteParagraph[] }

export const getRewriteDiff = (before: string, after: string) =>
  diffRewriteText(before, after) as RewriteDiff

export const describeRewriteParagraph = (paragraph: RewriteParagraph, t: TFunction) =>
  paragraph.segments
    .map((segment) =>
      segment.type === REWRITE_SEGMENT.REMOVED
        ? t('localAi.rewriteChanges.removed', { text: segment.text })
        : segment.type === REWRITE_SEGMENT.ADDED
          ? t('localAi.rewriteChanges.added', { text: segment.text })
          : segment.text,
    )
    .join(' ')

export interface RewriteChangesProps {
  diff: RewriteDiff
  resultText: string
  showFixCount: boolean
  maxHeight: number
}
