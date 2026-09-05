import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Clipboard from 'expo-clipboard'

import { hapticSuccess } from '@/lib/haptics'

const COPIED_RESET_MS = 2000

type DiffRow = {
  type: string
  text: string
}

export function useCopyRemovedLines(rows: DiffRow[]) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const removedText = useMemo(
    () =>
      rows
        .filter((row) => row.type === 'del')
        .map((row) => row.text)
        .join('\n'),
    [rows],
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const copyRemoved = useCallback(async () => {
    if (!removedText) return
    await Clipboard.setStringAsync(removedText)
    hapticSuccess()
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [removedText])

  return { canCopy: removedText.length > 0, copied, copyRemoved }
}
