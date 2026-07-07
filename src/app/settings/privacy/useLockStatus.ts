import { useEffect, useState } from 'react'

import { type DeviceAuthMethod, getDeviceAuthMethod } from '@/lib/deviceAuth'

function useLockStatus() {
  const [lockMethod, setLockMethod] = useState<DeviceAuthMethod>('none')

  useEffect(() => {
    let active = true
    getDeviceAuthMethod().then((method) => {
      if (active) setLockMethod(method)
    })
    return () => {
      active = false
    }
  }, [])

  return { lockAvailable: lockMethod !== 'none', lockMethod }
}

export default useLockStatus
