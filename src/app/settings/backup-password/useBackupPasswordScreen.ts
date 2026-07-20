import { useCallback, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import {
  setImportStatus,
  startExportBackup,
  startImportBackup,
} from '@pear-notes/core/store/slices/backupSlice.js'
import { isValidBackupPassword } from '@pear-notes/core/utils.js'

import { getTempBackupFilePath } from '@/lib/backupFileManager'
import { takePendingImportPath } from '@/lib/backupPasswordFlow'
import { getPasswordStrength } from '@/utils/passwordStrength'

export default function useBackupPasswordScreen(mode?: string) {
  const dispatch = useDispatch()
  const isCreate = mode !== 'enter'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [secure, setSecure] = useState(true)

  const strength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = password === confirm
  const canSubmit = isCreate
    ? isValidBackupPassword(password) && passwordsMatch
    : password.trim().length > 0

  const toggleSecure = useCallback(() => setSecure((s) => !s), [])

  const submit = useCallback(
    (restoringMessage: string) => {
      if (!canSubmit) return
      if (isCreate) {
        const filePath = getTempBackupFilePath()
        dispatch(startExportBackup({ password, filePath } as any))
        router.back()
        return
      }
      const filePath = takePendingImportPath()
      if (filePath) {
        dispatch(setImportStatus({ step: 'decrypting', progress: 15, message: restoringMessage }))
        dispatch(startImportBackup({ filePath, password } as any))
      }
      router.back()
    },
    [canSubmit, isCreate, password, dispatch],
  )

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
    submit,
  }
}
