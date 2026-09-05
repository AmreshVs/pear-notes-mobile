import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { clearUnlockedNotes } from '@/lib/noteLock'

const RELOCK_APP_STATE: AppStateStatus = 'background'

export function useNoteAutoRelock() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === RELOCK_APP_STATE) clearUnlockedNotes()
    })
    return () => subscription.remove()
  }, [])
}
