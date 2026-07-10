import { useEffect, useState } from 'react'

import { AppUpdateStatus, checkAppUpdate } from '@/lib/appUpdateCheck'

export function useAppUpdateStatus() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    checkAppUpdate().then((result) => {
      if (!cancelled) setStatus(result)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
