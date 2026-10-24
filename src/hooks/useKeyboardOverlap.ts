import { useCallback, useEffect, useRef, useState } from 'react'
import { Dimensions, Keyboard, type KeyboardEvent, LayoutAnimation } from 'react-native'

const MIN_LAYOUT_ANIMATION_MS = 10
const HIDE_SETTLE_MS = 120

function animateLike(event: KeyboardEvent) {
  const duration = Math.max(event.duration || 0, MIN_LAYOUT_ANIMATION_MS)
  LayoutAnimation.configureNext({
    duration,
    update: { duration, type: LayoutAnimation.Types.keyboard },
  })
}

export function useKeyboardOverlap() {
  const overlapRef = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [overlap, setOverlap] = useState(0)

  const commit = useCallback((next: number, event: KeyboardEvent) => {
    if (overlapRef.current === next) return
    overlapRef.current = next
    animateLike(event)
    setOverlap(next)
  }, [])

  const apply = useCallback(
    (next: number, event: KeyboardEvent) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
      if (next > 0) {
        commit(next, event)
        return
      }
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null
        commit(0, event)
      }, HIDE_SETTLE_MS)
    },
    [commit],
  )

  const measure = useCallback(
    (event: KeyboardEvent) => {
      const windowBottom = Dimensions.get('window').height
      apply(Math.max(0, Math.round(windowBottom - event.endCoordinates.screenY)), event)
    },
    [apply],
  )

  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener('keyboardWillChangeFrame', measure),
      Keyboard.addListener('keyboardDidShow', measure),
      Keyboard.addListener('keyboardWillHide', (event) => apply(0, event)),
    ]
    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [apply, measure])

  return overlap
}
