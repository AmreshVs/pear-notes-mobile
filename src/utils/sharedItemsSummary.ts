import type { TFunction } from 'i18next'

import type { SharedItemCategory } from '@/lib/shareIntake.types'

const CATEGORY_LABEL_KEYS: Record<SharedItemCategory, string> = {
  photo: 'shareIntake.categories.photo',
  video: 'shareIntake.categories.video',
  audio: 'shareIntake.categories.audio',
  file: 'shareIntake.categories.file',
  link: 'shareIntake.categories.link',
  text: 'shareIntake.categories.text',
}

const SUMMARY_SEPARATOR = ', '

type SharedTrayLabelInput = {
  itemCount: number
  showAddAction: boolean
  categoryCounts: [SharedItemCategory, number][]
}

export function buildSharedTrayLabels(
  { itemCount, showAddAction, categoryCounts }: SharedTrayLabelInput,
  t: TFunction,
): { title: string; subtitle: string | null } {
  if (itemCount === 0) return { title: t('shareIntake.preparing'), subtitle: null }
  const title = t('shareIntake.itemCount', { count: itemCount })
  if (!showAddAction) return { title, subtitle: t('shareIntake.openNoteHint') }
  const subtitle = categoryCounts
    .map(([category, count]) => t(CATEGORY_LABEL_KEYS[category], { count }))
    .join(SUMMARY_SEPARATOR)
  return { title, subtitle }
}
