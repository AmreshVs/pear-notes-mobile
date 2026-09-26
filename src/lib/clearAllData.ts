import type { Dispatch } from 'redux'

import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'

import { clearStorageState } from '@/lib/clearStorageState'
import { clearVaultSecrets } from '@/lib/secureStore'

export function resetAllData(dispatch: Dispatch): void {
  clearStorageState.setClearing(true)
  clearVaultSecrets().catch(console.error)
  dispatch(clearStorage())
}
