import * as SecureStore from 'expo-secure-store'

const DB_ENCRYPTION_KEY_NAME = 'db_encryption_key'
const VAULT_ENTROPY_NAME = 'vault_entropy'

export async function getDbEncryptionKey(): Promise<string | null> {
  return SecureStore.getItemAsync(DB_ENCRYPTION_KEY_NAME)
}

export async function setDbEncryptionKey(key: string): Promise<void> {
  return SecureStore.setItemAsync(DB_ENCRYPTION_KEY_NAME, key)
}

export async function deleteDbEncryptionKey(): Promise<void> {
  return SecureStore.deleteItemAsync(DB_ENCRYPTION_KEY_NAME)
}

export async function getVaultEntropy(): Promise<string | null> {
  return SecureStore.getItemAsync(VAULT_ENTROPY_NAME)
}

export async function setVaultEntropy(entropy: string): Promise<void> {
  return SecureStore.setItemAsync(VAULT_ENTROPY_NAME, entropy)
}

export async function deleteVaultEntropy(): Promise<void> {
  return SecureStore.deleteItemAsync(VAULT_ENTROPY_NAME)
}

export async function clearVaultSecrets(): Promise<void> {
  await Promise.all([deleteDbEncryptionKey(), deleteVaultEntropy()])
}
