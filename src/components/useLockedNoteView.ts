import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'

import { type DeviceAuthMethod, getDeviceAuthMethod, isDeviceAuthSupported } from '@/lib/deviceAuth'
import { hapticSuccess } from '@/lib/haptics'
import { isNoteSessionUnlocked, markNoteUnlocked, useNeedsOtherLockPassword } from '@/lib/noteLock'
import { requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'
import {
  isBiometricUnlockOn,
  subscribeBiometricUnlock,
  unlockLockedNotes,
} from '@/lib/noteLockSession'

const BIOMETRIC_KIND: Partial<Record<DeviceAuthMethod, BiometricKind>> = {
  face: 'face',
  fingerprint: 'fingerprint',
}

async function detectBiometricKind(): Promise<BiometricKind> {
  return BIOMETRIC_KIND[await getDeviceAuthMethod()] ?? 'generic'
}

export type AuthState = 'checking' | 'supported' | 'unavailable'
export type BiometricKind = 'face' | 'fingerprint' | 'generic'

export function useLockedNoteView(noteId: string) {
  const { t } = useTranslation()
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [biometric, setBiometric] = useState<BiometricKind>('generic')
  const [unlocking, setUnlocking] = useState(false)
  const lockMethod = useSelector(getLockMethod)
  const isPassword = lockMethod === 'password'
  const [biometricOn, setBiometricOn] = useState(false)
  const usesBiometric = !isPassword || biometricOn
  const noteData = useSelector(getNoteData(noteId))
  const needsOtherPassword = useNeedsOtherLockPassword(noteId, noteData)

  useEffect(() => {
    if (!isPassword) return
    let active = true
    const refresh = () =>
      isBiometricUnlockOn().then((on) => {
        if (active) setBiometricOn(on)
      })
    refresh()
    const unsubscribe = subscribeBiometricUnlock(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [isPassword])

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!isPassword && !(await isDeviceAuthSupported())) {
        if (active) setAuthState('unavailable')
        return
      }
      if (active) setAuthState('supported')
      const kind = usesBiometric ? await detectBiometricKind() : 'generic'
      if (active) setBiometric(kind)
    })()
    return () => {
      active = false
    }
  }, [isPassword, usesBiometric])

  const otherPasswordReason = t('noteLockPassword.otherPasswordReason')

  const handleUnlock = useCallback(
    async (reason: string) => {
      if (unlocking) return
      setUnlocking(true)
      try {
        const ok =
          needsOtherPassword && isNoteSessionUnlocked()
            ? await requestNoteLockPassword(otherPasswordReason)
            : await unlockLockedNotes(reason)
        if (ok) {
          markNoteUnlocked(noteId)
          hapticSuccess()
        }
      } finally {
        setUnlocking(false)
      }
    },
    [noteId, unlocking, needsOtherPassword, otherPasswordReason],
  )

  return {
    authState,
    biometric,
    unlocking,
    isPassword: !usesBiometric,
    unavailable: authState === 'unavailable',
    handleUnlock,
  }
}
