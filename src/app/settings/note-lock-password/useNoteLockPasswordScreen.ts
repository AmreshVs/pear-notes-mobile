import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { loadSettings } from '@pear-notes/core/store/slices/settingsSlice.js'
import { isValidBackupPassword } from '@pear-notes/core/utils.js'

import { hapticError, hapticSuccess } from '@/lib/haptics'
import { getNoteLockPasswordCopy } from '@/lib/noteLockPasswordCopy'
import { getNoteUnlockReason, resolveNoteLockPassword } from '@/lib/noteLockPasswordFlow'
import { hasLockPassword, refreshBiometricKey, submitLockPassword } from '@/lib/noteLockSession'
import { getPasswordStrength } from '@/utils/passwordStrength'

export default function useNoteLockPasswordScreen(mode?: string, purpose?: string) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const isCreate = mode !== 'enter'
  const copy = getNoteLockPasswordCopy(isCreate, purpose)
  const [reason] = useState(() => getNoteUnlockReason())

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [secure, setSecure] = useState(true)
  const [error, setError] = useState('')
  const [understood, setUnderstood] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = password === confirm
  const canSubmit = isCreate
    ? isValidBackupPassword(password) && passwordsMatch && (understood || hasLockPassword())
    : password.trim().length > 0

  const toggleSecure = useCallback(() => setSecure((s) => !s), [])

  useEffect(() => () => resolveNoteLockPassword(false), [])

  const submit = useCallback(async (): Promise<{ retryAfter: number } | null> => {
    if (!canSubmit) return null
    if (isCreate) {
      const firstTime = !hasLockPassword()
      const done = await backendApi.setNoteLockPassword({ password })
      if (!done) {
        hapticError()
        setError(t('noteLockPassword.setFailed'))
        return null
      }
      dispatch(loadSettings())
      if (firstTime) await submitLockPassword(password)
      else await refreshBiometricKey(password)
      hapticSuccess()
      resolveNoteLockPassword(true)
      router.back()
      return null
    }
    const { ok, retryAfter } = await submitLockPassword(password)
    if (ok) {
      hapticSuccess()
      resolveNoteLockPassword(true)
      router.back()
      return null
    }
    hapticError()
    return { retryAfter }
  }, [canSubmit, isCreate, password, dispatch, t])

  return {
    isCreate,
    copy,
    reason,
    password,
    setPassword,
    confirm,
    setConfirm,
    secure,
    toggleSecure,
    strength,
    passwordsMatch,
    canSubmit,
    error,
    setError,
    understood,
    setUnderstood,
    showUnderstood: isCreate && !hasLockPassword(),
    submit,
  }
}
