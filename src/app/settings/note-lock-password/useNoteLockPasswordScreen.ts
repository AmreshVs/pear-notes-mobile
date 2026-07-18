import { backendApi } from '@pear-notes/core/backend/api.js'
import { loadSettings } from '@pear-notes/core/store/slices/settingsSlice.js'
import { isValidBackupPassword } from '@pear-notes/core/utils.js'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { resolveNoteLockPassword } from '@/lib/noteLockPasswordFlow'
import { getPasswordStrength } from '@/utils/passwordStrength'

export function useNoteLockPasswordScreen(mode?: string) {
  const dispatch = useDispatch()
  const isCreate = mode !== 'enter'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [secure, setSecure] = useState(true)
  const [error, setError] = useState('')

  const strength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = password === confirm
  const canSubmit = isCreate
    ? isValidBackupPassword(password) && passwordsMatch
    : password.trim().length > 0

  const toggleSecure = useCallback(() => setSecure((s) => !s), [])

  useEffect(() => {
    if (isCreate) return
    return () => resolveNoteLockPassword(false)
  }, [isCreate])

  const submit = useCallback(async (): Promise<{ retryAfter: number } | null> => {
    if (!canSubmit) return null
    if (isCreate) {
      const done = await backendApi.setNoteLockPassword({ password })
      if (done) dispatch(loadSettings())
      router.back()
      return null
    }
    const { valid, retryAfter } = await backendApi.verifyNoteLockPassword({ password })
    if (valid) {
      resolveNoteLockPassword(true)
      router.back()
      return null
    }
    return { retryAfter }
  }, [canSubmit, isCreate, password, dispatch])

  return {
    isCreate,
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
    submit,
  }
}
