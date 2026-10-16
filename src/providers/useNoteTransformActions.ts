import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { isReadAloudEnabled } from '@pear-notes/core/constant.js'
import { detectTextLanguage } from '@pear-notes/core/store/services/localAiLanguage.js'
import {
  htmlToNoteText,
  NOTE_TASK,
  TEMPLATE_TASKS,
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { splitNoteByHeadings } from '@pear-notes/core/store/services/noteSplit.js'
import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import { hapticMedium } from '@/lib/haptics'

import ExpoReminders from '../../modules/expo-reminders'

const { splitNote, getLastMerge } = notesSlice as unknown as {
  splitNote: (payload: { key: string }) => { type: string }
  getLastMerge: (state: unknown) => unknown
}

type LastSplit = {
  kind?: string
  error?: string
  originals?: string[]
  createdKeys?: string[]
} | null

export const RESTRUCTURE_TASKS = TEMPLATE_TASKS as string[]
export const CREATE_FROM_NOTE_TASKS = [NOTE_TASK.FLASHCARDS, NOTE_TASK.ACTION_LIST] as string[]

interface NoteTransformOptions {
  noteId: string | null | undefined
  noteData: { note?: string; title?: string; locked?: boolean } | null | undefined
  summarizeReady: boolean
  onOpenNote: (id: string) => void
}

export function useNoteTransformActions({
  noteId,
  noteData,
  summarizeReady,
  onOpenNote,
}: NoteTransformOptions) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const lastMerge = useSelector(getLastMerge) as LastSplit
  const [generateVisible, setGenerateVisible] = useState(false)
  const [generateTask, setGenerateTask] = useState<string | null>(null)
  const isLocked = !!noteData?.locked
  const noteBody = noteData?.note
  const noteTitle = noteData?.title

  const splitParts = useMemo(
    () =>
      isLocked || !noteId
        ? []
        : (splitNoteByHeadings(noteBody ?? '', noteTitle ?? '') as { title?: string }[]),
    [isLocked, noteBody, noteId, noteTitle],
  )
  const canSplit = splitParts.length >= 2
  const canGenerate = summarizeReady && !isLocked && !!noteId
  const generateKeys = useMemo(() => (noteId ? [noteId] : []), [noteId])

  const handleSplitNote = useCallback(() => {
    if (!noteId || !canSplit) return
    hapticMedium()
    const titles = splitParts.map((part) => part.title || t('noteCard.untitled')).join(', ')
    Alert.alert(
      t('noteEditor.contextMenu.splitNote'),
      t('noteEditor.split.confirm', { count: splitParts.length, titles }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('noteEditor.contextMenu.splitNote'),
          onPress: () => dispatch(splitNote({ key: noteId })),
        },
      ],
    )
  }, [canSplit, dispatch, noteId, splitParts, t])

  useEffect(() => {
    if (!noteId || lastMerge?.kind !== 'split' || lastMerge.error) return
    const next = lastMerge.createdKeys?.[0]
    if (next && lastMerge.originals?.includes(noteId)) onOpenNote(next)
  }, [lastMerge, noteId, onOpenNote])

  const canReadAloud = isReadAloudEnabled() && !!ExpoReminders && !isLocked && !!noteId
  const handleReadAloud = useCallback(() => {
    if (!ExpoReminders) return
    if (ExpoReminders.isSpeaking()) {
      ExpoReminders.stopSpeaking()
      return
    }
    const text = [noteTitle, htmlToNoteText(String(noteBody ?? ''))].filter(Boolean).join('. ')
    if (!text.trim()) return
    hapticMedium()
    ExpoReminders.speak(text, (detectTextLanguage(text) as string | null) ?? null)
      .then((spoken) => {
        if (spoken === false) Alert.alert(t('noteEditor.readAloudNoVoice'))
      })
      .catch(() => {})
  }, [noteBody, noteTitle, t])

  useEffect(() => () => ExpoReminders?.stopSpeaking(), [noteId])

  const handleGenerate = useCallback((task: string) => {
    hapticMedium()
    setGenerateTask(task)
    setGenerateVisible(true)
  }, [])

  const handleCloseGenerate = useCallback(() => setGenerateVisible(false), [])

  return {
    canSplit,
    canGenerate,
    generateVisible,
    generateTask,
    generateKeys,
    handleSplitNote,
    canReadAloud,
    handleReadAloud,
    handleGenerate,
    handleCloseGenerate,
  }
}
