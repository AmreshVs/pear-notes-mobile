import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import * as LocalAuthentication from 'expo-local-authentication'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'

import { isDeviceAuthSupported } from '@/lib/deviceAuth'
import { markNoteUnlocked, unlockNote } from '@/lib/noteLock'
import { requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'

const isAndroid = Platform.OS === 'android'

export type AuthState = 'checking' | 'supported' | 'unavailable'
export type BiometricKind = 'face' | 'fingerprint' | 'generic'

export function useLockedNoteView(noteId: string) {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [biometric, setBiometric] = useState<BiometricKind>('generic')
  const [unlocking, setUnlocking] = useState(false)
  const lockMethod = useSelector(getLockMethod)
  const isPassword = lockMethod === 'password'

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

  const handleUnlock = useCallback(
    async (reason: string) => {
      if (unlocking) return
      setUnlocking(true)
      try {
        if (isPassword) {
          const ok = await requestNoteLockPassword()
          if (ok) markNoteUnlocked(noteId)
        } else {
          await unlockNote(noteId, reason)
        }
      } finally {
        setUnlocking(false)
      }
    },
    [noteId, unlocking, isPassword],
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
