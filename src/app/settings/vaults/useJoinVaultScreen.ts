import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import { getCanAddVault, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'

import { useInviteScanner } from '@/hooks/useInviteScanner'

export function useJoinVaultScreen() {
  const dispatch = useDispatch()
  const canAdd = useSelector(getCanAddVault) as boolean
  const pending = useSelector(getVaultPending)
  const [vaultName, setVaultName] = useState('')
  const [code, setCode] = useState('')

  const scanner = useInviteScanner(setCode)

  const isCodeValid = isValidInvite(code)
  const showCodeHint = !!code.trim() && !isCodeValid
  const canJoin = canAdd && !pending && isCodeValid && !!vaultName.trim()

  const join = useCallback(() => {
    if (!canJoin) return
    dispatch(
      subscribePairUser({ invite: extractInvite(code), mode: 'add', vaultName: vaultName.trim() }),
    )
    if (Platform.OS === 'ios') router.dismissAll()
    router.back()
  }, [canJoin, code, dispatch, vaultName])

  return {
    vaultName,
    setVaultName,
    code,
    setCode,
    showCodeHint,
    canJoin,
    join,
    scanner,
  }
}
