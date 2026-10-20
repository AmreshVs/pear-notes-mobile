import { useCallback, useRef, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import { subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import { getCanAddVault, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { getInviteNameHint, isValidInvite } from '@pear-notes/core/utils.js'

import { JOIN_CHOICE } from '@/constants/vaultActions'
import { useInviteScanner } from '@/hooks/useInviteScanner'
import { useOpenVault } from '@/hooks/useOpenVault'
import { hapticSelection } from '@/lib/haptics'
import type { JoinChoice } from '@/lib/vaults.types'

export function useJoinVaultScreen() {
  const dispatch = useDispatch()
  const canAdd = useSelector(getCanAddVault) as boolean
  const pending = useSelector(getVaultPending)
  const notes = useSelector(getNotes) as any[]
  const { openVault } = useOpenVault()
  const [vaultName, setVaultNameState] = useState('')
  const [code, setCodeState] = useState('')
  const [nameHint, setNameHint] = useState('')
  const [picked, setPicked] = useState<JoinChoice | null>(null)
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

  const setChoice = useCallback((next: JoinChoice) => {
    hapticSelection()
    setPicked(next)
  }, [])

  const scanner = useInviteScanner(setCode)

  const hasNotes = notes.length > 0
  const choice = picked === JOIN_CHOICE.combine ? picked : canAdd ? JOIN_CHOICE.separate : null
  const keepsSeparate = hasNotes && choice === JOIN_CHOICE.separate
  const isCodeValid = isValidInvite(code)
  const showCodeHint = !!code.trim() && !isCodeValid
  const nameFromInvite = !!nameHint && vaultName === nameHint
  const choiceReady = !hasNotes || choice === JOIN_CHOICE.combine || (canAdd && !!vaultName.trim())
  const canJoin = !pending && isCodeValid && choiceReady

  const join = useCallback(() => {
    if (!canJoin) return
    Keyboard.dismiss()
    const invite = code.trim()
    dispatch(
      keepsSeparate
        ? subscribePairUser({ invite, mode: 'add', vaultName: vaultName.trim() })
        : subscribePairUser({ invite }),
    )
    if (Platform.OS === 'ios') router.dismissAll()
    router.back()
  }, [canJoin, code, dispatch, keepsSeparate, vaultName])

  return {
    openVault,
    vaultName,
    setVaultName,
    code,
    setCode,
    showCodeHint,
    nameFromInvite,
    hasNotes,
    canAdd,
    choice,
    setChoice,
    keepsSeparate,
    canJoin,
    join,
    scanner,
  }
}
