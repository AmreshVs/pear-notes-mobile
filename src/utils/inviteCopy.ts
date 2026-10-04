import type { TFunction } from 'i18next'

import type { InviteCardCopy } from '@/components/sync/inviteCard.types'

export function buildDeviceInviteCopy(t: TFunction): InviteCardCopy {
  return {
    idleTitle: t('sync.hero.title'),
    idleDesc: t('sync.hero.description'),
    generateBtn: t('sync.hero.generateBtn'),
    readyTitle: t('sync.invite.header'),
    qrTitle: t('sync.invite.qrTitle'),
    qrDescription: t('sync.invite.qrDescription'),
    codeLabel: t('sync.invite.codeLabel'),
    copyBtn: t('sync.invite.copyBtn'),
    warning: t('sync.invite.warning'),
  }
}

export function buildVaultInviteCopy(t: TFunction, name: string): InviteCardCopy {
  return {
    idleTitle: t('vaults.invite.idleTitle', { name }),
    idleDesc: t('vaults.invite.idleDesc', { name }),
    generateBtn: t('vaults.invite.generateBtn'),
    readyTitle: t('vaults.invite.readyTitle'),
    qrTitle: t('vaults.invite.qrTitle'),
    qrDescription: t('vaults.invite.qrDescription'),
    codeLabel: t('vaults.invite.codeLabel'),
    copyBtn: t('vaults.invite.copyBtn'),
    warning: t('vaults.invite.warning', { name }),
  }
}
