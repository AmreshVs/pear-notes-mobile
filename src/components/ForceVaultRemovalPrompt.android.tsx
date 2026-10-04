import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useForceVaultRemoval } from '@/hooks/useForceVaultRemoval'
import { getVaultLabel } from '@/lib/vaultLabels'

export function ForceVaultRemovalPrompt() {
  const { t } = useTranslation()
  const { vault, cancel, confirm } = useForceVaultRemoval()
  const name = vault ? getVaultLabel(vault, t) : ''

  const actions = useMemo<SheetAction[]>(
    () => [
      {
        icon: 'delete-forever-outline',
        label: t('vaults.forceRemove.confirm'),
        destructive: true,
        onPress: confirm,
      },
    ],
    [confirm, t],
  )

  return (
    <BottomActionSheet
      visible={!!vault}
      onDismiss={cancel}
      title={t('vaults.forceRemove.title')}
      subtitle={t('vaults.forceRemove.description', { name })}
      showHeader
      actions={actions}
    />
  )
}
