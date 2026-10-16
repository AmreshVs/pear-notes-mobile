import { useCallback, useEffect, useRef } from 'react'

import { formatVaultInvite } from '@pear-notes/core/utils.js'

import { useInviteLink } from '@/hooks/useInviteLink'
import { useOpenVault } from '@/hooks/useOpenVault'

export function useAddDeviceScreen(defaultName: string) {
  const { openVault } = useOpenVault()
  const name = openVault?.name || defaultName
  const format = useCallback((invite: string) => formatVaultInvite(invite, name), [name])
  const invite = useInviteLink(format)
  const requestedRef = useRef(false)
  const { inviteCode, isLoading, generate } = invite

  useEffect(() => {
    if (requestedRef.current || inviteCode || isLoading) return
    requestedRef.current = true
    generate()
  }, [generate, inviteCode, isLoading])

  return { name, invite }
}
