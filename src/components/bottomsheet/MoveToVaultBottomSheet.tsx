import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { getOtherVaults, moveToVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { getVaultLabel } from '@/lib/vaultLabels'
import { getVaultMoveQuestion } from '@/lib/vaultMove'
import type { Vault } from '@/lib/vaults.types'

type Props = {
  noteKeys: string[]
  onDismiss: () => void
}

export function MoveToVaultBottomSheet({ noteKeys, onDismiss }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const otherVaults = useSelector(getOtherVaults) as Vault[]
  const [target, setTarget] = useState<Vault | null>(null)
  const visible = noteKeys.length > 0

  useEffect(() => {
    if (!visible) setTarget(null)
  }, [visible])

  const pickActions = useMemo<SheetAction[]>(
    () =>
      otherVaults.map((vault) => ({
        icon: 'layers-outline',
        label: getVaultLabel(vault, t),
        onPress: () => setTarget(vault),
      })),
    [otherVaults, t],
  )

  const handleConfirm = useCallback(() => {
    if (!target) return
    dispatch(moveToVault({ targetId: target.id, noteKeys }))
    onDismiss()
  }, [dispatch, noteKeys, onDismiss, target])

  const confirmActions = useMemo<SheetAction[]>(
    () => [{ icon: 'layers-outline', label: t('vaults.move.confirmBtn'), onPress: handleConfirm }],
    [handleConfirm, t],
  )

  const targetName = target ? getVaultLabel(target, t) : ''

  return (
    <>
      <BottomActionSheet
        visible={visible && !target}
        onDismiss={onDismiss}
        title={t('vaults.move.pickTitle')}
        actions={pickActions}
      />
      <BottomActionSheet
        visible={visible && !!target}
        onDismiss={onDismiss}
        title={getVaultMoveQuestion(targetName, noteKeys.length, t)}
        subtitle={t('vaults.move.explain', { name: targetName })}
        showHeader
        actions={confirmActions}
      />
    </>
  )
}
