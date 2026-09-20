import { AppState, AppStateStatus, NativeEventSubscription, Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'

import {
  ASK_RESPONSE_FORMAT,
  buildAskFullTextMessages,
  buildAskMessages,
  extractPartialAnswer,
  getAskFullTextParams,
  getAskGenerationParams,
  pickAskReply,
  shouldRetryAskForEdits,
  shouldTryAskFullText,
  toAskFullTextReply,
} from '@pear-notes/core/store/services/localAiAsk.js'
import {
  getFeatureRegistryNames,
  LOCAL_AI_ERROR,
  LOCAL_AI_FEATURE,
  LOCAL_AI_LANGUAGE,
  LOCAL_AI_NETWORK,
  LOCAL_AI_OCR_LANGUAGES,
  LOCAL_AI_REGISTRY_MODELS,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { getTranslationSteps } from '@pear-notes/core/store/services/localAiLanguage.js'
import {
  buildNoteTaskMessages,
  cleanModelOutput,
  DESCRIBE_IMAGE_PROMPT,
  DESCRIBE_MAX_TOKENS,
  getNoteTaskGenerationParams,
  LLM_CONTEXT_SIZE,
  LLM_TEMPERATURE,
  NOTE_TASK,
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { formatOcrBlocks } from '@pear-notes/core/store/services/localAiText.js'
import { getTranslationModelName } from '@pear-notes/core/store/services/localAiTranslationModels.js'
import {
  countWords,
  WORK_EVENT,
  WORK_STEP,
} from '@pear-notes/core/store/services/localAiWorkProgress.js'

import { getLocalAiDeviceSupport, getLocalAiDiskSpace } from '@/lib/localAi/deviceSupport'
import { ConnectionKind, getConnectionKind } from '@/lib/networkState'

import ExpoLocalAi from '../../../modules/expo-local-ai'

type QvacSdk = typeof import('@qvac/sdk')
type LoadModelInput = Record<string, unknown>
type RegistryModels = Record<string, { bytes: number; engine: string } | undefined>
type DownloadAssetInput = Parameters<QvacSdk['downloadAsset']>[0]
type OcrBlock = Awaited<ReturnType<QvacSdk['ocr']>['blocks']>[number]

export interface LocalAiWorkEvent {
  type: string
  step?: string
  model?: string
  text?: string
  doneMs?: number
  totalMs?: number
  page?: number
  total?: number
  words?: number
  done?: number
  hop?: number
  hops?: number
  from?: string
  to?: string
}

export type LocalAiWorkListener = (event: LocalAiWorkEvent) => void

export interface LocalAiWorkOptions {
  onProgress?: LocalAiWorkListener
}

const TRANSLATE_BATCH_PARAGRAPHS = 8

const joinParts = (parts: string[]) => parts.filter(Boolean).join('\n\n')

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
let memoryWarningSubscription: NativeEventSubscription | null = null
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

const MODEL_GUARD_FILE = 'local-ai-model-guard.json'
const MODEL_CRASH_LIMIT = 2
const MODEL_IDLE_UNLOAD_MS = 60 * 1000

interface ModelGuard {
  active: string | null
  crashes: Record<string, number>
}

let modelGuard: ModelGuard | null = null
let activeModelWork = 0
let idleUnloadTimer: ReturnType<typeof setTimeout> | null = null
let unloadWhenIdle = false

function readModelGuard(): ModelGuard {
  if (modelGuard) return modelGuard
  let stored: Partial<ModelGuard> = {}
  try {
    const file = new File(Paths.document, MODEL_GUARD_FILE)
    if (file.exists) stored = JSON.parse(file.textSync()) as Partial<ModelGuard>
  } catch {}
  const crashes = { ...(stored.crashes ?? {}) }
  if (stored.active) crashes[stored.active] = (crashes[stored.active] ?? 0) + 1
  modelGuard = { active: null, crashes }
  if (stored.active) writeModelGuard()
  return modelGuard
}

function writeModelGuard() {
  if (!modelGuard) return
  try {
    new File(Paths.document, MODEL_GUARD_FILE).write(JSON.stringify(modelGuard))
  } catch {}
}

function setActiveModel(key: string | null) {
  const guard = readModelGuard()
  if (guard.active === key) return
  guard.active = key
  writeModelGuard()
}

function recordModelSuccess(key: string) {
  const guard = readModelGuard()
  if (!guard.crashes[key]) return
  delete guard.crashes[key]
  writeModelGuard()
}

function forgetModelCrashes(match: (key: string) => boolean) {
  const guard = readModelGuard()
  const keys = Object.keys(guard.crashes).filter(match)
  if (keys.length === 0) return
  for (const key of keys) delete guard.crashes[key]
  writeModelGuard()
}

export function resetLocalAiModelHealth() {
  forgetModelCrashes(() => true)
}

function clearIdleUnload() {
  if (idleUnloadTimer) clearTimeout(idleUnloadTimer)
  idleUnloadTimer = null
}

function releaseModelWhenIdle() {
  if (activeModelWork > 0 || !sdkPromise) return
  clearIdleUnload()
  unloadWhenIdle = false
  sdkPromise.then(unloadCurrentModel).catch(() => {})
}

async function withModelWork<T>(work: () => Promise<T>): Promise<T> {
  activeModelWork += 1
  clearIdleUnload()
  try {
    const result = await work()
    if (loadedModel) recordModelSuccess(loadedModel.key)
    return result
  } finally {
    activeModelWork = Math.max(0, activeModelWork - 1)
    if (activeModelWork === 0) {
      setActiveModel(null)
      if (unloadWhenIdle) releaseModelWhenIdle()
      else idleUnloadTimer = setTimeout(releaseModelWhenIdle, MODEL_IDLE_UNLOAD_MS)
    }
  }
}

function handleMemoryWarning() {
  unloadWhenIdle = true
  releaseModelWhenIdle()
}

const BACKGROUND_SUSPEND_DELAY_MS = 1500
let suspendTimer: ReturnType<typeof setTimeout> | null = null
let runtimeSuspended = false
let wantsSuspend = false
let usedSinceResume = false
let lifecycleRun: Promise<void> | null = null

const hasWorkToSuspend = () => usedSinceResume || !!loadedModel || pendingDownloads.size > 0

const lifecycleNeedsWork = () =>
  (wantsSuspend && !runtimeSuspended && hasWorkToSuspend()) || (!wantsSuspend && runtimeSuspended)

function reconcileLifecycle(sdk: QvacSdk): Promise<void> {
  if (lifecycleRun) return lifecycleRun
  const run = (async () => {
    while (lifecycleNeedsWork()) {
      if (wantsSuspend) {
        await unloadCurrentModel(sdk)
        try {
          await sdk.suspend()
        } catch {}
        runtimeSuspended = true
        continue
      }
      try {
        await sdk.resume()
      } catch {
        return
      }
      runtimeSuspended = false
      usedSinceResume = false
    }
  })()
  lifecycleRun = run
  run.finally(() => {
    if (lifecycleRun === run) lifecycleRun = null
    if (!wantsSuspend && runtimeSuspended) return
    if (lifecycleNeedsWork()) reconcileLifecycle(sdk)
  })
  return run
}

function handleAppStateChange(sdk: QvacSdk, state: AppStateStatus) {
  if (state === 'background') {
    setActiveModel(null)
    if (suspendTimer) return
    suspendTimer = setTimeout(() => {
      suspendTimer = null
      wantsSuspend = true
      reconcileLifecycle(sdk)
    }, BACKGROUND_SUSPEND_DELAY_MS)
    return
  }
  if (state !== 'active') return
  if (suspendTimer) {
    clearTimeout(suspendTimer)
    suspendTimer = null
  }
  wantsSuspend = false
  reconcileLifecycle(sdk)
}

function loadSdk(): Promise<QvacSdk> {
  if (!sdkPromise) {
    const pending = (async () => {
      const directory = await ensureModelsDirectory()
      await writeRuntimeConfig(directory)
      const sdk = await import('@qvac/sdk')
      appStateSubscription?.remove()
      memoryWarningSubscription?.remove()
      appStateSubscription = AppState.addEventListener('change', (state) =>
        handleAppStateChange(sdk, state),
      )
      memoryWarningSubscription = AppState.addEventListener('memoryWarning', handleMemoryWarning)
      return sdk
    })()
    sdkPromise = pending
    pending.catch(() => {
      if (sdkPromise === pending) sdkPromise = null
    })
  }
  return sdkPromise.then(async (sdk) => {
    if (AppState.currentState === 'active') wantsSuspend = false
    await reconcileLifecycle(sdk)
    usedSinceResume = true
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
  if ((readModelGuard().crashes[key] ?? 0) >= MODEL_CRASH_LIMIT) {
    throw new LocalAiError(LOCAL_AI_ERROR.MODEL_UNSTABLE)
  }
  if (AppState.currentState === 'active') setActiveModel(key)
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

async function getDownloadedBytes(sdk: QvacSdk, name: string) {
  try {
    const info = await sdk.getModelInfo({ name })
    const bytes = Number(info?.actualSize) || Number(info?.expectedSize)
    if (bytes > 0) return bytes
  } catch {}
  return (LOCAL_AI_REGISTRY_MODELS as RegistryModels)[name]?.bytes ?? 0
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
      return { bytes: await getDownloadedBytes(sdk, name) }
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
  forgetModelCrashes((key) => key.split('|').includes(name))
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
  memoryWarningSubscription?.remove()
  memoryWarningSubscription = null
  clearIdleUnload()
  modelGuard = { active: null, crashes: {} }
  writeModelGuard()
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
  if (suspendTimer) clearTimeout(suspendTimer)
  suspendTimer = null
  runtimeSuspended = false
  wantsSuspend = false
  usedSinceResume = false
  lifecycleRun = null
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

interface TranscribeSegment {
  text?: string
  endMs?: number
}

async function transcribeWithPosition(
  sdk: QvacSdk,
  modelId: string,
  audioPath: string,
  totalMs: number,
  onProgress: LocalAiWorkListener,
): Promise<string> {
  const openStream = sdk.transcribeStream as unknown as (
    params: Record<string, unknown>,
  ) => AsyncIterable<TranscribeSegment>
  let transcript = ''
  let received = false
  try {
    for await (const segment of openStream({ modelId, audioChunk: audioPath, metadata: true })) {
      received = true
      transcript = joinTranscript(transcript, String(segment?.text ?? ''))
      onProgress({ type: WORK_EVENT.TEXT, text: transcript })
      if (Number(segment?.endMs) > 0) {
        onProgress({ type: WORK_EVENT.POSITION, doneMs: Number(segment.endMs), totalMs })
      }
    }
  } catch (error) {
    if (received) throw error
    return (await sdk.transcribe({ modelId, audioChunk: audioPath })).trim()
  }
  return transcript.trim()
}

async function transcribeAudioFileNow(
  fileUri: string,
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
  onProgress: LocalAiWorkListener = () => {},
): Promise<string> {
  if (!ExpoLocalAi) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  const sdk = await loadSdk()
  const pcmFile = new File(Paths.cache, `${PCM_FILE_PREFIX}${Date.now()}${PCM_FILE_EXTENSION}`)
  try {
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.PREPARE_AUDIO })
    await ExpoLocalAi.decodeAudioToPcm(toFilePath(fileUri), toFilePath(pcmFile.uri))
    const [modelName] = getFeatureRegistryNames(feature, featureConfig)
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: modelName })
    const modelId = await loadSpeechModel(sdk, feature, featureConfig)
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.TRANSCRIBE })
    const audioPath = toFilePath(pcmFile.uri)
    const isParakeet =
      (LOCAL_AI_REGISTRY_MODELS as RegistryModels)[modelName]?.engine === PARAKEET_ENGINE
    if (isParakeet) return (await sdk.transcribe({ modelId, audioChunk: audioPath })).trim()
    const totalMs = Math.round(
      ((pcmFile.size ?? 0) / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE)) * 1000,
    )
    return await transcribeWithPosition(sdk, modelId, audioPath, totalMs, onProgress)
  } finally {
    try {
      if (pcmFile.exists) pcmFile.delete()
    } catch {}
  }
}

