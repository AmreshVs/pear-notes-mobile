import { Platform } from 'react-native'

import * as log from '@pear-notes/core/log.js'

import { excludeFromBackup } from '../../modules/expo-backup-exclusion'

export async function excludeFromDeviceBackups(path: string): Promise<void> {
  if (Platform.OS !== 'ios') return
  try {
    if (!(await excludeFromBackup(path))) {
      log.error('[backup-exclusion] storage is still included in device backups')
    }
  } catch (e) {
    log.error('[backup-exclusion] could not exclude storage from device backups', e)
  }
}
