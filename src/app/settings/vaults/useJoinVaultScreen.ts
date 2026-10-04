import { useCallback, useRef, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { INVITE_KIND, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import { getCanAddVault, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'
import {
  extractInvite,
  getInviteNameHint,
  isInviteForOtherKind,
  isValidInvite,
} from '@pear-notes/core/utils.js'

import { useInviteScanner } from '@/hooks/useInviteScanner'

export function useJoinVaultScreen() {
  const dispatch = useDispatch()
  const canAdd = useSelector(getCanAddVault) as boolean
  const pending = useSelector(getVaultPending)
  const [vaultName, setVaultNameState] = useState('')
  const [code, setCodeState] = useState('')
  const [nameHint, setNameHint] = useState('')
  const nameEditedRef = useRef(false)

  const setVaultName = useCallback((next: string) => {
    nameEditedRef.current = !!next.trim()
    setVaultNameState(next)
  }, [])

  const setCode = useCallback((next: string) => {
    setCodeState(next)
    const hint = getInviteNameHint(next).slice(0, VAULT_NAME_MAX_LENGTH)
    setNameHint(hint)
    if (hint && !nameEditedRef.current) setVaultNameState(hint)
  }, [])

  const scanner = useInviteScanner(setCode)

  const isCodeValid = isValidInvite(code, INVITE_KIND.VAULT)
  const isDeviceLink = isInviteForOtherKind(code, INVITE_KIND.VAULT)
  const showCodeHint = !!code.trim() && !isCodeValid && !isDeviceLink
  const nameFromInvite = !!nameHint && vaultName === nameHint
  const canJoin = canAdd && !pending && isCodeValid && !!vaultName.trim()

  const join = useCallback(() => {
    if (!canJoin) return
    Keyboard.dismiss()
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
    isDeviceLink,
    nameFromInvite,
    canJoin,
    join,
    scanner,
  }
}
