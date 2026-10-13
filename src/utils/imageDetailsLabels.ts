import type { TFunction } from 'i18next'

import { imageDetailsContent } from '@pear-notes/core/store/services/imageDetails.js'

export const imageDetailsLabels = (t: TFunction) => ({
  types: t('localAi.details.types', { returnObjects: true }),
  ...(t('localAi.details.fields', { returnObjects: true }) as Record<string, string>),
})

export const imageDetailsBlocks = (details: unknown, t: TFunction, table: boolean) =>
  imageDetailsContent(details, imageDetailsLabels(t), { table })
