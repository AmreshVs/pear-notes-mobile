import { router } from 'expo-router'
import type { Dispatch } from 'redux'

import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'

import { clearStorageState } from '@/lib/clearStorageState'
import { clearVaultSecrets } from '@/lib/secureStore'

export function resetAllData(dispatch: Dispatch): void {
  if (router.canDismiss()) router.dismissAll()
  if (router.canGoBack()) router.back()
  clearStorageState.setClearing(true)
  clearVaultSecrets().catch(console.error)
  dispatch(clearStorage())
}
