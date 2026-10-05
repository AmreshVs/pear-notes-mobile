import { Directory, File } from 'expo-file-system'

import {
  classifyVaultStorageEntry,
  DEVICE_STORAGE,
  isOldVaultEntry,
  summarizeDeviceStorage,
} from '@pear-notes/core/store/services/deviceStorage.js'

import { ATTACHMENT_THUMBNAIL_CACHE_DIR } from '@/constants/constants'

import ExpoLocalAi from '../../modules/expo-local-ai'

export type DeviceStorageSummary = {
  total: number
  byCategory: Record<string, number>
}

type Item = { category: string; bytes: number }

const HOME_CACHE_DIRS = new Set(['tmp'])
const VAULTS_DIR = 'vaults'
const QVAC_DIR = '.qvac'

const join = (dir: string, name: string) => `${dir.replace(/\/+$/, '')}/${name}`
const isAncestor = (dir: string, path: string) => !!path && path.startsWith(`${dir}/`)
const toUri = (path: string) => `file://${path}`

async function list(dir: string) {
  try {
    return await ExpoLocalAi!.listDirectorySizes(dir)
  } catch {
    return []
  }
}

export async function measureDeviceStorage(): Promise<DeviceStorageSummary | null> {
  if (!ExpoLocalAi?.getStorageRoots) return null
  const roots = await ExpoLocalAi.getStorageRoots()
  const special = [roots.documents, roots.caches, roots.models].filter(Boolean)

  const walk = async (dir: string): Promise<Item[]> => {
    const items: Item[] = []
    for (const entry of await list(dir)) {
      const path = join(dir, entry.name)
      if (path === roots.models) {
        items.push({ category: DEVICE_STORAGE.AI_MODELS, bytes: entry.bytes })
      } else if (dir === roots.documents && entry.name === QVAC_DIR) {
        items.push({ category: DEVICE_STORAGE.CACHE, bytes: entry.bytes })
      } else if (dir === roots.documents && !special.some((s) => isAncestor(path, s))) {
        const category = classifyVaultStorageEntry(entry.name) ?? DEVICE_STORAGE.OTHER
        items.push({ category, bytes: entry.bytes })
      } else if (dir === roots.caches) {
        const category =
          entry.name === ATTACHMENT_THUMBNAIL_CACHE_DIR
            ? DEVICE_STORAGE.PREVIEWS
            : DEVICE_STORAGE.CACHE
        items.push({ category, bytes: entry.bytes })
      } else if (entry.isDirectory && special.some((s) => s === path || isAncestor(path, s))) {
        items.push(...(await walk(path)))
      } else if (dir === roots.home && HOME_CACHE_DIRS.has(entry.name)) {
        items.push({ category: DEVICE_STORAGE.CACHE, bytes: entry.bytes })
      } else {
        items.push({ category: DEVICE_STORAGE.OTHER, bytes: entry.bytes })
      }
    }
    return items
  }

  const items: Item[] = [{ category: DEVICE_STORAGE.APP, bytes: roots.appBytes }]
  items.push(...(await walk(roots.home)))
  if (roots.shared && !isAncestor(roots.home, roots.shared)) {
    const shared = await list(roots.shared)
    for (const entry of shared) items.push({ category: DEVICE_STORAGE.OTHER, bytes: entry.bytes })
  }
  return summarizeDeviceStorage(items) as DeviceStorageSummary
}

export async function measureVaultSizes(): Promise<Record<string, number>> {
  if (!ExpoLocalAi?.getStorageRoots) return {}
  const { documents } = await ExpoLocalAi.getStorageRoots()
  const sizes: Record<string, number> = {}
  for (const entry of await list(join(documents, VAULTS_DIR))) sizes[entry.name] = entry.bytes
  return sizes
}

export async function deleteOldVaults(): Promise<void> {
  if (!ExpoLocalAi?.getStorageRoots) return
  const { documents } = await ExpoLocalAi.getStorageRoots()
  for (const entry of await list(documents)) {
    if (!isOldVaultEntry(entry.name)) continue
    try {
      const directory = new Directory(toUri(join(documents, entry.name)))
      if (directory.exists) directory.delete()
    } catch {}
  }
}

export async function clearTemporaryFiles(): Promise<void> {
  if (!ExpoLocalAi?.getStorageRoots) return
  const { home } = await ExpoLocalAi.getStorageRoots()
  for (const name of HOME_CACHE_DIRS) {
    const dir = join(home, name)
    for (const entry of await list(dir)) {
      try {
        const path = toUri(join(dir, entry.name))
        if (entry.isDirectory) new Directory(path).delete()
        else new File(path).delete()
      } catch {}
    }
  }
}
