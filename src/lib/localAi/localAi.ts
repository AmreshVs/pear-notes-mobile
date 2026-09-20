import { MOCK_LOCAL_AI } from '@/constants/constants'

import * as mock from './mockLocalAi'
import * as real from './qvacAdapter'

export type {
  AskTurn,
  LiveTranscription,
  LiveTranscriptionHandlers,
  LocalAiFeatureModelConfig,
  LocalAiWorkEvent,
  LocalAiWorkListener,
  LocalAiWorkOptions,
} from './qvacAdapter'
export { LocalAiError, toLocalAiNetwork } from './qvacAdapter'

export const localAiAdapter = MOCK_LOCAL_AI ? mock.mockAdapter : real.qvacAdapter

export const askAboutNote = MOCK_LOCAL_AI ? mock.askAboutNote : real.askAboutNote
export const runNoteTask = MOCK_LOCAL_AI ? mock.runNoteTask : real.runNoteTask
export const summarizeTranscript = MOCK_LOCAL_AI
  ? mock.summarizeTranscript
  : real.summarizeTranscript
export const translateParagraphs = MOCK_LOCAL_AI
  ? mock.translateParagraphs
  : real.translateParagraphs
export const transcribeAudioFile = MOCK_LOCAL_AI
  ? mock.transcribeAudioFile
  : real.transcribeAudioFile
export const extractTextFromImage = MOCK_LOCAL_AI
  ? mock.extractTextFromImage
  : real.extractTextFromImage
export const describeImage = MOCK_LOCAL_AI ? mock.describeImage : real.describeImage
export const extractTextFromPdf = MOCK_LOCAL_AI ? mock.extractTextFromPdf : real.extractTextFromPdf
export const startLiveTranscription = MOCK_LOCAL_AI
  ? mock.startLiveTranscription
  : real.startLiveTranscription
export const cancelLocalAiTask = MOCK_LOCAL_AI ? mock.cancelLocalAiTask : real.cancelLocalAiTask
export const resetLocalAiModelHealth = MOCK_LOCAL_AI
  ? mock.resetLocalAiModelHealth
  : real.resetLocalAiModelHealth
