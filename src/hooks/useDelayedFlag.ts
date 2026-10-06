import { useEffect, useState } from 'react'

export function useDelayedFlag(delayMs: number) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  return visible
}
