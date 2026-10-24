import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { router } from 'expo-router'

import {
  LOCK_SCREENSHOT_PROTECTION_KEY,
  LOCK_SWITCHER_HIDE_KEY,
} from '@pear-notes/core/constant.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getLockPrivacyPreference, setLockPrivacyPreference } from '@pear-notes/core/utils.js'

import useLockStatus from '@/app/settings/privacy/useLockStatus'
import { authenticate } from '@/lib/deviceAuth'
import { hapticSelection } from '@/lib/haptics'
import { clearUnlockedNotes } from '@/lib/noteLock'
import {
  canUseBiometricUnlock,
  disableBiometricUnlock,
  enableBiometricUnlock,
  hasLockedNotes,
  isBiometricUnlockOn,
  offerPasswordMigrationFromSettings,
  subscribeBiometricUnlock,
} from '@/lib/noteLockSession'
import { formatNameList } from '@/utils/nameList'

export const UNNAMED_DEVICE = '?'

export type SyncedDevice = {
  key: string
  title?: string
  sealedNotes?: boolean
  deviceType?: string
  appVersion?: string
  lastSeenAt?: number
}

export function usePrivacyLock() {
  const { t, i18n } = useTranslation()
  const { lockAvailable, lockMethod: deviceMethod } = useLockStatus()
  const lockMethod = useSelector(getLockMethod) as string
  const isPassword = lockMethod === 'password'
  const devices = useSelector(getSyncedDevices) as SyncedDevice[]
  const outdatedDevices = devices.filter((device) => device.sealedNotes === false)
  const outdatedNames = formatNameList(
    outdatedDevices.map((device) => device.title || UNNAMED_DEVICE),
    i18n.language,
  )

  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricOn, setBiometricOn] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
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

  const [biometricVersion, setBiometricVersion] = useState(0)

  useEffect(() => subscribeBiometricUnlock(() => setBiometricVersion((version) => version + 1)), [])

  useEffect(() => {
    let active = true
    Promise.all([canUseBiometricUnlock(), isBiometricUnlockOn()]).then(([available, on]) => {
      if (!active) return
      setBiometricAvailable(available)
      setBiometricOn(on)
    })
    return () => {
      active = false
    }
  }, [isPassword, biometricVersion])

  useEffect(() => {
    offerPasswordMigrationFromSettings(t('settings.privacy.changeMethodReason'))
  }, [t])

  const setOrChangePassword = useCallback(
    async (reason: string) => {
      if (!isPassword && lockAvailable && hasLockedNotes() && !(await authenticate(reason))) {
        return
      }
      router.push(
        `/settings/note-lock-password?mode=create&purpose=${isPassword ? 'change' : 'set'}` as any,
      )
    },
    [isPassword, lockAvailable],
  )

  const toggleBiometric = useCallback(
    async (reason: string) => {
      if (biometricBusy) return
      hapticSelection()
      setBiometricBusy(true)
      try {
        if (biometricOn) {
          await disableBiometricUnlock()
          setBiometricOn(false)
        } else {
          setBiometricOn(await enableBiometricUnlock(reason))
        }
      } finally {
        setBiometricBusy(false)
      }
    },
    [biometricBusy, biometricOn],
  )

  const toggleScreenshotProtection = useCallback(() => {
    hapticSelection()
    setScreenshotProtection((prev) => {
      const next = !prev
      setLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY, next)
      clearUnlockedNotes()
      return next
    })
  }, [])

  const toggleSwitcherHide = useCallback(() => {
    hapticSelection()
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
    outdatedDevices,
    outdatedNames,
    biometricAvailable: isPassword && biometricAvailable,
    biometricBlocked: outdatedDevices.length > 0,
    biometricOn,
    biometricBusy,
    screenshotProtection,
    switcherHide,
    setOrChangePassword,
    toggleBiometric,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  }
}
