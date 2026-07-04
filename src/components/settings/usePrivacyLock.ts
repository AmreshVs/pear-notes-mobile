import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import useLockStatus from '@/app/settings/useLockStatus'
import {
  getLockPrivacyPreference,
  LOCK_SCREENSHOT_PROTECTION_KEY,
  LOCK_SWITCHER_HIDE_KEY,
  setLockPrivacyPreference,
} from '@/lib/lockPrivacy'

export function usePrivacyLock() {
  const { lockAvailable, lockMethod: deviceMethod } = useLockStatus()
  const lockMethod = useSelector(getLockMethod) as string
  const isPassword = lockMethod === 'password'

  const [screenshotProtection, setScreenshotProtection] = useState(true)
  const [switcherHide, setSwitcherHide] = useState(true)

  useEffect(() => {
    let active = true
    getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY).then((value) => {
      if (active) setScreenshotProtection(value)
    })
    getLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY).then((value) => {
      if (active) setSwitcherHide(value)
    })
    return () => {
      active = false
    }
  }, [])

  const toggleScreenshotProtection = useCallback(() => {
    setScreenshotProtection((prev) => {
      const next = !prev
      setLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY, next)
      return next
    })
  }, [])

  const toggleSwitcherHide = useCallback(() => {
    setSwitcherHide((prev) => {
      const next = !prev
      setLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY, next)
      return next
    })
  }, [])

  return {
    lockAvailable,
    deviceMethod,
    isPassword,
    screenshotProtection,
    switcherHide,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  }
}
