import { useEffect, useState } from 'react'
import { InteractionManager } from 'react-native'

export function useDeferredEditorMount(forceMount: boolean): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setIsReady(true))
    return () => task.cancel()
  }, [])

  return isReady || forceMount
}
