import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native'
import { File, Paths } from 'expo-file-system'

import {
  getFeatureRegistryNames,
  LOCAL_AI_ERROR,
  LOCAL_AI_FEATURE,
  LOCAL_AI_LANGUAGE,
  LOCAL_AI_NETWORK,
  LOCAL_AI_REGISTRY_MODELS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { formatOcrBlocks } from '@pear-notes/core/store/services/localAiText.js'

import { getLocalAiDeviceSupport, getLocalAiDiskSpace } from '@/lib/localAi/deviceSupport'
import { ConnectionKind, getConnectionKind } from '@/lib/networkState'

import ExpoLocalAi from '../../../modules/expo-local-ai'

type QvacSdk = typeof import('@qvac/sdk')
type LoadModelInput = Record<string, unknown>
type RegistryModels = Record<string, { bytes: number; engine: string } | undefined>
type DownloadAssetInput = Parameters<QvacSdk['downloadAsset']>[0]

export interface LocalAiFeatureModelConfig {
  tier?: string
  language?: string
}

interface DownloadProgress {
  downloadedBytes: number
  totalBytes: number
}

interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void
}

interface CancelOptions {
  discard?: boolean
}

interface PendingDownload {
  sdkRequestId: string | null
  cancelled: boolean
  discard: boolean
}

const QVAC_RUNTIME_CONFIG_FILE = 'qvac.config.json'
const PCM_FILE_PREFIX = 'local-ai-audio-'
const PCM_FILE_EXTENSION = '.raw'
const OCR_LANGUAGES = ['en']
const PARAKEET_ENGINE = 'parakeet'
const WHISPER_AUDIO_FORMAT = 's16le'

const NETWORK_BY_CONNECTION: Record<ConnectionKind, string> = {
  wifi: LOCAL_AI_NETWORK.WIFI,
  cellular: LOCAL_AI_NETWORK.CELLULAR,
  other: LOCAL_AI_NETWORK.OTHER,
  offline: LOCAL_AI_NETWORK.OFFLINE,
  unknown: LOCAL_AI_NETWORK.UNKNOWN,
}

export class LocalAiError extends Error {
  code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

let sdkPromise: Promise<QvacSdk> | null = null
let modelsDirectory: string | null = null
let appStateSubscription: NativeEventSubscription | null = null
let loadedModel: { key: string; modelId: string } | null = null
let downloadCounter = 0
const pendingDownloads = new Map<string, PendingDownload>()

export const toLocalAiNetwork = (kind: ConnectionKind) => NETWORK_BY_CONNECTION[kind]

const toFilePath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''))

const toFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`)

async function ensureModelsDirectory(): Promise<string> {
  if (!ExpoLocalAi) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  if (!modelsDirectory) modelsDirectory = await ExpoLocalAi.prepareModelsDirectory()
  return modelsDirectory
}

async function writeRuntimeConfig(cacheDirectory: string) {
  const file = new File(Paths.document, QVAC_RUNTIME_CONFIG_FILE)
  const contents = JSON.stringify({ cacheDirectory })
  if (file.exists) {
    try {
      if ((await file.text()) === contents) return
    } catch {}
  }
  file.write(contents)
}

async function unloadCurrentModel(sdk: QvacSdk) {
  const current = loadedModel
  loadedModel = null
  if (!current) return
  try {
    await sdk.unloadModel({ modelId: current.modelId })
  } catch {}
}

function handleAppStateChange(sdk: QvacSdk, state: AppStateStatus) {
  if (state === 'background') {
    unloadCurrentModel(sdk)
      .then(() => sdk.suspend())
      .catch(() => {})
    return
  }
  if (state === 'active') sdk.resume().catch(() => {})
}

function loadSdk(): Promise<QvacSdk> {
  if (!sdkPromise) {
    const pending = (async () => {
      const directory = await ensureModelsDirectory()
      await writeRuntimeConfig(directory)
      const sdk = await import('@qvac/sdk')
      appStateSubscription?.remove()
      appStateSubscription = AppState.addEventListener('change', (state) =>
        handleAppStateChange(sdk, state),
      )
      return sdk
    })()
    sdkPromise = pending
    pending.catch(() => {
      if (sdkPromise === pending) sdkPromise = null
    })
  }
  return sdkPromise
}

function registryAsset(sdk: QvacSdk, name: string): unknown {
  const asset = (sdk as unknown as Record<string, unknown>)[name]
  if (!asset) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  return asset
}

function loadModelWith(sdk: QvacSdk, options: LoadModelInput): Promise<string> {
  return (sdk.loadModel as unknown as (input: LoadModelInput) => Promise<string>)(options)
}

async function ensureModelLoaded(sdk: QvacSdk, key: string, load: () => Promise<string>) {
  if (loadedModel?.key === key) return loadedModel.modelId
  await unloadCurrentModel(sdk)
  const modelId = await load()
  loadedModel = { key, modelId }
  return modelId
}

function toDownloadError(error: unknown) {
  if (error instanceof LocalAiError) return error
  if (AppState.currentState !== 'active') return new LocalAiError(LOCAL_AI_ERROR.INTERRUPTED)
  const message = error instanceof Error ? error.message : String(error)
  return new LocalAiError(LOCAL_AI_ERROR.DOWNLOAD_FAILED, message)
}

async function getNetworkKind() {
  return toLocalAiNetwork(await getConnectionKind())
}

function download(name: string, { onProgress }: DownloadOptions = {}) {
  downloadCounter += 1
  const requestId = `local-ai-download-${downloadCounter}`
  const pending: PendingDownload = { sdkRequestId: null, cancelled: false, discard: false }
  pendingDownloads.set(requestId, pending)

  const done = (async () => {
    try {
      const sdk = await loadSdk()
      const operation = sdk.downloadAsset({
        assetSrc: registryAsset(sdk, name) as DownloadAssetInput['assetSrc'],
        onProgress: (progress) =>
          onProgress?.({ downloadedBytes: progress.downloaded, totalBytes: progress.total }),
        requireSecureTransport: true,
        requireHttpChecksum: true,
      })
      pending.sdkRequestId = operation.requestId
      if (pending.cancelled) {
        sdk.cancel({ requestId: operation.requestId, clearCache: pending.discard }).catch(() => {})
      }
      await operation
      return { bytes: (LOCAL_AI_REGISTRY_MODELS as RegistryModels)[name]?.bytes ?? 0 }
    } catch (error) {
      throw toDownloadError(error)
    } finally {
      pendingDownloads.delete(requestId)
    }
  })()

  return { requestId, done }
}

async function cancel(requestId: string, { discard = false }: CancelOptions = {}) {
  const pending = pendingDownloads.get(requestId)
  if (!pending) return
  pending.cancelled = true
  pending.discard = discard
  if (!pending.sdkRequestId || !sdkPromise) return
  const sdk = await sdkPromise
  await sdk.cancel({ requestId: pending.sdkRequestId, clearCache: discard })
}

async function deleteModel(name: string) {
  const sdk = await loadSdk()
  await unloadCurrentModel(sdk)
  const info = await sdk.getModelInfo({ name })
  for (const cacheFile of info.cacheFiles ?? []) {
    try {
      const file = new File(toFileUri(cacheFile.path))
      if (file.exists) file.delete()
    } catch {}
  }
}

async function closeAndWipe() {
  appStateSubscription?.remove()
  appStateSubscription = null
  const pendingSdk = sdkPromise
  sdkPromise = null
  if (pendingSdk) {
    try {
      const sdk = await pendingSdk
      await unloadCurrentModel(sdk)
      await sdk.close()
    } catch {}
  }
  loadedModel = null
  pendingDownloads.clear()
  if (ExpoLocalAi) await ExpoLocalAi.deleteModelsDirectory()
  modelsDirectory = null
}

async function loadSpeechModel(
  sdk: QvacSdk,
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
) {
  const names = getFeatureRegistryNames(feature, featureConfig)
  const [modelName, vadName] = names
  const englishOnly = featureConfig.language === LOCAL_AI_LANGUAGE.ENGLISH
  return ensureModelLoaded(sdk, names.join('|'), () => {
    if ((LOCAL_AI_REGISTRY_MODELS as RegistryModels)[modelName]?.engine === PARAKEET_ENGINE) {
      return loadModelWith(sdk, {
        modelSrc: registryAsset(sdk, modelName),
        modelType: PARAKEET_ENGINE,
      })
    }
    return loadModelWith(sdk, {
      modelSrc: registryAsset(sdk, modelName),
      modelType: 'whisper',
      modelConfig: {
        vadModelSrc: registryAsset(sdk, vadName),
        audio_format: WHISPER_AUDIO_FORMAT,
        ...(englishOnly ? { language: LOCAL_AI_LANGUAGE.ENGLISH } : {}),
      },
    })
  })
}

export async function transcribeAudioFile(
  fileUri: string,
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
): Promise<string> {
  if (!ExpoLocalAi) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  const sdk = await loadSdk()
  const modelId = await loadSpeechModel(sdk, feature, featureConfig)
  const pcmFile = new File(Paths.cache, `${PCM_FILE_PREFIX}${Date.now()}${PCM_FILE_EXTENSION}`)
  try {
    await ExpoLocalAi.decodeAudioToPcm(toFilePath(fileUri), toFilePath(pcmFile.uri))
    const text = await sdk.transcribe({ modelId, audioChunk: toFilePath(pcmFile.uri) })
    return text.trim()
  } finally {
    try {
      if (pcmFile.exists) pcmFile.delete()
    } catch {}
  }
}

export async function extractTextFromImage(fileUri: string): Promise<string> {
  const sdk = await loadSdk()
  const [recognizerName, detectorName] = getFeatureRegistryNames(LOCAL_AI_FEATURE.EXTRACT_TEXT, {})
  const modelId = await ensureModelLoaded(sdk, `${recognizerName}|${detectorName}`, () =>
    loadModelWith(sdk, {
      modelSrc: registryAsset(sdk, recognizerName),
      modelType: 'ocr',
      modelConfig: { detectorModelSrc: registryAsset(sdk, detectorName), langList: OCR_LANGUAGES },
    }),
  )
  const { blocks } = sdk.ocr({ modelId, image: toFilePath(fileUri) })
  return formatOcrBlocks(await blocks)
}

export async function cancelLocalAiTask() {
  if (!sdkPromise || !loadedModel) return
  const sdk = await sdkPromise
  await sdk.cancel({ modelId: loadedModel.modelId })
}

export const qvacAdapter = {
  getDeviceSupport: getLocalAiDeviceSupport,
  getNetworkKind,
  getDiskSpace: getLocalAiDiskSpace,
  download,
  cancel,
  deleteModel,
  closeAndWipe,
}
