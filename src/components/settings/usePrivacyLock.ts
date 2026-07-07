import { clearLockPassword, getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import useLockStatus from '@/app/settings/privacy/useLockStatus'
import { authenticate } from '@/lib/deviceAuth'
import {
  getLockPrivacyPreference,
  LOCK_SCREENSHOT_PROTECTION_KEY,
  LOCK_SWITCHER_HIDE_KEY,
  setLockPrivacyPreference,
} from '@/lib/lockPrivacy'
import { clearUnlockedNotes } from '@/lib/noteLock'
import { requestNoteLockPasswordScreen } from '@/lib/noteLockPasswordFlow'

const SCREEN_POP_DELAY_MS = 400

export function usePrivacyLock() {
  const dispatch = useDispatch()
  const { lockAvailable, lockMethod: deviceMethod } = useLockStatus()
  const lockMethod = useSelector(getLockMethod) as string
  const isPassword = lockMethod === 'password'
  const passwordDisabled = !isPassword && !lockAvailable

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

  const selectBiometric = useCallback(async () => {
    if (!isPassword) return
    const ok = await requestNoteLockPasswordScreen()
    if (ok) dispatch(clearLockPassword())
  }, [isPassword, dispatch])

  const selectPassword = useCallback(
    async (reason: string) => {
      if (isPassword) {
        const ok = await requestNoteLockPasswordScreen()
        if (!ok) return
        await new Promise((resolve) => setTimeout(resolve, SCREEN_POP_DELAY_MS))
      } else {
        if (!lockAvailable) return
        const ok = await authenticate(reason)
        if (!ok) return
      }
      router.push('/settings/note-lock-password?mode=create&purpose=set' as any)
    },
    [isPassword, lockAvailable],
  )

  const toggleScreenshotProtection = useCallback(() => {
    setScreenshotProtection((prev) => {
      const next = !prev
      setLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY, next)
      clearUnlockedNotes()
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
    passwordDisabled,
    screenshotProtection,
    switcherHide,
    selectBiometric,
    selectPassword,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  }
}