async function extractTextFromImageNow(
  fileUri: string,
  onProgress: LocalAiWorkListener = () => {},
): Promise<string> {
  const sdk = await loadSdk()
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.PREPARE_PHOTO })
  const prepared = await downscaleImage(fileUri, OCR_IMAGE_MAX_SIDE)
  const [recognizerName, detectorName] = getFeatureRegistryNames(LOCAL_AI_FEATURE.EXTRACT_TEXT, {})
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: recognizerName })
  const modelId = await ensureModelLoaded(sdk, `${recognizerName}|${detectorName}|mobile`, () =>
    loadModelWith(sdk, {
      modelSrc: registryAsset(sdk, recognizerName),
      modelType: 'ocr',
      modelConfig: {
        detectorModelSrc: registryAsset(sdk, detectorName),
        langList: LOCAL_AI_OCR_LANGUAGES,
        magRatio: OCR_MAG_RATIO,
        canvasSize: OCR_CANVAS_SIZE,
        defaultRotationAngles: [],
        recognizerBatchSize: OCR_RECOGNIZER_BATCH_SIZE,
        backendDevice: Platform.OS === 'ios' ? 'metal' : 'cpu',
      },
    }),
  ).catch((error) => {
    deleteLocalUri(prepared)
    throw error
  })
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.READ_TEXT })
  try {
    const { blockStream } = sdk.ocr({
      modelId,
      image: toFilePath(prepared ?? fileUri),
      stream: true,
    })
    const found: OcrBlock[] = []
    let text = ''
    for await (const chunk of blockStream) {
      found.push(...chunk)
      text = formatOcrBlocks(found)
      onProgress({ type: WORK_EVENT.TEXT, text })
    }
    return text
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

interface CompletionRun {
  text: Promise<string>
  tokenStream: AsyncIterable<string>
}

async function runCompletion(
  sdk: QvacSdk,
  input: CompletionInput,
  onText?: (text: string) => void,
): Promise<string> {
  const run = (sdk.completion as unknown as (params: CompletionInput) => CompletionRun)({
    ...input,
    stream: true,
  })
  let streamed = ''
  for await (const token of run.tokenStream) {
    streamed += token
    onText?.(streamed)
  }
  return run.text
}

function loadLlmFeature(
  sdk: QvacSdk,
  feature: string,
  featureConfig: LocalAiFeatureModelConfig = {},
) {
  const [modelName, projectionName] = getFeatureRegistryNames(feature, featureConfig)
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

async function describeImageNow(
  fileUri: string,
  onProgress: LocalAiWorkListener = () => {},
): Promise<string> {
  const sdk = await loadSdk()
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.PREPARE_PHOTO })
  const prepared = await downscaleImage(fileUri, DESCRIBE_IMAGE_MAX_SIDE)
  try {
    const [modelName] = getFeatureRegistryNames(LOCAL_AI_FEATURE.DESCRIBE_IMAGES, {})
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: modelName })
    const modelId = await loadLlmFeature(sdk, LOCAL_AI_FEATURE.DESCRIBE_IMAGES)
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOOK })
    const output = await runCompletion(
      sdk,
      {
        modelId,
        history: [
          {
            role: 'user',
            content: DESCRIBE_IMAGE_PROMPT,
            attachments: [{ path: toFilePath(prepared ?? fileUri) }],
          },
        ],
        generationParams: { temp: LLM_TEMPERATURE, predict: DESCRIBE_MAX_TOKENS },
      },
      (text) => onProgress({ type: WORK_EVENT.TEXT, text }),
    )
    return cleanModelOutput(output)
  } finally {
    deleteLocalUri(prepared)
  }
}

