import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Durations } from '@/constants/commonStyles'

export function useToastState() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideToast = useCallback(() => setVisible(false), [])

  const showToast = useCallback((text: string) => {
    setMessage(text)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    timeoutRef.current = setTimeout(() => setVisible(false), Durations.toast)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible, message])

  const value = useMemo(() => ({ showToast }), [showToast])

  return { visible, message, value, hideToast }
}
