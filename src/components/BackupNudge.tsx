import { useBackupNudge } from '@/hooks/useBackupNudge'

import { BackupNudgeBanner } from './BackupNudgeBanner'
import { BackupNudgeSheet } from './BackupNudgeSheet'

export function BackupNudge() {
  const { sheetVisible, bannerVisible, snooze, closeSheet, openBackup, openDevices } =
    useBackupNudge()

  return (
    <>
      <BackupNudgeSheet
        visible={sheetVisible}
        onClose={closeSheet}
        onBackUp={openBackup}
        onLinkDevice={openDevices}
      />
      {bannerVisible && <BackupNudgeBanner onBackUp={openBackup} onDismiss={snooze} />}
    </>
  )
}
