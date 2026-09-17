import { useCallback, useEffect, useRef } from 'react'

import {
  useVoiceTypingSheet,
  type VoiceTypingError,
  type VoiceTypingPhase,
} from '@/components/useVoiceTypingSheet'

export interface VoiceTypingBarOptions {
  visible: boolean
  onLiveText: (text: string) => void
  onCommit: (text: string) => void
  onCancel: () => void
  onAttachAudio?: (uri: string, durationMs: number) => void
}

export interface VoiceTypingBarProps extends VoiceTypingBarOptions {
  toolbarBottom?: number
}

const ERROR_KEYS: Record<VoiceTypingError, string> = {
  micDenied: 'localAi.errors.micDenied.title',
  failed: 'localAi.errors.failed.title',
  empty: 'localAi.errors.empty.title',
  noSpace: 'localAi.errors.noSpace.title',
  downloadFailed: 'localAi.errors.failed.title',
  tooLong: 'localAi.errors.failed.title',
  dictationFailed: 'localAi.errors.dictationFailed.title',
  notEnoughMemory: 'localAi.errors.notEnoughMemory.title',
  unstable: 'localAi.errors.unstable.title',
}

const STATUS_KEYS: Partial<Record<VoiceTypingPhase, string>> = {
  idle: 'localAi.voiceTyping.preparing.title',
  preparing: 'localAi.voiceTyping.preparing.title',
  downloading: 'localAi.voiceTyping.preparing.title',
  waiting: 'localAi.voiceTyping.preparing.title',
  recording: 'localAi.voiceTyping.recording.title',
  transcribing: 'localAi.voiceTyping.transcribing.title',
  preview: 'localAi.voiceTyping.transcribing.title',
}

export function useVoiceTypingBar({
  visible,
  onLiveText,
  onCommit,
  onCancel,
  onAttachAudio,
}: VoiceTypingBarOptions) {
  const committedRef = useRef(false)
  const unmountingRef = useRef(false)
  const closeRef = useRef<(() => void) | null>(null)
  const noop = useCallback(() => {}, [])

  const handleSheetClose = useCallback(() => {
    if (unmountingRef.current) return
    onCancel()
  }, [onCancel])

  const voice = useVoiceTypingSheet({
    visible,
    mode: 'dictate',
    sourceUri: null,
    onInsert: noop,
    onAttachAudio,
    onClose: handleSheetClose,
  })

  const { phase, error, liveText, text, hasSavedAudio, handleClose, handleAgain } = voice

  closeRef.current = handleClose

  useEffect(
    () => () => {
      unmountingRef.current = true
      closeRef.current?.()
    },
    [],
  )

  useEffect(() => {
    if (visible) committedRef.current = false
  }, [visible])

  useEffect(() => {
    if (!visible || phase !== 'recording') return
    onLiveText(liveText)
  }, [liveText, onLiveText, phase, visible])

  useEffect(() => {
    if (!visible || phase !== 'preview' || committedRef.current) return
    committedRef.current = true
    onCommit(text)
  }, [onCommit, phase, text, visible])

  const handleRetry = useCallback(() => {
    if (hasSavedAudio) {
      voice.handleRetrySavedAudio()
      return
    }
    handleAgain()
  }, [handleAgain, hasSavedAudio, voice])

  const statusKey = error ? ERROR_KEYS[error] : (STATUS_KEYS[phase] ?? '')

  return {
    ...voice,
    statusKey,
    isRecording: phase === 'recording',
    isPreparing:
      phase === 'idle' || phase === 'preparing' || phase === 'downloading' || phase === 'waiting',
    isFinishing: phase === 'transcribing' || phase === 'preview',
    isError: phase === 'error',
    canOpenSettings: error === 'micDenied',
    handleRetry,
  }
}
