import { useEffect, useState } from 'react'
import { Linking } from 'react-native'

import { useAppUpdateStatus } from '@/hooks/useAppUpdateStatus'
import { getAppUpdateDismissedVersion, setAppUpdateDismissedVersion } from '@/lib/appUpdateCheck'
import { setAppUpdateNoticeVisible } from '@/lib/appUpdateNoticeVisibility'

export function useAppUpdateBanner() {
  const status = useAppUpdateStatus()
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)

  useEffect(() => {
    getAppUpdateDismissedVersion().then(setDismissedVersion)
  }, [])

  const isVisible =
    !!status &&
    !status.mandatory &&
    status.updateAvailable &&
    dismissedVersion !== status.latestVersion

  const isNoticeVisible = isVisible || !!status?.mandatory

  useEffect(() => {
    setAppUpdateNoticeVisible(isNoticeVisible)
  }, [isNoticeVisible])

  const dismiss = () => {
    if (!status) return
    setAppUpdateDismissedVersion(status.latestVersion)
    setDismissedVersion(status.latestVersion)
  }

  const openStore = () => {
    if (status?.storeUrl) Linking.openURL(status.storeUrl)
  }

  return {
    isVisible,
    latestVersion: status?.latestVersion,
    dismiss,
    openStore,
  }
}
