import { type RefObject, useEffect } from 'react'
import type { TextInput } from 'react-native'
import { useNavigation } from 'expo-router'

const FOCUS_FALLBACK_MS = 700

export function useFocusAfterTransition(inputRef: RefObject<TextInput | null>) {
  const navigation = useNavigation()

  useEffect(() => {
    let focused = false
    const focus = () => {
      if (focused) return
      focused = true
      inputRef.current?.focus()
    }
    const fallback = setTimeout(focus, FOCUS_FALLBACK_MS)
    const unsubscribe = navigation.addListener(
      'transitionEnd' as never,
      ((event: { data?: { closing?: boolean } }) => {
        if (!event.data?.closing) focus()
      }) as never,
    )
    return () => {
      clearTimeout(fallback)
      unsubscribe()
    }
  }, [inputRef, navigation])
}
