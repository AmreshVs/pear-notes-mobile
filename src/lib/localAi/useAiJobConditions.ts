import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useDispatch } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  enableLocalAiIndex,
  localAiConditionsChanged,
  localAiUserActivity,
  runLocalAiSchedulerProbe,
} from '@pear-notes/core/store/slices/localAiSlice.js'

const ACTIVITY_THROTTLE_MS = 5000

export function useAiJobConditions() {
  const dispatch = useDispatch()
  const lastActivityRef = useRef(0)

  const onUserTouch = useCallback(() => {
    if (!LOCAL_AI_ENABLED) return
    const now = Date.now()
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return
    lastActivityRef.current = now
    dispatch(localAiUserActivity())
  }, [dispatch])

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    const report = (state: string) => {
      const foreground = state === 'active'
      dispatch({ type: localAiConditionsChanged.type, payload: { foreground } })
      if (foreground) dispatch(localAiUserActivity())
    }
    report(AppState.currentState)
    const subscription = AppState.addEventListener('change', report)
    if (__DEV__ && process.env.EXPO_PUBLIC_AI_SCHEDULER_PROBE === '1') {
      dispatch(runLocalAiSchedulerProbe())
    }
    dispatch(enableLocalAiIndex())
    return () => subscription.remove()
  }, [dispatch])

  return onUserTouch
}
