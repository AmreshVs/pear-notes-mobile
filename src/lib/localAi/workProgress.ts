import type { TFunction } from 'i18next'

import {
  WORK_KIND,
  WORK_SHORTER_TARGET_RATIO,
  WORK_STEP_STATUS,
} from '@pear-notes/core/store/services/localAiWorkProgress.js'

export type WorkStepStatus = (typeof WORK_STEP_STATUS)[keyof typeof WORK_STEP_STATUS]

export interface WorkLabel {
  key: string
  params: Record<string, string | number>
}

export interface WorkStepView {
  id: string
  status: WorkStepStatus
  label: WorkLabel
}

export interface WorkProgressView {
  steps: WorkStepView[]
  fraction: number | null
  detail: WorkLabel | null
  elapsedSeconds: number | null
  preview: string
}

export interface LocalAiWorkProgressProps {
  view: WorkProgressView
  languageName: (code: string | null) => string
}

export type WorkKind = (typeof WORK_KIND)[keyof typeof WORK_KIND]

export interface BeginWorkOptions {
  input?: string
  targetRatio?: number
}

const TRANSLATION_MODEL_PREFIX = 'BERGAMOT_'
const NUMBER_FORMAT = new Intl.NumberFormat()

// The streaming preview shows a fixed window of its last lines, so the card
// stops growing and new text lands on a stable baseline instead of reflowing.
export const WORK_PREVIEW_LINE_HEIGHT = 24
export const WORK_PREVIEW_VISIBLE_LINES = 6

export const SHORTER_TARGET_RATIO = WORK_SHORTER_TARGET_RATIO as number

export function formatWorkStepLabel(step: WorkStepView, t: TFunction) {
  const { key, params } = step.label
  const model = String(params.model ?? '')
  const modelName =
    model && !model.startsWith(TRANSLATION_MODEL_PREFIX)
      ? t(`settings.onDeviceAi.modelNames.${model}`, { defaultValue: '' })
      : ''
  if (params.model !== undefined && !modelName) {
    return t(
      step.status === WORK_STEP_STATUS.DONE
        ? 'localAi.work.steps.modelReadyGeneric'
        : 'localAi.work.steps.loadModel',
    )
  }
  return t(`localAi.work.steps.${key}`, {
    ...params,
    model: modelName,
    ...(params.characters !== undefined
      ? { characters: NUMBER_FORMAT.format(Number(params.characters)) }
      : {}),
  })
}

export function getActiveWorkStep(view: WorkProgressView) {
  const index = Math.max(
    view.steps.findIndex((step) => step.status === WORK_STEP_STATUS.ACTIVE),
    0,
  )
  return { step: view.steps[index] ?? null, current: index + 1, total: view.steps.length }
}

export function formatWorkDetail(
  view: WorkProgressView,
  t: TFunction,
  languageName: (code: string | null) => string,
) {
  const detail = view.detail
    ? t(`localAi.work.detail.${view.detail.key}`, {
        ...view.detail.params,
        ...(view.detail.params.from !== undefined
          ? {
              from: languageName(String(view.detail.params.from)),
              to: languageName(String(view.detail.params.to)),
            }
          : {}),
      })
    : ''
  if (view.elapsedSeconds === null) return detail
  return detail
    ? t('localAi.work.detail.withElapsed', { detail, seconds: view.elapsedSeconds })
    : t('localAi.work.detail.elapsed', { seconds: view.elapsedSeconds })
}
