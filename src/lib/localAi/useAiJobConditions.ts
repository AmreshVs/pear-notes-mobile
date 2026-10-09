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

type BatteryModule = typeof import('expo-battery')

// A dev client built before expo-battery was added has no native module; charging then stays unknown.
function loadBattery(): BatteryModule | null {
  try {
    return require('expo-battery') as BatteryModule
  } catch {
    return null
  }
}

// NOT_CHARGING is Android's plugged in but held (battery protection), which still costs no battery.
const isPluggedIn = (battery: BatteryModule, state: number) =>
  state === battery.BatteryState.CHARGING ||
  state === battery.BatteryState.FULL ||
  state === battery.BatteryState.NOT_CHARGING

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
        payload: { charging: !!battery && isPluggedIn(battery, state) },
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
    // Dev builds embed every note again on each launch, to measure a full index; EXPO_PUBLIC_AI_INDEX_REBUILD=0 turns it off.
    dispatch({
      type: enableLocalAiIndex.type,
      payload: {
        waitForCharging: true,
        rebuild: __DEV__ && process.env.EXPO_PUBLIC_AI_INDEX_REBUILD !== '0',
      },
    })
    return () => {
      active = false
      subscription.remove()
      batterySubscription?.remove()
    }
  }, [dispatch])

  return onUserTouch
}
