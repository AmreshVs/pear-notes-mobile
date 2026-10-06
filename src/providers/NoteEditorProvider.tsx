import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import Animated, { cancelAnimation } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import * as FileSystem from 'expo-file-system'
import { SymbolView } from 'expo-symbols'

import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  htmlToNoteText,
  htmlToParagraphs,
  isRewriteTask,
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { selectIsLocalAiFeatureReady } from '@pear-notes/core/store/slices/localAiSlice.js'
import { deleteNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getActivityLogEnabled,
  getLockMethod,
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { NoteHistoryModal } from '@/components/activity/NoteHistoryModal'
import { AiToolsSheet } from '@/components/AiToolsSheet'
import { AskNoteSheet } from '@/components/AskNoteSheet'
import { AudioRecorderModal, type RecordingDoneOptions } from '@/components/AudioRecorderModal'
import { EdgeFade } from '@/components/EdgeFade'
import { GlassView } from '@/components/GlassView'
import { EditorToolbar } from '@/components/ios/EditorToolbar'
import { LockedContentShield } from '@/components/LockedContentShield'
import { LockedNoteView } from '@/components/LockedNoteView'
import { NoteBodyPlaceholder } from '@/components/NoteBodyPlaceholder'
import { NoteConflictBanner } from '@/components/NoteConflictBanner'
import { SharedItemsTray } from '@/components/share/SharedItemsTray'
import { createThemedStylesheet, useTheme } from '@/components/Themed'
import type { EditorSelection } from '@/components/TiptapEditor'
import { TiptapEditor } from '@/components/TiptapEditor'
import { UploadQueueBanner } from '@/components/upload/UploadQueueBanner'
import { useNoteConflict } from '@/components/useNoteConflict'
import type {
  AiScope,
  InsertMeta,
  TranscriptSummary,
  VoiceTypingMode,
} from '@/components/useVoiceTypingSheet'
import { VideoPlayerModal } from '@/components/VideoPlayerModal'
import { VoiceTypingBar } from '@/components/VoiceTypingBar'
import { VoiceTypingSheet } from '@/components/VoiceTypingSheet'
import {
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_20,
  UI_SIZE_32,
  UI_SIZE_48,
  UI_SIZE_56,
  UI_SIZE_64,
  UI_SIZE_80,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_SF } from '@/constants/folderIcons'
import { useAiFeatureGate, useAiToolsVisible } from '@/hooks/useAiFeatureGate'
import { useDeferredEditorMount } from '@/hooks/useDeferredEditorMount'
import { useLockedNoteScreenProtection } from '@/hooks/useLockedNoteScreenProtection'
import { useShareIntakeController } from '@/hooks/useShareIntakeController'
import { useVideoAttachmentPlayer } from '@/hooks/useVideoAttachmentPlayer'
import { hapticError, hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { type AiTool, buildAiTools, hideKeyboard } from '@/lib/localAi/aiTools'
import type { AskApplyRequest } from '@/lib/localAi/askNote'
import {
  cleanupCachedAttachment,
  downloadToCache,
  saveImageToPhotos,
  shareMessage,
} from '@/lib/noteAttachmentManager'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { buildNoteSharePayload } from '@/lib/noteShare'
import { isPdfAttachment } from '@/lib/pdfTools'
import { showCameraPermissionAlert } from '@/lib/permissionAlerts'
import { setToastBottomOffset } from '@/lib/toastOffset'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import { NoteEditorContext } from '@/providers/NoteEditorContext'
import { isAudioFile } from '@/utils/media'

import ExpoNativeShareModule from '../../modules/expo-native-share'

import { useNoteEditor } from './useNoteEditor'
import { useNoteEditorActions } from './useNoteEditorActions'

const ExpoUI: any = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null
const EDITOR_HEADER_HEIGHT = 52

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const styles = useStyles()
  const { t } = useTranslation()

  const editor = useNoteEditor()
  const {
    editorRef,
    noteId,
    showBodyPlaceholder,
    handleNoteLoaded,
    handleEditorReset,
    isOpen,
    isEditing,
    keyboardHeight,
    isSharing,
    setIsSharing,
    selectedImageSrc,
    setSelectedImageSrc,
    selectedAttachmentSrc,
    setSelectedAttachmentSrc,
    selectedAttachmentFileName,
    setSelectedAttachmentFileName,
    isRecorderVisible,
    historyVisible,
    setHistoryVisible,
    setIsRecorderVisible,
    imageActionRect,
    setImageActionRect,
    isImageActionSheetOpen,
    setIsImageActionSheetOpen,
    attachmentActionRect,
    setAttachmentActionRect,
    isAttachmentActionSheetOpen,
    setIsAttachmentActionSheetOpen,
    slideX,
    paneStyle,
    animatePane,
    handlePaneLayout,
    getPaneWidth,
    titleRef,
    noteContentRef,
    moveFolders,
    resetEditorState,
    closeNote,
    closeNoteWithVelocity,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
    isEdgeSwipeActive,
    setIsEdgeSwipeActive,
    noteData,
  } = editor

  const hasTextSelection = isActive('hasSelection')

  const isPreviewingRef = useRef(false)

  const shouldMountEditor = useDeferredEditorMount(isOpen)

  const lockMethod = useSelector(getLockMethod)
  const activityEnabled = useSelector(getActivityLogEnabled) as boolean
  const isNoteUnlockedForNote = useIsNoteUnlocked(noteId)
  const isNoteLocked = !!noteData?.locked && !!noteId && !isNoteUnlockedForNote
  const protectLockedNote = isOpen && !!noteData?.locked
  useLockedNoteScreenProtection(protectLockedNote)

  const aiToolsVisible = useAiToolsVisible(!!noteData?.locked)
  const gateAiFeature = useAiFeatureGate()
  const transcribeReady = useSelector(
    (state) =>
      aiToolsVisible &&
      (selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS) as boolean),
  )
  const summarizeReady = useSelector(
    (state) =>
      aiToolsVisible &&
      (selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS) as boolean),
  )
  const { isVisible: hasNoteConflict } = useNoteConflict(noteId)
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false)
  const [dictationActive, setDictationActive] = useState(false)
  const [voiceMode, setVoiceMode] = useState<VoiceTypingMode>('dictate')
  const [voiceSourceUri, setVoiceSourceUri] = useState<string | null>(null)
  const [voiceParagraphs, setVoiceParagraphs] = useState<string[] | null>(null)
  const [voiceScope, setVoiceScope] = useState<AiScope>('note')
  const [aiToolsTarget, setAiToolsTarget] = useState<{ selection: EditorSelection | null } | null>(
    null,
  )
  const selectionRef = useRef<EditorSelection | null>(null)
  const [askTarget, setAskTarget] = useState<{ selectionText: string; noteText: string } | null>(
    null,
  )
  const voiceSheetVisibleRef = useRef(false)
  const transcriptTargetRef = useRef<string | null>(null)
  const captionTargetRef = useRef<string | null>(null)

  const editorLabels = useMemo(
    () => ({
      photo: t('noteEditor.upload.photo'),
      file: t('noteEditor.upload.file'),
      audio: t('noteEditor.upload.audio'),
      scannedDoc: t('noteEditor.upload.scannedDoc'),
      uploadFailedVideo: t('noteEditor.upload.failedVideo'),
      uploadFailedScan: t('noteEditor.upload.failedScan'),
      unlockReason: t('noteCard.unlockReason'),
      lockReason: t('noteCard.lockReason'),
      pageCountLabel: (count: number) => t('noteEditor.upload.pageCount', { count }),
    }),
    [t],
  )

  const handleUploadError = useCallback(
    (message: string) => Alert.alert(t('noteEditor.upload.failedTitle'), message),
    [t],
  )

  const handleCameraPermissionDenied = useCallback(() => showCameraPermissionAlert(t), [t])

  const deleteUploadCache = useCallback(async (cacheUri: string) => {
    await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {})
  }, [])

  const handleBeforeToggleLock = useCallback(() => hapticMedium(), [])

  const {
    handleUpdate,
    handleTitleChange,
    handlePickImage,
    handleTakePhoto,
    handleTakeVideo,
    handlePickFile,
    handleScanDocument,
    handleAddSharedItems,
    handleRequestPdfThumbnail,
    handleRecordingDone,
    handleMoveNote,
    handleTogglePin,
    handleDeleteAttachment,
    handleDone,
    handleToggleLock,
  } = useNoteEditorActions({
    editor,
    lockMethod,
    screenWidth: Dimensions.get('window').width,
    recordingFileNamePrefix: 'recording',
    labels: editorLabels,
    onUploadError: handleUploadError,
    onCameraPermissionDenied: handleCameraPermissionDenied,
    deleteUploadCache,
    onBeforeToggleLock: handleBeforeToggleLock,
  })

  const handleRecordAudio = useCallback(() => {
    hapticMedium()
    Keyboard.dismiss()
    editorRef.current?.blur()
    setTimeout(() => setIsRecorderVisible(true), 100)
  }, [setIsRecorderVisible])

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    hapticMedium()
    Alert.alert(t('noteCard.actions.delete'), t('noteCard.deleteConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('noteCard.actions.delete'),
        style: 'destructive',
        onPress: () => {
          dispatch(deleteNote(noteId as any))
          animatePane(getPaneWidth(), resetEditorState)
        },
      },
    ])
  }, [noteId, dispatch, animatePane, getPaneWidth, resetEditorState, t])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    hapticMedium()
    setIsSharing(true)
    const title = titleRef.current || t('noteCard.untitled')
    try {
      const { message, urls } = await buildNoteSharePayload({
        title,
        html: noteContentRef.current || '',
        resolveHyperdriveUrl,
      })
      try {
        await shareMessage(message, urls)
      } catch {
        await Share.share({ title, message })
      }
    } finally {
      setIsSharing(false)
    }
  }, [resolveHyperdriveUrl, isSharing, setIsSharing, t])

  const showMoveToSheet = useCallback(() => {
    if (moveFolders.length === 0) return
    const folderNames = moveFolders.map((f: any) => f.name || f.id)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('noteCard.actions.moveTo'),
        options: [t('common.cancel'), ...folderNames],
        cancelButtonIndex: 0,
      },
      (index: number) => {
        if (index === 0) return
        const folder = moveFolders[index - 1]
        if (folder) handleMoveNote(folder.id)
      },
    )
  }, [moveFolders, handleMoveNote, t])

  const handleOpenNoteHistory = useCallback(() => {
    if (!noteId) return
    setHistoryVisible(true)
  }, [noteId])

  const handleCloseNoteHistory = useCallback(() => setHistoryVisible(false), [])

  const handleMoreOptions = useCallback(() => {
    if (!noteId) return
    hapticMedium()
    if (Platform.OS === 'ios') {
      const lockLabel = noteData?.locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock')
      const pinLabel = noteData?.pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin')
      const entries = [
        { label: pinLabel, run: handleTogglePin },
        { label: t('noteCard.actions.moveTo'), run: showMoveToSheet },
        { label: lockLabel, run: handleToggleLock },
        ...(activityEnabled
          ? [{ label: t('noteEditor.menu.noteHistory'), run: handleOpenNoteHistory }]
          : []),
        { label: t('noteCard.actions.delete'), run: handleDeleteNote },
      ]
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...entries.map((entry) => entry.label)],
          cancelButtonIndex: 0,
          destructiveButtonIndex: entries.length,
        },
        (index: number) => {
          if (index > 0) entries[index - 1]?.run()
        },
      )
    } else {
      handleDeleteNote()
    }
  }, [
    noteId,
    noteData?.locked,
    noteData?.pinned,
    activityEnabled,
    handleOpenNoteHistory,
    showMoveToSheet,
    handleTogglePin,
    handleToggleLock,
    handleDeleteNote,
    t,
  ])

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      hapticLight()
      editorRef.current?.setAttachmentLoading(url, true, attachmentId)
      let localUri: string | null = null
      try {
        localUri = await downloadToCache(url, fileName, (progress) =>
          editorRef.current?.setAttachmentLoading(url, true, attachmentId, progress),
        )
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        await ExpoNativeShareModule.share({ message: '', urls: [localUri], resolveOnDismiss: true })
      } catch {
        Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
      } finally {
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        isPreviewingRef.current = false
        if (localUri) {
          await cleanupCachedAttachment(localUri)
        }
      }
    },
    [t],
  )

  const previewCopiedAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      hapticLight()
      editorRef.current?.setAttachmentLoading(url, true, attachmentId)
      let localUri: string | null = null
      try {
        localUri = await downloadToCache(url, fileName, (progress) =>
          editorRef.current?.setAttachmentLoading(url, true, attachmentId, progress),
        )
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        await ExpoNativeShareModule.preview({ url: localUri })
      } catch {
        Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
      } finally {
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        isPreviewingRef.current = false
        if (localUri) {
          await cleanupCachedAttachment(localUri)
        }
      }
    },
    [t],
  )

  const { video, openVideo, closeVideo, handleVideoError } = useVideoAttachmentPlayer(
    resolveHyperdriveUrl,
    previewCopiedAttachment,
  )

  const handlePreviewAttachment = useCallback(
    (url: string, fileName: string, attachmentId?: string) => {
      if (openVideo(url, fileName, attachmentId)) return
      previewCopiedAttachment(url, fileName, attachmentId)
    },
    [openVideo, previewCopiedAttachment],
  )

  const handleImageSaveToPhotos = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    try {
      const src = selectedImageSrc
      const fileName = src.startsWith('data:')
        ? `image_${Date.now()}.jpg`
        : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
      await saveImageToPhotos(src, fileName)
      hapticSuccess()
    } catch {
      hapticError()
      Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
    }
  }, [selectedImageSrc, setIsImageActionSheetOpen, t])

  const handleImageDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    const src = selectedImageSrc
    hapticWarning()
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
  }, [selectedImageSrc, setIsImageActionSheetOpen, handleDeleteAttachment])

  const handleImageLongPress = useCallback(
    (src: string, rect?: { x: number; y: number; width: number; height: number }) => {
      if (!src) return
      hapticMedium()
      setSelectedImageSrc(src)

      if (Platform.OS === 'ios') {
        setImageActionRect(rect || null)
        setIsImageActionSheetOpen(true)
      } else {
        Alert.alert(t('noteEditor.menu.imageOptions'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('noteEditor.menu.saveToPhotos'),
            onPress: () => handleImageSaveToPhotos(),
          },
          {
            text: t('noteCard.actions.delete'),
            onPress: () => handleImageDelete(),
            style: 'destructive',
          },
        ])
      }
    },
    [
      handleImageSaveToPhotos,
      handleImageDelete,
      setSelectedImageSrc,
      setImageActionRect,
      setIsImageActionSheetOpen,
      t,
    ],
  )

  const handleAttachmentShareAction = useCallback(async () => {
    if (!selectedAttachmentSrc || !selectedAttachmentFileName) return
    setIsAttachmentActionSheetOpen(false)
    await handleOpenAttachment(selectedAttachmentSrc, selectedAttachmentFileName)
  }, [
    selectedAttachmentSrc,
    selectedAttachmentFileName,
    setIsAttachmentActionSheetOpen,
    handleOpenAttachment,
  ])

  const handleAttachmentDeleteAction = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setIsAttachmentActionSheetOpen(false)
    const url = selectedAttachmentSrc
    hapticWarning()
    await handleDeleteAttachment(url)
    editorRef.current?.deleteAttachment(url)
  }, [selectedAttachmentSrc, setIsAttachmentActionSheetOpen, handleDeleteAttachment])

  const handleAttachmentLongPress = useCallback(
    (
      url: string,
      fileName: string,
      rect?: { x: number; y: number; width: number; height: number },
    ) => {
      if (!url) return
      hapticMedium()
      setSelectedAttachmentSrc(url)
      setSelectedAttachmentFileName(fileName)

      if (Platform.OS === 'ios') {
        setAttachmentActionRect(rect || null)
        setIsAttachmentActionSheetOpen(true)
      } else {
        Alert.alert(t('noteEditor.menu.attachmentOptions'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('noteCard.actions.share'),
            onPress: () => handleAttachmentShareAction(),
          },
          {
            text: t('noteCard.actions.delete'),
            onPress: () => handleAttachmentDeleteAction(),
            style: 'destructive',
          },
        ])
      }
    },
    [
      handleAttachmentShareAction,
      handleAttachmentDeleteAction,
      setSelectedAttachmentSrc,
      setSelectedAttachmentFileName,
      setAttachmentActionRect,
      setIsAttachmentActionSheetOpen,
      t,
    ],
  )

  const openVoiceSheet = useCallback((mode: VoiceTypingMode) => {
    setVoiceMode(mode)
    setVoiceScope('note')
    setVoiceSourceUri(null)
    voiceSheetVisibleRef.current = true
    setVoiceSheetVisible(true)
  }, [])

  const handleCloseVoiceSheet = useCallback(() => {
    voiceSheetVisibleRef.current = false
    setVoiceSheetVisible(false)
  }, [])

  const handleVoiceTyping = useCallback(() => {
    if (!gateAiFeature(LOCAL_AI_FEATURE.VOICE_TYPING)) return
    hapticMedium()
    Keyboard.dismiss()
    editorRef.current?.blur()
    setTimeout(() => {
      editorRef.current?.startDictation()
      setDictationActive(true)
    }, 100)
  }, [editorRef, gateAiFeature])

  const handleDictationText = useCallback(
    (text: string) => {
      editorRef.current?.updateDictation(text)
    },
    [editorRef],
  )

  const handleDictationCommit = useCallback(
    (text: string) => {
      editorRef.current?.updateDictation(text)
      editorRef.current?.endDictation(true)
      setDictationActive(false)
    },
    [editorRef],
  )

  const handleDictationCancel = useCallback(() => {
    editorRef.current?.endDictation(false)
    setDictationActive(false)
  }, [editorRef])

  const handleDictationAttachAudio = useCallback(
    (uri: string, durationMs: number) => {
      editorRef.current?.endDictation(true)
      setDictationActive(false)
      handleRecordingDone(uri, durationMs)
    },
    [editorRef, handleRecordingDone],
  )

  const openSourceSheet = useCallback(
    async (mode: VoiceTypingMode, src: string, fileName: string, downloadErrorKey: string) => {
      openVoiceSheet(mode)
      try {
        const localUri = await downloadToCache(resolveHyperdriveUrl(src), fileName)
        if (voiceSheetVisibleRef.current) {
          setVoiceSourceUri(localUri)
        } else {
          cleanupCachedAttachment(localUri)
        }
      } catch {
        handleCloseVoiceSheet()
        Alert.alert(t('localAi.errors.failed.title'), t(downloadErrorKey))
      }
    },
    [handleCloseVoiceSheet, openVoiceSheet, resolveHyperdriveUrl, t],
  )

  const handleTranscribeAttachment = useCallback(() => {
    if (!selectedAttachmentSrc) return
    setIsAttachmentActionSheetOpen(false)
    if (!gateAiFeature(LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS)) return
    transcriptTargetRef.current = selectedAttachmentSrc
    openSourceSheet(
      'transcribe',
      selectedAttachmentSrc,
      selectedAttachmentFileName || 'recording.m4a',
      'localAi.errors.download',
    )
  }, [
    gateAiFeature,
    openSourceSheet,
    selectedAttachmentFileName,
    selectedAttachmentSrc,
    setIsAttachmentActionSheetOpen,
  ])

  const handleImageExtractText = useCallback(() => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    if (!gateAiFeature(LOCAL_AI_FEATURE.EXTRACT_TEXT)) return
    const src = selectedImageSrc
    const fileName = src.startsWith('data:')
      ? `image_${Date.now()}.jpg`
      : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
    openSourceSheet('extract', src, fileName, 'localAi.errors.downloadImage')
  }, [gateAiFeature, openSourceSheet, selectedImageSrc, setIsImageActionSheetOpen])

  const handleImageDescribe = useCallback(() => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    if (!gateAiFeature(LOCAL_AI_FEATURE.DESCRIBE_IMAGES)) return
    const src = selectedImageSrc
    const fileName = src.startsWith('data:')
      ? `image_${Date.now()}.jpg`
      : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
    captionTargetRef.current = src
    openSourceSheet('describe', src, fileName, 'localAi.errors.downloadImage')
  }, [gateAiFeature, openSourceSheet, selectedImageSrc, setIsImageActionSheetOpen])

  const handleNoteAi = useCallback(
    (mode: VoiceTypingMode) => {
      if (!noteId) return
      hapticMedium()
      Keyboard.dismiss()
      editorRef.current?.blur()
      setVoiceParagraphs(htmlToParagraphs(noteContentRef.current))
      openVoiceSheet(mode)
    },
    [editorRef, noteContentRef, noteId, openVoiceSheet],
  )
  const aiTools = useMemo(
    () => buildAiTools({ hasSelection: !!aiToolsTarget?.selection }),
    [aiToolsTarget?.selection],
  )

  const runSelectionTool = useCallback(
    (mode: VoiceTypingMode, selection: EditorSelection) => {
      selectionRef.current = selection
      Keyboard.dismiss()
      setVoiceParagraphs(
        selection.text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      )
      openVoiceSheet(mode)
      setVoiceScope('selection')
    },
    [openVoiceSheet],
  )

  const openAiTools = useCallback(
    async (allowRemembered: boolean) => {
      if (!noteId || !aiToolsVisible) return
      const current = await editorRef.current?.getSelection(allowRemembered)
      const selection = current && current.text.trim() ? current : null
      hapticMedium()
      await hideKeyboard(() => editorRef.current?.blur())
      if (selection) editorRef.current?.keepSelection()
      setAiToolsTarget({ selection })
    },
    [aiToolsVisible, editorRef, noteId],
  )

  const handleAiToolsButton = useCallback(
    () => openAiTools(isActive('hasSelection')),
    [isActive, openAiTools],
  )

  const handleSelectAiTool = useCallback(
    (tool: AiTool) => {
      const selection = aiToolsTarget?.selection ?? null
      setAiToolsTarget(null)
      if (!gateAiFeature(tool.feature)) return
      if (tool.mode === 'ask') {
        selectionRef.current = tool.scope === 'selection' ? selection : null
        setAskTarget({
          selectionText: tool.scope === 'selection' ? (selection?.text ?? '') : '',
          noteText: htmlToNoteText(noteContentRef.current),
        })
        return
      }
      if (tool.scope === 'selection' && selection) {
        runSelectionTool(tool.mode, selection)
        return
      }
      handleNoteAi(tool.mode)
    },
    [aiToolsTarget, gateAiFeature, handleNoteAi, noteContentRef, runSelectionTool],
  )

  const handleCloseAiTools = useCallback(() => setAiToolsTarget(null), [])

  const handleApplyAskEdits = useCallback(
    ({ scope, edits, replaceText, lengthDelta }: AskApplyRequest) => {
      const selection = scope === 'selection' ? selectionRef.current : null
      if (replaceText !== null) {
        if (!selection) return
        editorRef.current?.replaceRange(
          selection.from,
          selection.to,
          selection.text,
          replaceText,
          'ask',
        )
        selectionRef.current = { ...selection, text: replaceText, to: selection.to + lengthDelta }
        return
      }
      editorRef.current?.applyEdits(
        edits,
        selection ? { from: selection.from, to: selection.to } : null,
      )
      if (selection) selectionRef.current = { ...selection, to: selection.to + lengthDelta }
    },
    [editorRef],
  )

  const handleKeptSelectionCleared = useCallback(() => {
    selectionRef.current = null
  }, [])

  const handleCloseAsk = useCallback(() => {
    selectionRef.current = null
    editorRef.current?.clearKeptSelection()
    setAskTarget(null)
  }, [editorRef])

  const handleExtractTextAttachment = useCallback(() => {
    if (!selectedAttachmentSrc) return
    setIsAttachmentActionSheetOpen(false)
    if (!gateAiFeature(LOCAL_AI_FEATURE.EXTRACT_TEXT)) return
    openSourceSheet(
      'extract',
      selectedAttachmentSrc,
      selectedAttachmentFileName || 'document.pdf',
      'localAi.errors.downloadFile',
    )
  }, [
    gateAiFeature,
    openSourceSheet,
    selectedAttachmentFileName,
    selectedAttachmentSrc,
    setIsAttachmentActionSheetOpen,
  ])

  const handleInsertVoiceText = useCallback(
    (text: string, summary: TranscriptSummary | null, meta?: InsertMeta) => {
      handleCloseVoiceSheet()
      const transcriptTarget = transcriptTargetRef.current
      transcriptTargetRef.current = null
      const captionTarget = captionTargetRef.current
      captionTargetRef.current = null
      const selection = voiceScope === 'selection' ? selectionRef.current : null
      selectionRef.current = null
      editorRef.current?.clearKeptSelection()
      if (selection) {
        if (voiceMode === 'summarizeNote') {
          if (!summary) return
          editorRef.current?.insertTranscript(
            null,
            t('localAi.summarizeNote.insertTitle'),
            summary.summary ? [{ text: summary.summary }] : [],
            {
              actionItemsTitle: t('localAi.summary.actionItems'),
              actionItems: summary.actionItems,
            },
            selection.to,
          )
          return
        }
        if (voiceMode === 'keyPoints') {
          editorRef.current?.insertTranscript(
            null,
            t('localAi.keyPoints.insertTitle'),
            [],
            { bullets: meta?.bullets ?? [] },
            selection.to,
          )
          return
        }
        if (meta?.action === 'replace') {
          editorRef.current?.replaceRange(
            selection.from,
            selection.to,
            selection.text,
            text,
            isRewriteTask(voiceMode) ? 'rewrite' : 'plain',
          )
        } else {
          editorRef.current?.insertParagraphsAfter(selection.to, text)
        }
        return
      }
      if (voiceMode === 'describe') {
        editorRef.current?.insertCaption(captionTarget, text.trim())
        return
      }
      if (voiceMode === 'suggestTitle') {
        const nextTitle = text.trim()
        if (!nextTitle) return
        editorRef.current?.setTitle(nextTitle)
        handleTitleChange(nextTitle, noteId ?? null)
        return
      }
      if (voiceMode === 'summarizeNote') {
        if (!summary) return
        editorRef.current?.insertTranscript(
          null,
          t('localAi.summarizeNote.insertTitle'),
          summary.summary ? [{ text: summary.summary }] : [],
          {
            actionItemsTitle: t('localAi.summary.actionItems'),
            actionItems: summary.actionItems,
          },
        )
        return
      }
      if (voiceMode === 'keyPoints') {
        editorRef.current?.insertTranscript(null, t('localAi.keyPoints.insertTitle'), [], {
          bullets: meta?.bullets ?? [],
        })
        return
      }
      const paragraphs = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ text: line }))
      if (paragraphs.length === 0) return
      if (voiceMode === 'translate') {
        const languageLabel = meta?.language
          ? t(
              meta.language === 'en'
                ? 'localAi.translateNote.english'
                : `settings.onDeviceAi.languages.${meta.language}`,
            )
          : ''
        editorRef.current?.insertTranscript(
          null,
          t('localAi.translateNote.insertTitle', { language: languageLabel }),
          paragraphs,
        )
        return
      }
      if (voiceMode === 'transcribe') {
        editorRef.current?.insertTranscript(
          transcriptTarget,
          t('localAi.transcriptTitle'),
          paragraphs,
          summary
            ? {
                summaryTitle: t('localAi.summary.title'),
                summary: summary.summary,
                actionItemsTitle: t('localAi.summary.actionItems'),
                actionItems: summary.actionItems,
              }
            : undefined,
        )
        return
      }
      if (voiceMode !== 'dictate') editorRef.current?.moveCursorToEnd()
      editorRef.current?.appendParagraphs(paragraphs)
    },
    [editorRef, handleCloseVoiceSheet, handleTitleChange, noteId, t, voiceMode, voiceScope],
  )

  const handleRecorderDone = useCallback(
    async (uri: string, durationMs: number, options?: RecordingDoneOptions) => {
      let transcriptUri: string | null = null
      if (options?.addTranscript) {
        try {
          const copy = new FileSystem.File(FileSystem.Paths.cache, `transcript-${Date.now()}.m4a`)
          new FileSystem.File(uri).copy(copy)
          transcriptUri = copy.uri
        } catch {}
      }
      const link = await handleRecordingDone(uri, durationMs)
      if (!transcriptUri) return
      openVoiceSheet('transcribe')
      transcriptTargetRef.current = link
      setVoiceSourceUri(transcriptUri)
    },
    [handleRecordingDone, openVoiceSheet],
  )

  const handleAttachVoiceAudio = useCallback(
    (uri: string, durationMs: number) => {
      handleCloseVoiceSheet()
      handleRecordingDone(uri, durationMs)
    },
    [handleCloseVoiceSheet, handleRecordingDone],
  )

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          isOpen && Platform.OS === 'ios' && event.nativeEvent.pageX <= 28,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          isOpen &&
          Platform.OS === 'ios' &&
          gestureState.moveX <= 36 &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderGrant: () => {
          setIsEdgeSwipeActive(true)
          cancelAnimation(slideX)
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isOpen || gestureState.dx <= 0) return
          const width = Dimensions.get('window').width
          slideX.value = Math.min(gestureState.dx, width)
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isOpen) return
          const width = Dimensions.get('window').width
          const shouldClose = gestureState.dx > width * 0.3 || gestureState.vx > 0.75

          if (shouldClose) {
            closeNoteWithVelocity(gestureState.vx)
            return
          }

          setIsEdgeSwipeActive(false)
          animatePane(0)
        },
        onPanResponderTerminate: () => {
          setIsEdgeSwipeActive(false)
          animatePane(0)
        },
      }),
    [closeNoteWithVelocity, isOpen, slideX, animatePane, setIsEdgeSwipeActive],
  )

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  const toolbarBottom = useMemo(
    () => (keyboardHeight > 0 ? keyboardHeight + 12 : Platform.OS === 'ios' ? 32 : 16),
    [keyboardHeight],
  )

  useEffect(() => {
    if (!isOpen) return
    setToastBottomOffset(toolbarBottom + UI_SIZE_64)
    return () => setToastBottomOffset(null)
  }, [isOpen, toolbarBottom])

  const hasUploadQueue = useNoteUploadQueue(noteId).items.length > 0
  const canAddSharedItems = isOpen && !!noteId && !isNoteLocked
  const sharedTrayBottom = useMemo(() => {
    if (!isOpen) return insets.bottom + UI_SIZE_56
    const uploadClearance = hasUploadQueue ? UI_SIZE_80 : 0
    return toolbarBottom + UI_SIZE_64 + uploadClearance
  }, [isOpen, insets.bottom, toolbarBottom, hasUploadQueue])

  const handleUnreadableSharedItems = useCallback(
    (count: number) =>
      Alert.alert(t('shareIntake.unreadableTitle'), t('shareIntake.unreadableMessage', { count })),
    [t],
  )

  useShareIntakeController({
    isNoteOpen: isOpen,
    closeNote,
    onUnreadableItems: handleUnreadableSharedItems,
  })

  const contentTop = useMemo(() => insets.top + EDITOR_HEADER_HEIGHT, [insets.top])

  const bottomFadeStyle = useMemo(
    () => [styles.bottomFade, { height: insets.bottom }],
    [styles.bottomFade, insets.bottom],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <>
        <Animated.View
          style={[styles.animatedView, paneStyle]}
          onLayout={handlePaneLayout}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          {Platform.OS === 'ios' && isOpen ? (
            <View
              style={styles.edgeSwipeZone}
              pointerEvents={hasTextSelection ? 'none' : 'box-only'}
              {...edgeSwipeResponder.panHandlers}
            />
          ) : null}

          <View style={[styles.header, { paddingTop: insets.top - 5 }]}>
            <EdgeFade color={colors.editorBackground} />
            <View style={styles.headerRow}>
              <GlassView intensity={0} borderRadius={24} style={styles.headerBtn} isInteractive>
                <Pressable
                  onPress={closeNote}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                  style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                >
                  <SymbolView
                    name="chevron.left"
                    size={UI_ICON_SIZE_20}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              </GlassView>

              <View style={styles.flex1} />

              {isNoteLocked ? null : isEditing ? (
                <View style={styles.doneBtn}>
                  <Pressable
                    onPress={handleDone}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.done')}
                    style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                  >
                    <SymbolView
                      name="checkmark"
                      size={UI_ICON_SIZE_22}
                      tintColor={colors.onPrimary}
                      weight="semibold"
                      fallback={<View />}
                    />
                  </Pressable>
                </View>
              ) : (
                <GlassView intensity={0} borderRadius={24} style={styles.headerPill} isInteractive>
                  <Pressable
                    onPress={handleShare}
                    disabled={isSharing}
                    accessibilityRole="button"
                    accessibilityLabel={t('noteCard.actions.share')}
                    style={({ pressed }) => [
                      styles.headerBtnInner,
                      (pressed || isSharing) && styles.pressed,
                    ]}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <SymbolView
                        name="square.and.arrow.up"
                        size={UI_ICON_SIZE_24}
                        tintColor={colors.text}
                        weight="medium"
                        fallback={<View />}
                      />
                    )}
                  </Pressable>
                  <View style={styles.pillDivider} />
                  {ExpoUI ? (
                    <ExpoUI.Host matchContents style={{ width: UI_SIZE_48, height: UI_SIZE_48 }}>
                      <ExpoUI.Menu
                        label={
                          <ExpoUI.RNHostView matchContents>
                            <View
                              style={styles.headerBtnInner}
                              accessible
                              accessibilityRole="button"
                              accessibilityLabel={t('noteCard.actions.options')}
                            >
                              <SymbolView
                                name="ellipsis"
                                size={UI_ICON_SIZE_24}
                                tintColor={colors.text}
                                weight="medium"
                                fallback={<View />}
                              />
                            </View>
                          </ExpoUI.RNHostView>
                        }
                      >
                        <ExpoUI.Button
                          label={
                            noteData?.pinned
                              ? t('noteCard.actions.unpin')
                              : t('noteCard.actions.pin')
                          }
                          systemImage={noteData?.pinned ? 'pin.slash' : 'pin'}
                          onPress={handleTogglePin}
                        />
                        <ExpoUI.Menu
                          label={t('noteCard.actions.moveTo')}
                          systemImage="folder.badge.plus"
                        >
                          {moveFolders.length > 0 ? (
                            moveFolders.map((f: any) => (
                              <ExpoUI.Button
                                key={f.id}
                                label={f.name}
                                systemImage={FOLDER_ICON_SF[f.icon ?? ''] ?? FALLBACK_FOLDER_SF}
                                onPress={() => handleMoveNote(f.id)}
                              />
                            ))
                          ) : (
                            <ExpoUI.Button
                              label={t('noteCard.actions.noFolders')}
                              systemImage="folder.badge.minus"
                              onPress={() => {}}
                            />
                          )}
                        </ExpoUI.Menu>
                        <ExpoUI.Button
                          label={
                            noteData?.locked
                              ? t('noteCard.actions.unlock')
                              : t('noteCard.actions.lock')
                          }
                          systemImage={noteData?.locked ? 'lock.slash' : 'lock'}
                          onPress={handleToggleLock}
                        />
                        {activityEnabled ? (
                          <ExpoUI.Button
                            label={t('noteEditor.menu.noteHistory')}
                            systemImage="clock.arrow.circlepath"
                            onPress={handleOpenNoteHistory}
                          />
                        ) : null}
                        <ExpoUI.Button
                          label={t('noteCard.actions.delete')}
                          systemImage="trash"
                          role="destructive"
                          onPress={handleDeleteNote}
                        />
                      </ExpoUI.Menu>
                    </ExpoUI.Host>
                  ) : (
                    <Pressable
                      onPress={handleMoreOptions}
                      accessibilityRole="button"
                      accessibilityLabel={t('noteCard.actions.options')}
                      style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                    >
                      <SymbolView
                        name="ellipsis"
                        size={UI_ICON_SIZE_24}
                        tintColor={colors.text}
                        weight="medium"
                        fallback={<View />}
                      />
                    </Pressable>
                  )}
                </GlassView>
              )}
            </View>
          </View>

          {shouldMountEditor && (
            <TiptapEditor
              ref={editorRef}
              noteId={noteId ?? 'new'}
              initialContent=""
              initialTitle=""
              safeAreaTop={contentTop}
              safeAreaBottom={0}
              scrollEnabled={!isEdgeSwipeActive}
              onContentChange={handleUpdate}
              onTitleChange={handleTitleChange}
              onStyleStateChange={handleStyleStateChange}
              onEditorFocus={handleEditorFocus}
              onEditorBlur={handleEditorBlur}
              onOpenAttachment={handleOpenAttachment}
              onPreviewAttachment={handlePreviewAttachment}
              onRequestPdfThumbnail={handleRequestPdfThumbnail}
              onDeleteAttachment={handleDeleteAttachment}
              onImageLongPress={handleImageLongPress}
              onAttachmentLongPress={handleAttachmentLongPress}
              onKeptSelectionCleared={handleKeptSelectionCleared}
              onNoteLoaded={handleNoteLoaded}
              onEditorReset={handleEditorReset}
            />
          )}

          {isOpen && showBodyPlaceholder && !isNoteLocked && (
            <NoteBodyPlaceholder key={noteId} noteValue={noteData} topInset={contentTop} />
          )}

          <NoteConflictBanner noteKey={noteId} />

          <View style={bottomFadeStyle} pointerEvents="none">
            <EdgeFade color={colors.editorBackground} placement="bottom" />
          </View>

          {isOpen && !isNoteLocked && !dictationActive && (
            <EditorToolbar
              isEditing={isEditing}
              isActive={isActive}
              colors={colors}
              editorRef={editorRef}
              toolbarBottom={toolbarBottom}
              onPickImage={handlePickImage}
              onPickFile={handlePickFile}
              onRecordAudio={handleRecordAudio}
              onScanDocument={handleScanDocument}
              onTakePhoto={handleTakePhoto}
              onTakeVideo={handleTakeVideo}
              onVoiceTyping={aiToolsVisible ? handleVoiceTyping : undefined}
              onAiTools={aiToolsVisible ? handleAiToolsButton : undefined}
            />
          )}

          {isNoteLocked && (
            <View style={styles.lockOverlay}>
              <LockedNoteView noteId={noteId ?? ''} topInset={contentTop} />
            </View>
          )}

          <LockedContentShield active={protectLockedNote} />

          {!!noteId && (
            <NoteHistoryModal
              visible={historyVisible}
              noteId={noteId}
              onClose={handleCloseNoteHistory}
            />
          )}

          {video && (
            <VideoPlayerModal
              uri={video.uri}
              title={video.fileName}
              onClose={closeVideo}
              onError={handleVideoError}
            />
          )}

          <AudioRecorderModal
            visible={isRecorderVisible}
            transcriptAvailable={transcribeReady}
            onDone={handleRecorderDone}
            onCancel={() => setIsRecorderVisible(false)}
          />

          {LOCAL_AI_ENABLED && (
            <AiToolsSheet
              visible={!!aiToolsTarget}
              selectionText={aiToolsTarget?.selection?.text ?? ''}
              tools={aiTools}
              onSelect={handleSelectAiTool}
              onClose={handleCloseAiTools}
            />
          )}

          {LOCAL_AI_ENABLED && dictationActive && (
            <VoiceTypingBar
              visible={dictationActive}
              toolbarBottom={toolbarBottom}
              onLiveText={handleDictationText}
              onCommit={handleDictationCommit}
              onCancel={handleDictationCancel}
              onAttachAudio={handleDictationAttachAudio}
            />
          )}

          {LOCAL_AI_ENABLED && (
            <AskNoteSheet
              visible={!!askTarget}
              selectionText={askTarget?.selectionText ?? ''}
              noteText={askTarget?.noteText ?? ''}
              insertBlocked={hasNoteConflict}
              onApplyEdits={handleApplyAskEdits}
              onClose={handleCloseAsk}
            />
          )}

          {LOCAL_AI_ENABLED && (
            <VoiceTypingSheet
              visible={voiceSheetVisible}
              mode={voiceMode}
              sourceUri={voiceSourceUri}
              insertBlocked={hasNoteConflict}
              summaryAvailable={summarizeReady}
              sourceParagraphs={voiceParagraphs}
              scope={voiceScope}
              onInsert={handleInsertVoiceText}
              onAttachAudio={handleAttachVoiceAudio}
              onClose={handleCloseVoiceSheet}
            />
          )}

          <UploadQueueBanner noteId={noteId} bottom={toolbarBottom + 64} />

          {ExpoUI && (
            <View
              style={[
                styles.confirmationDialogTarget,
                {
                  top: imageActionRect
                    ? Math.max(
                        100,
                        Math.min(
                          Dimensions.get('window').height - 150,
                          imageActionRect.y + imageActionRect.height / 2,
                        ),
                      )
                    : 0,
                  left: imageActionRect
                    ? imageActionRect.width < 300
                      ? imageActionRect.x + imageActionRect.width / 2 <
                        Dimensions.get('window').width / 2
                        ? imageActionRect.x + imageActionRect.width - 5
                        : imageActionRect.x + 5
                      : imageActionRect.x + imageActionRect.width / 2
                    : 0,
                  opacity: imageActionRect ? 1 : 0,
                },
              ]}
              pointerEvents="none"
            >
              <ExpoUI.Host matchContents>
                <ExpoUI.ConfirmationDialog
                  title={t('noteEditor.menu.imageOptions')}
                  titleVisibility="hidden"
                  isPresented={isImageActionSheetOpen && !!imageActionRect}
                  onIsPresentedChange={setIsImageActionSheetOpen}
                >
                  <ExpoUI.ConfirmationDialog.Trigger>
                    <ExpoUI.RNHostView matchContents>
                      <View style={{ width: 1, height: 1 }} />
                    </ExpoUI.RNHostView>
                  </ExpoUI.ConfirmationDialog.Trigger>
                  <ExpoUI.ConfirmationDialog.Actions>
                    <ExpoUI.Button
                      label={t('noteEditor.menu.saveToPhotos')}
                      systemImage="square.and.arrow.down"
                      onPress={handleImageSaveToPhotos}
                    />
                    {aiToolsVisible && (
                      <ExpoUI.Button
                        label={t('localAi.extractText.menuLabel')}
                        systemImage="text.viewfinder"
                        onPress={handleImageExtractText}
                      />
                    )}
                    {aiToolsVisible && (
                      <ExpoUI.Button
                        label={t('localAi.describeImage.menuLabel')}
                        systemImage="text.below.photo"
                        onPress={handleImageDescribe}
                      />
                    )}
                    <ExpoUI.Button
                      label={t('noteCard.actions.delete')}
                      systemImage="trash"
                      role="destructive"
                      onPress={handleImageDelete}
                    />
                  </ExpoUI.ConfirmationDialog.Actions>
                </ExpoUI.ConfirmationDialog>
              </ExpoUI.Host>
            </View>
          )}

          {ExpoUI && (
            <View
              style={[
                styles.confirmationDialogTarget,
                {
                  top: attachmentActionRect
                    ? Math.max(
                        100,
                        Math.min(
                          Dimensions.get('window').height - 150,
                          attachmentActionRect.y + attachmentActionRect.height / 2,
                        ),
                      )
                    : 0,
                  left: attachmentActionRect
                    ? attachmentActionRect.width < 300
                      ? attachmentActionRect.x + attachmentActionRect.width / 2 <
                        Dimensions.get('window').width / 2
                        ? attachmentActionRect.x + attachmentActionRect.width - 5
                        : attachmentActionRect.x + 5
                      : attachmentActionRect.x + attachmentActionRect.width / 2
                    : 0,
                  opacity: attachmentActionRect ? 1 : 0,
                },
              ]}
              pointerEvents="none"
            >
              <ExpoUI.Host matchContents>
                <ExpoUI.ConfirmationDialog
                  title={t('noteEditor.menu.attachmentOptions')}
                  titleVisibility="hidden"
                  isPresented={isAttachmentActionSheetOpen && !!attachmentActionRect}
                  onIsPresentedChange={setIsAttachmentActionSheetOpen}
                >
                  <ExpoUI.ConfirmationDialog.Trigger>
                    <ExpoUI.RNHostView matchContents>
                      <View style={{ width: 1, height: 1 }} />
                    </ExpoUI.RNHostView>
                  </ExpoUI.ConfirmationDialog.Trigger>
                  <ExpoUI.ConfirmationDialog.Actions>
                    <ExpoUI.Button
                      label={t('noteCard.actions.share')}
                      systemImage="square.and.arrow.up"
                      onPress={handleAttachmentShareAction}
                    />
                    {aiToolsVisible && isAudioFile(selectedAttachmentFileName ?? undefined) && (
                      <ExpoUI.Button
                        label={t('localAi.transcribe.menuLabel')}
                        systemImage="text.quote"
                        onPress={handleTranscribeAttachment}
                      />
                    )}
                    {aiToolsVisible && isPdfAttachment(selectedAttachmentFileName) && (
                      <ExpoUI.Button
                        label={t('localAi.extractText.menuLabel')}
                        systemImage="text.viewfinder"
                        onPress={handleExtractTextAttachment}
                      />
                    )}
                    <ExpoUI.Button
                      label={t('noteCard.actions.delete')}
                      systemImage="trash"
                      role="destructive"
                      onPress={handleAttachmentDeleteAction}
                    />
                  </ExpoUI.ConfirmationDialog.Actions>
                </ExpoUI.ConfirmationDialog>
              </ExpoUI.Host>
            </View>
          )}
        </Animated.View>

        <SharedItemsTray
          isNoteOpen={isOpen}
          canAddToNote={canAddSharedItems}
          bottom={sharedTrayBottom}
          onAddToNote={handleAddSharedItems}
        />
      </>
    </NoteEditorContext.Provider>
  )
}

const ActionSheetIOS: any = Platform.OS === 'ios' ? require('react-native').ActionSheetIOS : null

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    animatedView: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.editorBackground,
    },
    lockOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 9,
      backgroundColor: theme.colors.background,
    },
    header: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    edgeSwipeZone: {
      ...StyleSheet.absoluteFill,
      width: UI_SIZE_32,
      zIndex: 30,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      paddingHorizontal: Space.base,
    },
    headerBtn: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    headerBtnInner: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doneBtn: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: Radii.pill,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: theme.colors.primary,
    },
    headerPill: {
      height: UI_SIZE_48,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    pillDivider: {
      width: StyleSheet.hairlineWidth,
      height: UI_SIZE_20,
      backgroundColor: theme.colors.separator,
    },
    flex1: {
      flex: 1,
    },
    pressed: {
      opacity: 0.5,
    },
    confirmationDialogTarget: {
      position: 'absolute',
      width: 1,
      height: 1,
    },
  })
  return styles
})