async function runNoteTaskNow(
  task: string,
  text: string,
  featureConfig: LocalAiFeatureModelConfig = {},
  onProgress: LocalAiWorkListener = () => {},
): Promise<string> {
  const sdk = await loadSdk()
  const [modelName] = getFeatureRegistryNames(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS, featureConfig)
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(sdk, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS, featureConfig)
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.READ_NOTE })
  const output = await runCompletion(
    sdk,
    {
      modelId,
      history: buildNoteTaskMessages(task, text),
      generationParams: getNoteTaskGenerationParams(task, text) as Record<string, number>,
    },
    (partial) => onProgress({ type: WORK_EVENT.TEXT, text: partial }),
  )
  return cleanModelOutput(output)
}

export interface AskTurn {
  question: string
  reply: string
}

async function askAboutNoteNow(
  note: string,
  turns: AskTurn[],
  question: string,
  featureConfig: LocalAiFeatureModelConfig = {},
  onProgress: LocalAiWorkListener = () => {},
): Promise<string> {
  const sdk = await loadSdk()
  const [modelName] = getFeatureRegistryNames(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS, featureConfig)
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(sdk, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS, featureConfig)
  onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.READ_NOTE })
  const ask = (forceEdits: boolean) =>
    runCompletion(
      sdk,
      {
        modelId,
        history: buildAskMessages({ note, turns, question, forceEdits }).messages,
        responseFormat: ASK_RESPONSE_FORMAT,
        generationParams: getAskGenerationParams(note),
      },
      (partial) => {
        const answer = extractPartialAnswer(partial)
        if (answer) onProgress({ type: WORK_EVENT.TEXT, text: answer })
      },
    )
  const first = await ask(false)
  if (!shouldRetryAskForEdits(note, question, first)) return first
  const picked = pickAskReply(note, first, await ask(true), question) as string
  if (!shouldTryAskFullText(note, question, picked)) return picked
  const fullText = await runCompletion(sdk, {
    modelId,
    history: buildAskFullTextMessages({ note, question }),
    generationParams: getAskFullTextParams(note),
  })
  return (toAskFullTextReply(note, question, fullText) as string | null) ?? picked
}

