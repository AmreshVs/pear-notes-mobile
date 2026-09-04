import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useDispatch } from 'react-redux'

import { refreshHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'

export function useHyperdriveAddressRefresh() {
  const dispatch = useDispatch()

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return
      dispatch(refreshHyperdriveAddress())
    })

    return () => subscription.remove()
  }, [dispatch])
}
