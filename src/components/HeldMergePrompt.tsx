import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

import { useHeldMerge } from '@/hooks/useHeldMerge'
import { formatNameList } from '@/utils/nameList'

export function HeldMergePrompt() {
  const { t, i18n } = useTranslation()
  const { devices, combineLater, combineAnyway } = useHeldMerge()

  useEffect(() => {
    if (!devices?.length) return
    const names = formatNameList(
      devices.map((device) => device.title || t('outdatedDevices.unnamedDevice')),
      i18n.language,
    )
    Alert.alert(
      t('outdatedDevices.title'),
      t('heldMerge.description', { devices: names, count: devices.length }),
      [
        { text: t('heldMerge.combineLater'), style: 'cancel', onPress: combineLater },
        { text: t('heldMerge.combineAnyway'), style: 'destructive', onPress: combineAnyway },
      ],
      { cancelable: true, onDismiss: combineLater },
    )
  }, [combineAnyway, combineLater, devices, i18n.language, t])

  return null
}
