import type { Dispatch } from 'redux'

import { resetImport } from '@pear-notes/core/store/slices/backupSlice.js'
import { reclaimStorage } from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'

export function finishRestore(dispatch: Dispatch): void {
  dispatch(reclaimStorage())
  dispatch(resetImport())
  dispatch(setNeedsReload(true))
}
