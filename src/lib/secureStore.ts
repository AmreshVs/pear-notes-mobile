import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const DB_ENCRYPTION_KEY_NAME = 'db_encryption_key'
const VAULT_ENTROPY_NAME = 'vault_entropy'

const IOS_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'pear-notes-after-first-unlock',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}
const isIOS = Platform.OS === 'ios'

const cache = new Map<string, string>()

export function isKeychainLockedError(e: unknown): boolean {
  return /user interaction is not allowed/i.test(e instanceof Error ? e.message : String(e))
}

async function readSecret(name: string): Promise<string | null> {
  const cached = cache.get(name)
  if (cached) return cached
  let value: string | null
  if (isIOS) {
    value = await SecureStore.getItemAsync(name, IOS_OPTIONS)
    if (!value) {
      value = await SecureStore.getItemAsync(name)
      if (value) {
        await SecureStore.setItemAsync(name, value, IOS_OPTIONS)
        if ((await SecureStore.getItemAsync(name, IOS_OPTIONS)) === value) {
          await SecureStore.deleteItemAsync(name).catch(() => {})
        }
      }
    }
  } else {
    value = await SecureStore.getItemAsync(name)
  }
  if (value) cache.set(name, value)
  return value
}

async function writeSecret(name: string, value: string): Promise<void> {
  if (isIOS) {
    await SecureStore.setItemAsync(name, value, IOS_OPTIONS)
    await SecureStore.deleteItemAsync(name).catch(() => {})
  } else {
    await SecureStore.setItemAsync(name, value)
  }
  cache.set(name, value)
}

async function deleteSecret(name: string): Promise<void> {
  cache.delete(name)
  if (isIOS) await SecureStore.deleteItemAsync(name, IOS_OPTIONS)
  await SecureStore.deleteItemAsync(name)
}

export async function getDbEncryptionKey(): Promise<string | null> {
  return readSecret(DB_ENCRYPTION_KEY_NAME)
}

export async function setDbEncryptionKey(key: string): Promise<void> {
  return writeSecret(DB_ENCRYPTION_KEY_NAME, key)
}

export async function deleteDbEncryptionKey(): Promise<void> {
  return deleteSecret(DB_ENCRYPTION_KEY_NAME)
}

export async function getVaultEntropy(): Promise<string | null> {
  return readSecret(VAULT_ENTROPY_NAME)
}

export async function setVaultEntropy(entropy: string): Promise<void> {
  return writeSecret(VAULT_ENTROPY_NAME, entropy)
}

export async function deleteVaultEntropy(): Promise<void> {
  return deleteSecret(VAULT_ENTROPY_NAME)
}

export async function clearVaultSecrets(): Promise<void> {
  await Promise.all([deleteDbEncryptionKey(), deleteVaultEntropy()])
}
