import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  combineHeldMerge,
  dismissHeldMerge,
  getHeldMerge,
} from '@pear-notes/core/store/slices/syncSlice.js'

import type { RestoreOutdatedDevice } from '@/lib/backupFileManager'

export function useHeldMerge() {
  const dispatch = useDispatch()
  const heldMerge = useSelector(getHeldMerge) as { blocking: RestoreOutdatedDevice[] } | null

  const combineLater = useCallback(() => dispatch(dismissHeldMerge()), [dispatch])
  const combineAnyway = useCallback(() => dispatch(combineHeldMerge()), [dispatch])

  return { devices: heldMerge?.blocking ?? null, combineLater, combineAnyway }
}
