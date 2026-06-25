import * as SecureStore from 'expo-secure-store'

const DB_ENCRYPTION_KEY_NAME = 'db_encryption_key'

export async function getDbEncryptionKey(): Promise<string | null> {
  return SecureStore.getItemAsync(DB_ENCRYPTION_KEY_NAME)
}

export async function setDbEncryptionKey(key: string): Promise<void> {
  return SecureStore.setItemAsync(DB_ENCRYPTION_KEY_NAME, key)
}

export async function deleteDbEncryptionKey(): Promise<void> {
  return SecureStore.deleteItemAsync(DB_ENCRYPTION_KEY_NAME)
}
