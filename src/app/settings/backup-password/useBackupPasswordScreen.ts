import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import {
  setImportStatus,
  startExportBackup,
  startImportBackup,
} from '@pear-notes/core/store/slices/backupSlice.js'
import { isValidBackupPassword } from '@pear-notes/core/utils.js'

import { checkRestore, clearImportCacheFile, getBackupExportPath } from '@/lib/backupFileManager'
import { takePendingImport } from '@/lib/backupPasswordFlow'
import { hapticLight } from '@/lib/haptics'
import { confirmRestoreWithOutdatedDevices } from '@/lib/restoreWarning'
import { getPasswordStrength } from '@/utils/passwordStrength'

export default function useBackupPasswordScreen(mode?: string) {
  const dispatch = useDispatch()
  const { t, i18n } = useTranslation()
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

  const restoreAllowed = useCallback(
    async (filePath: string, alreadyChecked: boolean) => {
      if (alreadyChecked) return true
      const check = await checkRestore(filePath, password)
      if (!check.blocking.length) return true
      return confirmRestoreWithOutdatedDevices(check.blocking, t, i18n.language)
    },
    [i18n.language, password, t],
  )

  const submit = useCallback(
    async (restoringMessage: string) => {
      if (!canSubmit) return
      hapticLight()
      if (isCreate) {
        const filePath = getBackupExportPath()
        dispatch(startExportBackup({ password, filePath } as any))
        router.back()
        return
      }
      const pending = takePendingImport()
      if (pending && !(await restoreAllowed(pending.path, pending.sealed))) {
        clearImportCacheFile()
        router.back()
        return
      }
      if (pending) {
        dispatch(setImportStatus({ step: 'decrypting', progress: 15, message: restoringMessage }))
        dispatch(startImportBackup({ filePath: pending.path, password } as any))
      }
      router.back()
    },
    [canSubmit, isCreate, password, dispatch, restoreAllowed],
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
