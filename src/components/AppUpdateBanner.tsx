import { useTranslation } from 'react-i18next'

import { FloatingNoticeBanner } from './FloatingNoticeBanner'
import { useAppUpdateBanner } from './useAppUpdateBanner'

const UPDATE_ICON = { ios: 'square.and.arrow.down', android: 'download' } as const

export function AppUpdateBanner() {
  const { t } = useTranslation()
  const { isVisible, latestVersion, dismiss, openStore } = useAppUpdateBanner()

  if (!isVisible) return null

  return (
    <FloatingNoticeBanner
      icon={UPDATE_ICON}
      title={t('update.banner.title')}
      description={t('update.banner.description', { version: latestVersion })}
      actionLabel={t('update.banner.updateButton')}
      onAction={openStore}
      dismissLabel={t('update.banner.dismiss')}
      onDismiss={dismiss}
    />
  )
}