export const askAboutNote = (
  note: string,
  turns: AskTurn[],
  question: string,
  featureConfig: LocalAiFeatureModelConfig = {},
  { onProgress }: LocalAiWorkOptions = {},
) => withModelWork(() => askAboutNoteNow(note, turns, question, featureConfig, onProgress))

export const transcribeAudioFile = (
  fileUri: string,
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
  { onProgress }: LocalAiWorkOptions = {},
) => withModelWork(() => transcribeAudioFileNow(fileUri, feature, featureConfig, onProgress))

export const extractTextFromImage = (fileUri: string, { onProgress }: LocalAiWorkOptions = {}) =>
  withModelWork(() => extractTextFromImageNow(fileUri, onProgress))

export const describeImage = (fileUri: string, { onProgress }: LocalAiWorkOptions = {}) =>
  withModelWork(() => describeImageNow(fileUri, onProgress))

export const runNoteTask = (
  task: string,
  text: string,
  featureConfig: LocalAiFeatureModelConfig = {},
  { onProgress }: LocalAiWorkOptions = {},
) => withModelWork(() => runNoteTaskNow(task, text, featureConfig, onProgress))

export const translateParagraphs = (
  paragraphs: string[],
  from: string,
  to: string,
  { onProgress }: LocalAiWorkOptions = {},
) => withModelWork(() => translateParagraphsNow(paragraphs, from, to, onProgress))

