import { useEffect } from 'react'

import { LOCK_SCREENSHOT_PROTECTION_KEY } from '@pear-notes/core/constant.js'
import { getLockPrivacyPreference } from '@pear-notes/core/utils.js'

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
