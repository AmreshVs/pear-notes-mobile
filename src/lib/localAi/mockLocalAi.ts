import { ASK_KIND } from '@pear-notes/core/store/services/localAiAsk.js'
import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_NETWORK,
  LOCAL_AI_REGISTRY_MODELS,
} from '@pear-notes/core/store/services/localAiCatalog.js'

import type {
  AskTurn,
  LiveTranscription,
  LiveTranscriptionHandlers,
  LocalAiFeatureModelConfig,
  LocalAiWorkEvent,
  LocalAiWorkOptions,
} from './qvacAdapter'

type RegistryModels = Record<string, { bytes: number } | undefined>

const GIGABYTE = 1024 * 1024 * 1024
const MOCK_TOTAL_MEMORY_BYTES = 8 * GIGABYTE
const MOCK_FREE_DISK_BYTES = 64 * GIGABYTE
const MOCK_TOTAL_DISK_BYTES = 256 * GIGABYTE

const DOWNLOAD_STEPS = 6
const DOWNLOAD_STEP_MS = 120
const WORK_STEP_MS = 320
const DICTATION_CHUNK_MS = 700

export const MOCK_SAMPLES = {
  dictation: [
    'Pear Notes keeps every note on your own devices.',
    ' Nothing is uploaded, and nothing is trained on your writing.',
    ' Everything you dictate stays on this device.',
  ],
  transcript:
    'Reminder to myself: the release notes still need a pass before Friday, and Priya wants the onboarding copy shortened.',
  askAnswer:
    'This note lists four books, with Intermezzo marked as started at chapter three. Nothing here is overdue.',
  noteTask: {
    summarizeNote:
      'A reading list of four books, one of them already started, plus a reminder to borrow Piranesi from Priya.',
    suggestTitle: 'Reading List',
    keyPoints:
      '- Four books queued, one in progress\n- Intermezzo started at chapter three\n- Ask Priya about borrowing Piranesi',
    fixGrammar: 'The reading list is up to date, and every title is spelled correctly.',
    rewrite: 'Here is the reading list, rewritten so each entry reads a little more clearly.',
    makeShorter: 'Four books queued; Intermezzo already started.',
    makeProfessional:
      'The current reading list comprises four titles, one of which is already in progress.',
    makeFriendly: 'Here is what is on the reading pile right now — four books, one already going!',
  } as Record<string, string>,
  translation: [
    'டைம் அமைச்சகம் — கலியேன் பிராட்லி',
    'இன்டர்மெஸ்ஸோ — சாலி ரூனி (தொடங்கியது ch. 3)',
    'டெமோன் காப்பர்ஹெட் — பார்பரா கிங்சோல்வர்',
    'நாளை, நாளை மற்றும் நாளை — கேப்ரியல் செவின்',
  ],
  extractedText: 'INVOICE\nPear Notes Ltd.\nTotal due: 128.00\nDate: 12 Sep 2026',
  imageDescription: 'A hand holding a phone showing a chat app, photographed over a wooden desk.',
} as const

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const registryBytes = (name: string) =>
  (LOCAL_AI_REGISTRY_MODELS as RegistryModels)[name]?.bytes ?? 64 * 1024 * 1024

let downloadCounter = 0

interface DownloadOptions {
  onProgress?: (progress: { downloadedBytes: number; totalBytes: number }) => void
}

function download(name: string, { onProgress }: DownloadOptions = {}) {
  downloadCounter += 1
  const requestId = `mock-local-ai-download-${downloadCounter}`
  const totalBytes = registryBytes(name)

  const done = (async () => {
    for (let step = 1; step <= DOWNLOAD_STEPS; step += 1) {
      await wait(DOWNLOAD_STEP_MS)
      onProgress?.({
        downloadedBytes: Math.round((totalBytes * step) / DOWNLOAD_STEPS),
        totalBytes,
      })
    }
    return { bytes: totalBytes }
  })()

  return { requestId, done }
}

export const mockAdapter = {
  getDeviceSupport: async () => ({
    status: LOCAL_AI_DEVICE_STATUS.SUPPORTED,
    reason: null,
    totalMemoryBytes: MOCK_TOTAL_MEMORY_BYTES,
    freeDiskBytes: MOCK_FREE_DISK_BYTES,
  }),
  getNetworkKind: async () => LOCAL_AI_NETWORK.WIFI,
  getDiskSpace: async () => ({
    freeBytes: MOCK_FREE_DISK_BYTES,
    totalBytes: MOCK_TOTAL_DISK_BYTES,
  }),
  download,
  cancel: async () => {},
  deleteModel: async () => {},
  clearAskCache: async () => {},
  closeAndWipe: async () => {},
}

