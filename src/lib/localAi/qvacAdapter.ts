import { AppState, AppStateStatus, NativeEventSubscription, Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'

import {
  getFeatureRegistryNames,
  LOCAL_AI_ERROR,
  LOCAL_AI_FEATURE,
  LOCAL_AI_LANGUAGE,
  LOCAL_AI_NETWORK,
  LOCAL_AI_REGISTRY_MODELS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { getTranslationSteps } from '@pear-notes/core/store/services/localAiLanguage.js'
import {
  buildNoteTaskMessages,
  cleanModelOutput,
  DESCRIBE_IMAGE_PROMPT,
  DESCRIBE_MAX_TOKENS,
  getNoteTaskMaxTokens,
  LLM_CONTEXT_SIZE,
  LLM_TEMPERATURE,
  NOTE_TASK,
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { formatOcrBlocks } from '@pear-notes/core/store/services/localAiText.js'
import { getTranslationModelName } from '@pear-notes/core/store/services/localAiTranslationModels.js'

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
const OCR_MAG_RATIO = 1
const OCR_CANVAS_SIZE = 1280
const OCR_RECOGNIZER_BATCH_SIZE = 8
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

const BACKGROUND_SUSPEND_DELAY_MS = 1500
let suspendTimer: ReturnType<typeof setTimeout> | null = null
let suspended = false
let lifecycle: Promise<void> = Promise.resolve()

function queueLifecycle(step: () => Promise<void>) {
  lifecycle = lifecycle.then(step).catch(() => {})
}

function handleAppStateChange(sdk: QvacSdk, state: AppStateStatus) {
  if (state === 'background') {
    if (suspendTimer) return
    suspendTimer = setTimeout(() => {
      suspendTimer = null
      queueLifecycle(async () => {
        await unloadCurrentModel(sdk)
        await sdk.suspend()
        suspended = true
      })
    }, BACKGROUND_SUSPEND_DELAY_MS)
    return
  }
  if (state !== 'active') return
  if (suspendTimer) {
    clearTimeout(suspendTimer)
    suspendTimer = null
  }
  if (!suspended) return
  queueLifecycle(async () => {
    await sdk.resume()
    suspended = false
  })
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
  return sdkPromise.then(async (sdk) => {
    await lifecycle
    return sdk
  })
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
  const modelId = await ensureModelLoaded(sdk, `${recognizerName}|${detectorName}|mobile`, () =>
    loadModelWith(sdk, {
      modelSrc: registryAsset(sdk, recognizerName),
      modelType: 'ocr',
      modelConfig: {
        detectorModelSrc: registryAsset(sdk, detectorName),
        langList: OCR_LANGUAGES,
        magRatio: OCR_MAG_RATIO,
        canvasSize: OCR_CANVAS_SIZE,
        defaultRotationAngles: [],
        recognizerBatchSize: OCR_RECOGNIZER_BATCH_SIZE,
        backendDevice: Platform.OS === 'ios' ? 'metal' : 'cpu',
      },
    }),
  )
  const prepared = await downscaleImage(fileUri, OCR_IMAGE_MAX_SIDE)
  try {
    const { blocks } = sdk.ocr({ modelId, image: toFilePath(prepared ?? fileUri) })
    return formatOcrBlocks(await blocks)
  } finally {
    deleteLocalUri(prepared)
  }
}

const OCR_IMAGE_MAX_SIDE = 1600
const DESCRIBE_IMAGE_MAX_SIDE = 896
const RESIZED_IMAGE_QUALITY = 0.9

function deleteLocalUri(uri: string | null) {
  if (!uri) return
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {}
}

async function downscaleImage(fileUri: string, maxSide: number): Promise<string | null> {
  try {
    const manipulator = await import('expo-image-manipulator')
    const original = await manipulator.ImageManipulator.manipulate(fileUri).renderAsync()
    const longest = Math.max(original.width, original.height)
    if (longest <= maxSide) return null
    const resize = original.width >= original.height ? { width: maxSide } : { height: maxSide }
    const rendered = await manipulator.ImageManipulator.manipulate(fileUri)
      .resize(resize)
      .renderAsync()
    const saved = await rendered.saveAsync({
      compress: RESIZED_IMAGE_QUALITY,
      format: manipulator.SaveFormat.JPEG,
    })
    return saved.uri
  } catch {
    return null
  }
}

type CompletionInput = Record<string, unknown>

function runCompletion(sdk: QvacSdk, input: CompletionInput): Promise<string> {
  const run = (sdk.completion as unknown as (params: CompletionInput) => { text: Promise<string> })(
    input,
  )
  return run.text
}

function loadLlmFeature(sdk: QvacSdk, feature: string) {
  const [modelName, projectionName] = getFeatureRegistryNames(feature, {})
  return ensureModelLoaded(sdk, [modelName, projectionName].filter(Boolean).join('|'), () =>
    loadModelWith(sdk, {
      modelSrc: registryAsset(sdk, modelName),
      modelType: 'llm',
      modelConfig: {
        ctx_size: LLM_CONTEXT_SIZE,
        ...(projectionName ? { projectionModelSrc: registryAsset(sdk, projectionName) } : {}),
      },
    }),
  )
}

export async function describeImage(fileUri: string): Promise<string> {
  const sdk = await loadSdk()
  const modelId = await loadLlmFeature(sdk, LOCAL_AI_FEATURE.DESCRIBE_IMAGES)
  const prepared = await downscaleImage(fileUri, DESCRIBE_IMAGE_MAX_SIDE)
  try {
    const output = await runCompletion(sdk, {
      modelId,
      history: [
        {
          role: 'user',
          content: DESCRIBE_IMAGE_PROMPT,
          attachments: [{ path: toFilePath(prepared ?? fileUri) }],
        },
      ],
      stream: false,
      generationParams: { temp: LLM_TEMPERATURE, predict: DESCRIBE_MAX_TOKENS },
    })
    return cleanModelOutput(output)
  } finally {
    deleteLocalUri(prepared)
  }
}

export async function runNoteTask(task: string, text: string): Promise<string> {
  const sdk = await loadSdk()
  const modelId = await loadLlmFeature(sdk, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  const output = await runCompletion(sdk, {
    modelId,
    history: buildNoteTaskMessages(task, text),
    stream: false,
    generationParams: {
      temp: LLM_TEMPERATURE,
      predict: getNoteTaskMaxTokens(task, text) as number,
    },
  })
  return cleanModelOutput(output)
}

export const summarizeTranscript = (transcript: string) =>
  runNoteTask(NOTE_TASK.TRANSCRIPT_SUMMARY, transcript)

export async function translateParagraphs(
  paragraphs: string[],
  from: string,
  to: string,
): Promise<string[]> {
  const steps = getTranslationSteps(from, to) as [string, string][]
  if (steps.length === 0) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
  const sdk = await loadSdk()
  let lines = paragraphs
  for (const [stepFrom, stepTo] of steps) {
    const modelName = getTranslationModelName(stepFrom, stepTo)
    const modelId = await ensureModelLoaded(sdk, `${modelName}|translate`, () =>
      loadModelWith(sdk, {
        modelSrc: registryAsset(sdk, modelName),
        modelConfig: { engine: 'Bergamot', from: stepFrom, to: stepTo },
      }),
    )
    const run = (
      sdk.translate as unknown as (params: Record<string, unknown>) => {
        translations: Promise<string[]>
      }
    )({ modelId, text: lines, modelType: 'nmtcpp-translation', stream: false })
    lines = (await run.translations).map((line) => String(line ?? ''))
  }
  return lines
}

export interface LiveTranscription {
  stop: () => Promise<string>
  cancel: () => void
  saveAudio: () => string | null
}

const PCM_SAMPLE_RATE = 16000
const PCM_BYTES_PER_SAMPLE = 2
const WAV_HEADER_BYTES = 44
const DICTATION_FILE_PREFIX = 'dictation-'

function writeWavFile(chunks: Uint8Array[]): string | null {
  const dataLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  if (dataLength === 0) return null
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataLength)
  const view = new DataView(bytes.buffer)
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index)
    }
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataLength, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, PCM_SAMPLE_RATE, true)
  view.setUint32(28, PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(32, PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(34, PCM_BYTES_PER_SAMPLE * 8, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataLength, true)
  let offset = WAV_HEADER_BYTES
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  try {
    const file = new File(Paths.cache, `${DICTATION_FILE_PREFIX}${Date.now()}.wav`)
    file.write(bytes)
    return file.uri
  } catch {
    return null
  }
}

export interface LiveTranscriptionHandlers {
  onText: (transcript: string) => void
  onLevel?: (level: number) => void
}

interface TranscriptionStreamSession extends AsyncIterable<unknown> {
  write: (chunk: Uint8Array) => void
  end: () => void
  destroy: () => void
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function streamItemText(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object' && (item as { type?: string }).type === 'text') {
    return String((item as { text?: string }).text ?? '')
  }
  return ''
}

function joinTranscript(current: string, next: string) {
  const piece = next.trim()
  if (!piece) return current
  return current ? `${current} ${piece}` : piece
}

export async function startLiveTranscription(
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
  { onText, onLevel }: LiveTranscriptionHandlers,
): Promise<LiveTranscription> {
  const native = ExpoLocalAi
  if (!native) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  const sdk = await loadSdk()
  const modelId = await loadSpeechModel(sdk, feature, featureConfig)
  const [modelName] = getFeatureRegistryNames(feature, featureConfig)
  const isParakeet =
    (LOCAL_AI_REGISTRY_MODELS as RegistryModels)[modelName]?.engine === PARAKEET_ENGINE
  const openStream = sdk.transcribeStream as unknown as (
    params: Record<string, unknown>,
  ) => Promise<TranscriptionStreamSession>
  const session = await openStream({
    modelId,
    ...(isParakeet ? { parakeetStreamingConfig: {} } : {}),
  })

  let transcript = ''
  let closed = false
  const captured: Uint8Array[] = []
  const reading = (async () => {
    for await (const item of session) {
      const next = joinTranscript(transcript, streamItemText(item))
      if (next === transcript) continue
      transcript = next
      onText(transcript)
    }
  })().catch(() => {})

  const subscription = native.addListener('onPcmChunk', (event) => {
    if (closed) return
    onLevel?.(event.level)
    const chunk = decodeBase64(event.data)
    captured.push(chunk)
    session.write(chunk)
  })

  const release = async () => {
    if (closed) return
    closed = true
    subscription.remove()
    await native.stopPcmStream().catch(() => {})
  }

  try {
    await native.startPcmStream()
  } catch (error) {
    await release()
    session.destroy()
    throw error
  }

  return {
    stop: async () => {
      await release()
      session.end()
      await reading
      return transcript.trim()
    },
    cancel: () => {
      release().finally(() => session.destroy())
    },
    saveAudio: () => writeWavFile(captured),
  }
}

const OCR_MAX_PDF_PAGES = 20

export interface PdfExtractOptions {
  signal?: AbortSignal
  onProgress?: (progress: { page: number; total: number }) => void
}

export async function extractTextFromPdf(
  fileUri: string,
  { signal, onProgress }: PdfExtractOptions = {},
): Promise<string> {
  const { renderPdfPageForOcr } = await import('@/lib/pdfTools')
  const FileSystem = await import('expo-file-system/legacy')
  const texts: string[] = []
  let pageCount = 1
  for (let pageIndex = 0; pageIndex < Math.min(pageCount, OCR_MAX_PDF_PAGES); pageIndex += 1) {
    if (signal?.aborted) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
    const rendered = await renderPdfPageForOcr(fileUri, pageIndex)
    if (!rendered) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
    pageCount = rendered.pageCount
    onProgress?.({ page: pageIndex + 1, total: Math.min(pageCount, OCR_MAX_PDF_PAGES) })
    try {
      const pageText = (await extractTextFromImage(rendered.uri)).trim()
      if (pageText) texts.push(pageText)
    } finally {
      await FileSystem.deleteAsync(rendered.uri, { idempotent: true }).catch(() => {})
    }
  }
  return texts.join('\n\n')
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
