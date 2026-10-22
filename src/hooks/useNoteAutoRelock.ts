import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useSelector } from 'react-redux'

import { getCurrentVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { wipeHandedOffAttachmentCopies } from '@/lib/noteAttachmentManager'
import { clearUnlockedNotes } from '@/lib/noteLock'

const RELOCK_APP_STATE: AppStateStatus = 'background'

export function useNoteAutoRelock() {
  const vaultId = (useSelector(getCurrentVault) as { id?: string } | null)?.id || ''
  const vaultRef = useRef(vaultId)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === RELOCK_APP_STATE) clearUnlockedNotes({ afterPendingSaves: true })
      if (state === 'active') wipeHandedOffAttachmentCopies()
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (vaultRef.current === vaultId) return
    vaultRef.current = vaultId
    clearUnlockedNotes()
  }, [vaultId])
}
