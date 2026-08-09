import { useEffect, useState } from 'react'

const DEFERRED_MOUNT_TIMEOUT = 2000

export function useDeferredEditorMount(forceMount: boolean): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const handle = requestIdleCallback(() => setIsReady(true), {
      timeout: DEFERRED_MOUNT_TIMEOUT,
    })
    return () => cancelIdleCallback(handle)
  }, [])

  return isReady || forceMount
}
