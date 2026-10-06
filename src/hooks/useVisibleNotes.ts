import { useEffect, useRef } from 'react'
import { InteractionManager, type ViewToken } from 'react-native'
import { useDispatch } from 'react-redux'

import { setVisibleNotes } from '@pear-notes/core/store/slices/notesSlice.js'

const ROWS_ABOVE = 4
const ROWS_BELOW = 10
const REPORT_DEBOUNCE_MS = 80
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1 }

export function useVisibleNotes(orderedKeys: string[]) {
  const dispatch = useDispatch()
  const keysRef = useRef(orderedKeys)
  const viewableRef = useRef<string[]>([])
  const reportedRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  keysRef.current = orderedKeys

  const report = useRef(() => {
    const keys = keysRef.current
    const indexes = viewableRef.current
      .map((key) => keys.indexOf(key))
      .filter((index) => index >= 0)
    if (indexes.length === 0) return
    const from = Math.max(0, Math.min(...indexes) - ROWS_ABOVE)
    const to = Math.max(...indexes) + ROWS_BELOW + 1
    const window = keys.slice(from, to)
    const signature = window.join(',')
    if (signature === reportedRef.current) return
    reportedRef.current = signature
    dispatch(setVisibleNotes(window as any))
  }).current

  const scheduleReport = useRef(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => InteractionManager.runAfterInteractions(report),
      REPORT_DEBOUNCE_MS,
    )
  }).current

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    viewableRef.current = viewableItems
      .map((token) => token.item?.key)
      .filter((key): key is string => typeof key === 'string')
    scheduleReport()
  }).current

  useEffect(() => {
    scheduleReport()
  }, [orderedKeys, scheduleReport])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { onViewableItemsChanged, viewabilityConfig: VIEWABILITY_CONFIG }
}
