import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'
import * as LocalAuthentication from 'expo-local-authentication'

import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'

import { isDeviceAuthSupported } from '@/lib/deviceAuth'
import { hapticSuccess } from '@/lib/haptics'
import { isNoteSessionUnlocked, markNoteUnlocked, useNeedsOtherLockPassword } from '@/lib/noteLock'
import { requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'
import { unlockLockedNotes } from '@/lib/noteLockSession'

const isAndroid = Platform.OS === 'android'

export type AuthState = 'checking' | 'supported' | 'unavailable'
export type BiometricKind = 'face' | 'fingerprint' | 'generic'

export function useLockedNoteView(noteId: string) {
  const { t } = useTranslation()
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [biometric, setBiometric] = useState<BiometricKind>('generic')
  const [unlocking, setUnlocking] = useState(false)
  const lockMethod = useSelector(getLockMethod)
  const isPassword = lockMethod === 'password'
  const noteData = useSelector(getNoteData(noteId))
  const needsOtherPassword = useNeedsOtherLockPassword(noteId, noteData)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (isPassword) {
        if (active) setAuthState('supported')
        return
      }
      const supported = await isDeviceAuthSupported()
      if (!active) return
      if (!supported) {
        setAuthState('unavailable')
        return
      }
      setAuthState('supported')
      if (isAndroid) return
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometric('face')
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometric('fingerprint')
        }
      } catch {
        setBiometric('generic')
      }
    })()
    return () => {
      active = false
    }
  }, [isPassword])

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
    isPassword,
    unavailable: authState === 'unavailable',
    handleUnlock,
  }
}
