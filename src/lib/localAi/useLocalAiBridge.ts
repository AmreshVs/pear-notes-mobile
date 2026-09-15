import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useDispatch } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  localAiAppResumed,
  localAiNetworkChanged,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { toLocalAiNetwork } from '@/lib/localAi/qvacAdapter'
import { subscribeConnectionKind } from '@/lib/networkState'

export function useLocalAiBridge() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    const unsubscribeNetwork = subscribeConnectionKind((kind) => {
      dispatch({ type: localAiNetworkChanged.type, payload: toLocalAiNetwork(kind) })
    })
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') dispatch(localAiAppResumed())
    })
    return () => {
      unsubscribeNetwork()
      appStateSubscription.remove()
    }
  }, [dispatch])
}
