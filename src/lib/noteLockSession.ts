import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getCurrentVault } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import { authenticate, getDeviceAuthMethod, isDeviceAuthSupported } from '@/lib/deviceAuth'
import { showLockUnavailable } from '@/lib/lockInfoModal'
import { markNoteUnlocked } from '@/lib/noteLock'
import {
  type NoteLockPasswordPurpose,
  requestNoteLockPassword,
  requestNoteLockPasswordCreate,
} from '@/lib/noteLockPasswordFlow'
import { showNoteLockPrompt } from '@/lib/noteLockPrompt'
import {
  canUseBiometricSecret,
  deleteLockRootKey,
  getLockRootKey,
  setLockRootKey,
} from '@/lib/secureStore'

const PROMPT_DELAY_MS = 400
const MIGRATION_SEEN_PREF = 'noteLockPasswordPromptSeen'
const BIOMETRIC_ON = 'on'
const BIOMETRIC_OFF = 'off'

export type LockPasswordResult = { ok: boolean; retryAfter: number; reason: string }

let enrollRequested = false
let enrolledKey = ''

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const biometricPref = (vaultId: string) => `noteLockBiometric:${vaultId}`

function currentVaultId(): string {
  return (getCurrentVault(store.getState()) as { id?: string } | null)?.id || ''
}

export function hasLockPassword(): boolean {
  return getLockMethod(store.getState()) === 'password'
}

async function readPref(key: string): Promise<string> {
  try {
    return ((await backendApi.getPreference({ key })) as string) || ''
  } catch {
    return ''
  }
}

async function writePref(key: string, value: string): Promise<void> {
  try {
    await backendApi.updatePreference({ key, value })
  } catch (e) {
    log.error('note lock preference', e)
  }
}

export async function canUseBiometricUnlock(): Promise<boolean> {
  if (!canUseBiometricSecret()) return false
  const method = await getDeviceAuthMethod()
  return method === 'face' || method === 'fingerprint' || method === 'iris'
}

export async function isBiometricUnlockOn(): Promise<boolean> {
  const vaultId = currentVaultId()
  return !!vaultId && (await readPref(biometricPref(vaultId))) === BIOMETRIC_ON
}

async function shouldOfferBiometric(): Promise<boolean> {
  const vaultId = currentVaultId()
  if (!vaultId || (await readPref(biometricPref(vaultId))) !== '') return false
  return canUseBiometricUnlock()
}

async function storeRootKey(rootKey: string): Promise<boolean> {
  const vaultId = currentVaultId()
  if (!vaultId) return false
  try {
    await setLockRootKey(vaultId, rootKey)
    await writePref(biometricPref(vaultId), BIOMETRIC_ON)
    return true
  } catch (e) {
    log.error('store lock root key', e)
    return false
  }
}

async function offerBiometric(rootKey: string): Promise<void> {
  await wait(PROMPT_DELAY_MS)
  const vaultId = currentVaultId()
  if (!vaultId) return
  if (await showNoteLockPrompt('biometricOffer')) {
    await storeRootKey(rootKey)
  } else {
    await writePref(biometricPref(vaultId), BIOMETRIC_OFF)
  }
}

async function forgetBiometric(vaultId: string, offerAgain: boolean): Promise<void> {
  await deleteLockRootKey(vaultId)
  await writePref(biometricPref(vaultId), offerAgain ? '' : BIOMETRIC_OFF)
}

async function unlockWithBiometric(reason: string): Promise<boolean> {
  const vaultId = currentVaultId()
  if (!vaultId || (await readPref(biometricPref(vaultId))) !== BIOMETRIC_ON) return false
  let rootKey: string | null
  try {
    rootKey = await getLockRootKey(vaultId, reason)
  } catch (e) {
    if (/cancel/i.test(e instanceof Error ? e.message : String(e))) return false
    await forgetBiometric(vaultId, true)
    return false
  }
  if (!rootKey) {
    await forgetBiometric(vaultId, true)
    return false
  }
  const result = await backendApi.openLockSession({ rootKey })
  if (result.ok) {
    markNoteUnlocked()
    return true
  }
  if (result.reason === 'WRONG_KEY') await forgetBiometric(vaultId, true)
  return false
}

export async function submitLockPassword(password: string): Promise<LockPasswordResult> {
  const enrolling = enrollRequested
  const returnRootKey = enrolling || (await shouldOfferBiometric())
  const result = await backendApi.openLockSession({ password, returnRootKey })
  if (!result.ok && result.reason !== 'DEVICES_OUTDATED') return result
  markNoteUnlocked()
  if (result.rootKey) {
    if (enrolling) enrolledKey = result.rootKey
    else offerBiometric(result.rootKey)
  }
  return { ok: true, retryAfter: 0, reason: result.reason }
}

export async function enableBiometricUnlock(reason: string): Promise<boolean> {
  enrollRequested = true
  enrolledKey = ''
  const ok = await requestNoteLockPassword(reason)
  enrollRequested = false
  const rootKey = enrolledKey
  enrolledKey = ''
  if (!ok || !rootKey) return false
  await wait(PROMPT_DELAY_MS)
  return storeRootKey(rootKey)
}

export async function disableBiometricUnlock(): Promise<void> {
  const vaultId = currentVaultId()
  if (vaultId) await forgetBiometric(vaultId, false)
}

function hasLockedNotes(): boolean {
  const notes = getNotesData(store.getState()) as Record<string, { locked?: boolean } | undefined>
  return Object.values(notes).some((note) => note?.locked === true)
}

// One-time prompt for devices still on the biometric-only lock (design §5).
async function offerPasswordMigration(): Promise<void> {
  if (hasLockPassword() || (await readPref(MIGRATION_SEEN_PREF)) === 'true') return
  await writePref(MIGRATION_SEEN_PREF, 'true')
  if (!(await showNoteLockPrompt('migration'))) return
  await wait(PROMPT_DELAY_MS)
  await requestNoteLockPasswordCreate()
}

export async function offerPasswordMigrationFromSettings(reason: string): Promise<void> {
  if (hasLockPassword() || !hasLockedNotes()) return
  if ((await readPref(MIGRATION_SEEN_PREF)) === 'true') return
  if (!(await isDeviceAuthSupported()) || !(await authenticate(reason))) return
  await offerPasswordMigration()
}

export async function unlockLockedNotes(
  reason: string,
  purpose: NoteLockPasswordPurpose = 'unlock',
): Promise<boolean> {
  if (!hasLockPassword()) {
    if (!(await isDeviceAuthSupported())) {
      showLockUnavailable()
      return false
    }
    if (!(await authenticate(reason))) return false
    await offerPasswordMigration()
    return true
  }
  if (await unlockWithBiometric(reason)) return true
  return requestNoteLockPassword(reason, purpose)
}