export function startLiveTranscription(
  feature: string,
  featureConfig: LocalAiFeatureModelConfig,
  handlers: LiveTranscriptionHandlers,
): Promise<LiveTranscription> {
  return new Promise((resolve, reject) => {
    withModelWork(async () => {
      let finish = () => {}
      const finished = new Promise<void>((done) => {
        finish = done
      })
      let live: LiveTranscription
      try {
        live = await startLiveTranscriptionNow(feature, featureConfig, handlers)
      } catch (error) {
        reject(error)
        throw error
      }
      resolve({
        stop: () => live.stop().finally(finish),
        cancel: () => {
          live.cancel()
          finish()
        },
        saveAudio: live.saveAudio,
      })
      await finished
    }).catch(() => {})
  })
}

export const summarizeTranscript = (
  transcript: string,
  featureConfig: LocalAiFeatureModelConfig = {},
) => runNoteTask(NOTE_TASK.TRANSCRIPT_SUMMARY, transcript, featureConfig)

async function translateParagraphsNow(
  paragraphs: string[],
  from: string,
  to: string,
  onProgress: LocalAiWorkListener = () => {},
): Promise<string[]> {
  const steps = getTranslationSteps(from, to) as [string, string][]
  if (steps.length === 0) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
  const sdk = await loadSdk()
  let lines = paragraphs
  for (const [hopIndex, [stepFrom, stepTo]] of steps.entries()) {
    const modelName = getTranslationModelName(stepFrom, stepTo)
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.LOAD_MODEL, model: modelName })
    const modelId = await ensureModelLoaded(sdk, `${modelName}|translate`, () =>
      loadModelWith(sdk, {
        modelSrc: registryAsset(sdk, modelName),
        modelConfig: { engine: 'Bergamot', from: stepFrom, to: stepTo },
      }),
    )
    onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.TRANSLATE })
    const translate = sdk.translate as unknown as (params: Record<string, unknown>) => {
      translations: Promise<string[]>
    }
    const translated: string[] = []
    const reportParagraphs = () =>
      onProgress({
        type: WORK_EVENT.PARAGRAPHS,
        done: translated.length,
        total: lines.length,
        hop: hopIndex + 1,
        hops: steps.length,
        from: stepFrom,
        to: stepTo,
      })
    reportParagraphs()
    for (let start = 0; start < lines.length; start += TRANSLATE_BATCH_PARAGRAPHS) {
      const run = translate({
        modelId,
        text: lines.slice(start, start + TRANSLATE_BATCH_PARAGRAPHS),
        modelType: 'nmtcpp-translation',
        stream: false,
      })
      translated.push(...(await run.translations).map((line) => String(line ?? '')))
      reportParagraphs()
      onProgress({ type: WORK_EVENT.TEXT, text: joinParts(translated) })
    }
    lines = translated
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

