import type { TFunction } from 'i18next'

import type { InviteCardCopy } from '@/components/sync/inviteCard.types'

export function buildAddDeviceCopy(t: TFunction, name: string): InviteCardCopy {
  return {
    idleTitle: t('sync.add.idleTitle', { name }),
    idleDesc: t('sync.add.idleDesc', { name }),
    generateBtn: t('sync.add.generateBtn'),
    readyTitle: t('sync.add.readyTitle', { name }),
    qrTitle: t('sync.add.qrTitle'),
    qrDescription: t('sync.add.qrDescription'),
    codeLabel: t('sync.add.codeLabel'),
    copyBtn: t('sync.add.copyBtn'),
    warning: t('sync.add.warning', { name }),
  }
}
