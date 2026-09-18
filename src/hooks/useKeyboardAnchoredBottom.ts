import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus, Keyboard } from 'react-native'
import {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KEYBOARD_HIDE_TIMEOUT_MS, subscribeKeyboardHidden } from '@/lib/keyboard'

const KEYBOARD_TRUST_CLOSED = 0
const KEYBOARD_TRUST_OPEN = 1
const KEYBOARD_TRUST_CLOSING = 2

type KeyboardAnchorOptions = {
  gap: number
  enabled?: boolean
}

export function useKeyboardAnchoredBottom({ gap, enabled = true }: KeyboardAnchorOptions) {
  const keyboard = useAnimatedKeyboard()
  const insets = useSafeAreaInsets()

  const initialTrust = enabled && Keyboard.isVisible() ? KEYBOARD_TRUST_OPEN : KEYBOARD_TRUST_CLOSED
  const trust = useSharedValue(initialTrust)
  const trustRef = useRef(initialTrust)
  const enabledRef = useRef(enabled)
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setTrust = useCallback(
    (next: number) => {
      if (closingTimer.current) {
        clearTimeout(closingTimer.current)
        closingTimer.current = null
      }
      trustRef.current = next
      trust.value = next
      if (next !== KEYBOARD_TRUST_CLOSING) return
      closingTimer.current = setTimeout(() => {
        closingTimer.current = null
        if (trustRef.current !== KEYBOARD_TRUST_CLOSING) return
        trustRef.current = KEYBOARD_TRUST_CLOSED
        trust.value = KEYBOARD_TRUST_CLOSED
      }, KEYBOARD_HIDE_TIMEOUT_MS)
    },
    [trust],
  )

  const startClosing = useCallback(() => {
    setTrust(
      trustRef.current === KEYBOARD_TRUST_OPEN ? KEYBOARD_TRUST_CLOSING : KEYBOARD_TRUST_CLOSED,
    )
  }, [setTrust])

  useEffect(() => {
    if (enabledRef.current === enabled) return
    enabledRef.current = enabled
    if (!enabled) {
      startClosing()
      return
    }
    setTrust(Keyboard.isVisible() ? KEYBOARD_TRUST_OPEN : KEYBOARD_TRUST_CLOSED)
  }, [enabled, setTrust, startClosing])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setTrust(enabledRef.current ? KEYBOARD_TRUST_OPEN : KEYBOARD_TRUST_CLOSED)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setTrust(KEYBOARD_TRUST_CLOSED))
    const appState = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') setTrust(KEYBOARD_TRUST_CLOSED)
    })
    const unsubscribeHidden = subscribeKeyboardHidden(startClosing)

    return () => {
      show.remove()
      hide.remove()
      appState.remove()
      unsubscribeHidden()
      if (closingTimer.current) {
        clearTimeout(closingTimer.current)
        closingTimer.current = null
      }
    }
  }, [setTrust, startClosing])

  const restingBottom = insets.bottom + gap

  return useAnimatedStyle(() => {
    const state = keyboard.state.value
    const height = keyboard.height.value
    const isKeyboardOnScreen =
      state === KeyboardState.OPENING ||
      state === KeyboardState.OPEN ||
      state === KeyboardState.CLOSING
    if (trust.value === KEYBOARD_TRUST_CLOSED || !isKeyboardOnScreen || height <= 0) {
      return { bottom: restingBottom }
    }
    return { bottom: Math.max(height + gap, restingBottom) }
  })
}
