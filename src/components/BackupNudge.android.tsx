import { useBackupNudge } from '@/hooks/useBackupNudge'

import { BackupNudgeBanner } from './BackupNudgeBanner'

export function BackupNudge() {
  const { bannerVisible, snooze, openBackup } = useBackupNudge()

  if (!bannerVisible) return null
  return <BackupNudgeBanner onBackUp={openBackup} onDismiss={snooze} />
}
