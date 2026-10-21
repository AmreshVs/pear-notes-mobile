import { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { router } from 'expo-router'

import { getInviterStatus } from '@pear-notes/core/store/slices/syncSlice.js'
import { formatVaultInvite } from '@pear-notes/core/utils.js'

import { useInviteLink } from '@/hooks/useInviteLink'
import { useOpenVault } from '@/hooks/useOpenVault'
import { PAIRING_DONE_STEP } from '@/hooks/useVaultSwitcher'

export function useAddDeviceScreen(defaultName: string) {
  const { openVault } = useOpenVault()
  const name = openVault?.name || defaultName
  const format = useCallback((invite: string) => formatVaultInvite(invite, name), [name])
  const invite = useInviteLink(format)
  const requestedRef = useRef(false)
  const { inviteCode, isLoading, generate } = invite
  const inviterStep = (useSelector(getInviterStatus) as { step?: string })?.step
  const previousStepRef = useRef(inviterStep)

  useEffect(() => {
    if (requestedRef.current || inviteCode || isLoading) return
    requestedRef.current = true
    generate()
  }, [generate, inviteCode, isLoading])

  useEffect(() => {
    const previousStep = previousStepRef.current
    previousStepRef.current = inviterStep
    if (inviterStep !== PAIRING_DONE_STEP || previousStep === PAIRING_DONE_STEP) return
    if (router.canGoBack()) router.back()
  }, [inviterStep])

  return { name, invite }
}
