import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

import { useForceVaultRemoval } from '@/hooks/useForceVaultRemoval'
import { getVaultLabel } from '@/lib/vaultLabels'

export function ForceVaultRemovalPrompt() {
  const { t } = useTranslation()
  const { vault, cancel, confirm } = useForceVaultRemoval()

  useEffect(() => {
    if (!vault) return
    const name = getVaultLabel(vault, t)
    Alert.alert(t('vaults.forceRemove.title'), t('vaults.forceRemove.description', { name }), [
      { text: t('common.cancel'), style: 'cancel', onPress: cancel },
      { text: t('vaults.forceRemove.confirm'), style: 'destructive', onPress: confirm },
    ])
  }, [cancel, confirm, t, vault])

  return null
}
