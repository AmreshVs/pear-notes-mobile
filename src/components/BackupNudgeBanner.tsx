import { useTranslation } from 'react-i18next'

import { FloatingNoticeBanner } from './FloatingNoticeBanner'

const BACKUP_ICON = { ios: 'lock.shield', android: 'shield-lock-outline' } as const
const DESCRIPTION_LINES = 2

type BackupNudgeBannerProps = {
  onBackUp: () => void
  onDismiss: () => void
}

export function BackupNudgeBanner({ onBackUp, onDismiss }: BackupNudgeBannerProps) {
  const { t } = useTranslation()

  return (
    <FloatingNoticeBanner
      icon={BACKUP_ICON}
      title={t('backupNudge.banner.title')}
      description={t('backupNudge.banner.description')}
      descriptionLines={DESCRIPTION_LINES}
      actionLabel={t('backupNudge.backUpNow')}
      onAction={onBackUp}
      dismissLabel={t('backupNudge.banner.dismiss')}
      onDismiss={onDismiss}
    />
  )
}
