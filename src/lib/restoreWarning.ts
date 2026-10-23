import { Alert } from 'react-native'
import type { TFunction } from 'i18next'

import type { RestoreOutdatedDevice } from '@/lib/backupFileManager'
import { formatNameList } from '@/utils/nameList'

export function confirmRestoreWithOutdatedDevices(
  devices: RestoreOutdatedDevice[],
  t: TFunction,
  language: string,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const names = formatNameList(
      devices.map((device) => device.title || t('outdatedDevices.unnamedDevice')),
      language,
    )
    Alert.alert(
      t('outdatedDevices.title'),
      t('backup.outdatedDevices.description', { devices: names, count: devices.length }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: t('backup.outdatedDevices.restoreAnyway'),
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    )
  })
}
