import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getVaultEnteredAt,
  getVaultPending,
  getVaultPendingId,
  getVaults,
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { getVaultLabel } from '@/lib/vaultLabels'
import type { Vault, VaultAction } from '@/lib/vaults.types'

const SETTLE_TIMEOUT_MS = 5000

const MESSAGE_KEYS: Record<Exclude<VaultAction, 'rename'>, string> = {
  switch: 'vaults.overlay.opening',
  create: 'vaults.overlay.creating',
  remove: 'vaults.overlay.removing',
  move: 'vaults.overlay.moving',
}

export function useVaultChangeOverlay() {
  const { t } = useTranslation()
  const pending = useSelector(getVaultPending) as VaultAction | null
  const pendingId = useSelector(getVaultPendingId) as string | null
  const vaults = useSelector(getVaults) as Vault[]
  const enteredAt = useSelector(getVaultEnteredAt) as number
  const notesLoading = useSelector(getNotesLoading) as boolean
  const [settling, setSettling] = useState(false)
  const lastMessage = useRef('')

  useEffect(() => {
    if (!enteredAt) return
    setSettling(true)
    const timer = setTimeout(() => setSettling(false), SETTLE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [enteredAt])

  useEffect(() => {
    if (settling && !notesLoading) setSettling(false)
  }, [settling, notesLoading])

  const changing = !!pending && pending !== 'rename'
  if (changing) {
    const target = vaults.find((vault) => vault.id === pendingId)
    lastMessage.current = t(MESSAGE_KEYS[pending as keyof typeof MESSAGE_KEYS], {
      name: getVaultLabel(target, t),
    })
  }

  return { visible: changing || settling, message: lastMessage.current }
}
