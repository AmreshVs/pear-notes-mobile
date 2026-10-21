import { useSelector } from 'react-redux'

import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'

const PASSWORD_LOCK_METHOD = 'password'

export function useHasLockPassword(): boolean {
  return useSelector((state) => getLockMethod(state) === PASSWORD_LOCK_METHOD)
}
