import type { Dispatch } from 'redux'

import { resetImport } from '@pear-notes/core/store/slices/backupSlice.js'
import { reclaimStorage } from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'

let reclaimAfterReload = false

export function finishRestore(dispatch: Dispatch): void {
  reclaimAfterReload = true
  dispatch(resetImport())
  dispatch(setNeedsReload(true))
}

export function reclaimIfRestored(dispatch: Dispatch): void {
  if (!reclaimAfterReload) return
  reclaimAfterReload = false
  dispatch(reclaimStorage())
}