const emitWork = async (onProgress?: (event: LocalAiWorkEvent) => void, text?: string) => {
  await wait(WORK_STEP_MS)
  if (text) onProgress?.({ type: 'text', text } as LocalAiWorkEvent)
}

const CHANGE_REQUEST = /change\s+(.+?)\s+to\s+(.+?)\s*$/i

function findInNote(note: string, phrase: string): string | null {
  const direct = note.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  return direct ? direct[0] : null
}

function matchCase(source: string, replacement: string): string {
  const words = replacement.split(' ')
  const sourceWords = source.split(' ')
  return words
    .map((word, index) => {
      const reference = sourceWords[index] ?? sourceWords[0] ?? ''
      if (!reference || !/^[A-Z]/.test(reference)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function buildAskReply(note: string, question: string): string {
  const requested = question.match(CHANGE_REQUEST)
  if (requested) {
    const find = findInNote(note, requested[1].trim())
    if (find) {
      return JSON.stringify({
        kind: ASK_KIND.EDITS,
        answer: '',
        edits: [{ find, replace: matchCase(find, requested[2].trim()) }],
      })
    }
  }
  return JSON.stringify({ kind: ASK_KIND.ANSWER, answer: MOCK_SAMPLES.askAnswer, edits: [] })
}

export const clearAskCache = async () => {}

export const askAboutNote = async (
  note: string,
  _turns: AskTurn[],
  question: string,
  _featureConfig: LocalAiFeatureModelConfig = {},
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  return buildAskReply(note, question)
}

export const askVault = async (
  _question: string,
  sources: { n: number; text: string }[],
  _turns: unknown[],
  _featureConfig: LocalAiFeatureModelConfig = {},
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  const first = sources[0]
  return first ? `${first.text.split('\n')[0]} [${first.n}]` : 'NOT_FOUND'
}

export const runNoteTask = async (
  task: string,
  text: string,
  _featureConfig: LocalAiFeatureModelConfig = {},
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  return MOCK_SAMPLES.noteTask[task] ?? text
}

export const summarizeTranscript = async (
  _transcript: string,
  _featureConfig: LocalAiFeatureModelConfig = {},
): Promise<string> => {
  await wait(WORK_STEP_MS)
  return MOCK_SAMPLES.noteTask.summarizeNote
}

export const translateParagraphs = async (
  paragraphs: string[],
  _from: string,
  _to: string,
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string[]> => {
  await emitWork(onProgress)
  return paragraphs.map((paragraph, index) => MOCK_SAMPLES.translation[index] ?? paragraph)
}

export const transcribeAudioFile = async (
  _fileUri: string,
  _feature: string,
  _featureConfig: LocalAiFeatureModelConfig,
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  return MOCK_SAMPLES.transcript
}

export const extractTextFromImage = async (
  _fileUri: string,
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  return MOCK_SAMPLES.extractedText
}

export const describeImage = async (
  _fileUri: string,
  { onProgress }: LocalAiWorkOptions = {},
): Promise<string> => {
  await emitWork(onProgress)
  return MOCK_SAMPLES.imageDescription
}

export const extractTextFromPdf = async (): Promise<string> => {
  await wait(WORK_STEP_MS)
  return MOCK_SAMPLES.extractedText
}

export function startLiveTranscription(
  _feature: string,
  _featureConfig: LocalAiFeatureModelConfig,
  handlers: LiveTranscriptionHandlers,
): Promise<LiveTranscription> {
  let stopped = false
  let transcript = ''
  let index = 0

  const timer = setInterval(() => {
    if (stopped) return
    handlers.onLevel?.(0.35 + Math.random() * 0.5)
    const chunk = MOCK_SAMPLES.dictation[index]
    if (chunk === undefined) return
    index += 1
    transcript += chunk
    handlers.onText(transcript)
  }, DICTATION_CHUNK_MS)

  const finish = () => {
    stopped = true
    clearInterval(timer)
  }

  return Promise.resolve({
    stop: async () => {
      finish()
      return transcript || MOCK_SAMPLES.dictation.join('')
    },
    cancel: finish,
    saveAudio: () => null,
  })
}

export async function cancelLocalAiTask() {}

export function resetLocalAiModelHealth() {}
