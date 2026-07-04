import { useEffect } from 'react'

import { getLockPrivacyPreference, LOCK_SCREENSHOT_PROTECTION_KEY } from '@/lib/lockPrivacy'
import { disableScreenshotProtection, enableScreenshotProtection } from '@/lib/screenProtection'

export function useLockedNoteScreenProtection(active: boolean) {
  useEffect(() => {
    let cancelled = false
    if (!active) {
      disableScreenshotProtection()
      return () => {}
    }
    getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY).then((enabled) => {
      if (cancelled) return
      if (enabled) enableScreenshotProtection()
    })
    return () => {
      cancelled = true
      disableScreenshotProtection()
    }
  }, [active])
}
