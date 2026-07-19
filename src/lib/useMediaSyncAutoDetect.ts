import { useEffect, useRef } from 'react'

import {
  getHoldMediaOnCellular,
  METERED_CONNECTION_KEY,
  setMediaSyncFlag,
} from '@/lib/mediaSyncPolicy'
import { ConnectionKind, getConnectionKind, subscribeConnectionKind } from '@/lib/networkState'

export function useMediaSyncAutoDetect() {
  const lastWrittenRef = useRef<boolean | null>(null)

  useEffect(() => {
    let active = true

    const apply = async (kind: ConnectionKind) => {
      const holdOnCellular = await getHoldMediaOnCellular()
      if (!active) return
      const metered = holdOnCellular && kind === 'cellular'
      if (lastWrittenRef.current === metered) return
      lastWrittenRef.current = metered
      setMediaSyncFlag(METERED_CONNECTION_KEY, metered)
    }

    getConnectionKind().then((kind) => {
      if (active) apply(kind)
    })
    const unsubscribe = subscribeConnectionKind((kind) => {
      if (active) apply(kind)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])
}
