import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  enableLocalAiIndex,
  getLocalAiIndex,
  localAiConditionsChanged,
  localAiUserActivity,
  runLocalAiSchedulerProbe,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { applyBackgroundIndex, loadIndexOnlyWhileCharging } from '@/lib/backgroundIndexTask'
import { isPluggedInState, loadBattery } from '@/lib/battery'

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
    const battery = loadBattery()
    const reportCharging = (state: number) =>
      dispatch({
        type: localAiConditionsChanged.type,
        payload: { charging: !!battery && isPluggedInState(battery, state) },
      })
    let active = true
    battery
      ?.getBatteryStateAsync()
      .then((state) => active && reportCharging(state))
      .catch(() => {})
    const batterySubscription = battery?.addBatteryStateListener(({ batteryState }) =>
      reportCharging(batteryState),
    )
    if (__DEV__ && process.env.EXPO_PUBLIC_AI_SCHEDULER_PROBE === '1') {
      dispatch(runLocalAiSchedulerProbe())
    }
    // Dev only: EXPO_PUBLIC_AI_INDEX_REBUILD=1 embeds every note again, to measure a full index.
    loadIndexOnlyWhileCharging().then((waitForCharging) => {
      if (!active) return
      dispatch({
        type: enableLocalAiIndex.type,
        payload: {
          waitForCharging,
          rebuild: __DEV__ && process.env.EXPO_PUBLIC_AI_INDEX_REBUILD === '1',
        },
      })
    })
    return () => {
      active = false
      subscription.remove()
      batterySubscription?.remove()
    }
  }, [dispatch])

  const indexEnabled = (useSelector(getLocalAiIndex) as { enabled: boolean }).enabled
  useEffect(() => {
    if (LOCAL_AI_ENABLED) applyBackgroundIndex(indexEnabled)
  }, [indexEnabled])

  return onUserTouch
}
