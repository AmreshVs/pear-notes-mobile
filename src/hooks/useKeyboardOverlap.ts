import { useCallback, useEffect, useRef, useState } from 'react'
import { Dimensions, Keyboard, type KeyboardEvent, LayoutAnimation } from 'react-native'

const MIN_LAYOUT_ANIMATION_MS = 10

function animateLike(event: KeyboardEvent) {
  const duration = Math.max(event.duration || 0, MIN_LAYOUT_ANIMATION_MS)
  LayoutAnimation.configureNext({
    duration,
    update: { duration, type: LayoutAnimation.Types.keyboard },
  })
}

export function useKeyboardOverlap() {
  const overlapRef = useRef(0)
  const [overlap, setOverlap] = useState(0)

  const apply = useCallback((next: number, event: KeyboardEvent) => {
    if (overlapRef.current === next) return
    overlapRef.current = next
    animateLike(event)
    setOverlap(next)
  }, [])

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
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [apply, measure])

  return overlap
}
