import { useCallback, useEffect, useRef, useState } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'

const SMART_VIEWS_COLLAPSED_KEY = 'smartViewsCollapsed'

export function useSmartViewsCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false)
  const toggledRef = useRef(false)

  useEffect(() => {
    let active = true
    backendApi
      .getPreference({ key: SMART_VIEWS_COLLAPSED_KEY })
      .then((value: unknown) => {
        if (active && !toggledRef.current) setCollapsed(value === 'true')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const toggle = useCallback(() => {
    toggledRef.current = true
    const next = !collapsed
    setCollapsed(next)
    backendApi
      .updatePreference({ key: SMART_VIEWS_COLLAPSED_KEY, value: next ? 'true' : 'false' })
      .catch(() => {})
  }, [collapsed])

  return [collapsed, toggle]
}
