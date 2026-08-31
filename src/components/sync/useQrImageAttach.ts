import { useCallback, useState } from 'react'

import { hapticError, hapticMedium } from '@/lib/haptics'
import { QrCodeNotFoundError, readInviteFromQrImage } from '@/lib/qrShare'

export function useQrImageAttach(onInviteFound: (invite: string) => void) {
  const [scanError, setScanError] = useState<string | null>(null)

  const clearScanError = useCallback(() => setScanError(null), [])

  const attachQrImage = useCallback(async () => {
    setScanError(null)
    try {
      const data = await readInviteFromQrImage()
      if (!data) return
      hapticMedium()
      onInviteFound(data)
    } catch (error) {
      hapticError()
      setScanError(
        error instanceof QrCodeNotFoundError
          ? 'sync.scanner.noCodeFound'
          : 'sync.scanner.attachError',
      )
    }
  }, [onInviteFound])

  return { scanError, clearScanError, attachQrImage }
}
