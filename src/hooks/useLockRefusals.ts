import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { LOCK_REFUSAL } from '@pear-notes/core/constant.js'
import { getLockRefusal, setLockRefusal } from '@pear-notes/core/store/slices/notesSlice.js'

import { useToast } from '@/providers/ToastProvider'

const MESSAGE_KEYS: Record<string, string> = {
  [LOCK_REFUSAL.FILES_MISSING]: 'noteLockPassword.filesMissing',
  [LOCK_REFUSAL.FILES_SEALED]: 'noteLockPassword.filesSealed',
}

export function useLockRefusals() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const refusal = useSelector(getLockRefusal) as { key: string; reason: string } | null

  useEffect(() => {
    if (!refusal) return
    const key = MESSAGE_KEYS[refusal.reason]
    if (key) showToast(t(key))
    dispatch(setLockRefusal(null))
  }, [refusal, dispatch, showToast, t])
}
