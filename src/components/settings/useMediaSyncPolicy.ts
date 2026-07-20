import {
  HOLD_MEDIA_ON_CELLULAR_KEY,
  MEDIA_SYNC_PAUSED_KEY,
  METERED_CONNECTION_KEY,
} from '@pear-notes/core/constant.js'
import { getMediaSyncFlag, setMediaSyncFlag } from '@pear-notes/core/utils.js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getHoldMediaOnCellular } from '@/lib/mediaSyncPolicy'
import { ConnectionKind, getConnectionKind, subscribeConnectionKind } from '@/lib/networkState'

export function useMediaSyncPolicy() {
  const [mediaPaused, setMediaPaused] = useState(false)
  const [holdOnCellular, setHoldOnCellular] = useState(true)
  const [connection, setConnection] = useState<ConnectionKind>('unknown')
  const connectionRef = useRef<ConnectionKind>('unknown')

  useEffect(() => {
    let active = true
    Promise.all([getMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY), getHoldMediaOnCellular()]).then(
      ([paused, hold]) => {
        if (!active) return
        setMediaPaused(paused)
        setHoldOnCellular(hold)
      },
    )
    const track = (kind: ConnectionKind) => {
      if (!active) return
      connectionRef.current = kind
      setConnection(kind)
    }
    getConnectionKind().then(track)
    const unsubscribe = subscribeConnectionKind(track)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const toggleMediaPaused = useCallback(() => {
    setMediaPaused((current) => {
      const next = !current
      setMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY, next)
      return next
    })
  }, [])

  const toggleHoldOnCellular = useCallback(() => {
    setHoldOnCellular((current) => {
      const next = !current
      setMediaSyncFlag(HOLD_MEDIA_ON_CELLULAR_KEY, next)
      setMediaSyncFlag(METERED_CONNECTION_KEY, next && connectionRef.current === 'cellular')
      return next
    })
  }, [])

  const isMetered = holdOnCellular && connection === 'cellular'

  return {
    mediaPaused,
    holdOnCellular,
    connection,
    isMetered,
    isHeld: mediaPaused || isMetered,
    toggleMediaPaused,
    toggleHoldOnCellular,
  }
}