async function startLiveTranscriptionNow(
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
  onProgress?: LocalAiWorkListener
}

export async function extractTextFromPdf(
  fileUri: string,
  { signal, onProgress }: PdfExtractOptions = {},
): Promise<string> {
  const { renderPdfPageForOcr } = await import('@/lib/pdfTools')
  const FileSystem = await import('expo-file-system/legacy')
  const texts: string[] = []
  let words = 0
  let pageCount = 1
  for (let pageIndex = 0; pageIndex < Math.min(pageCount, OCR_MAX_PDF_PAGES); pageIndex += 1) {
    if (signal?.aborted) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
    const rendered = await renderPdfPageForOcr(fileUri, pageIndex)
    if (!rendered) throw new LocalAiError(LOCAL_AI_ERROR.TASK_FAILED)
    pageCount = rendered.pageCount
    const total = Math.min(pageCount, OCR_MAX_PDF_PAGES)
    const reportPage = (done: number) =>
      onProgress?.({ type: WORK_EVENT.PAGE, page: pageIndex + 1, total, done, words })
    const forwardPageEvent: LocalAiWorkListener = (event) => {
      if (event.step === WORK_STEP.LOAD_MODEL) onProgress?.(event)
      if (event.step === WORK_STEP.READ_TEXT) reportPage(pageIndex)
      if (event.type === WORK_EVENT.TEXT) {
        onProgress?.({ type: WORK_EVENT.TEXT, text: joinParts([...texts, event.text ?? '']) })
      }
    }
    try {
      const pageText = (
        await extractTextFromImage(rendered.uri, { onProgress: forwardPageEvent })
      ).trim()
      if (pageText) texts.push(pageText)
      words += countWords(pageText)
      reportPage(pageIndex + 1)
    } finally {
      await FileSystem.deleteAsync(rendered.uri, { idempotent: true }).catch(() => {})
    }
  }
  return joinParts(texts)
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
