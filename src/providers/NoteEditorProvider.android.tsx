import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { File as FsFile, Paths } from 'expo-file-system'

import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { selectIsLocalAiFeatureReady } from '@pear-notes/core/store/slices/localAiSlice.js'
import { deleteNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getActivityLogEnabled,
  getLockMethod,
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { AttachmentSheet } from '@/components/android/AttachmentSheet'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { EditorToolbar } from '@/components/android/EditorToolbar'
import { FolderPickerSheet } from '@/components/android/FolderPickerSheet'
import { UploadBanner } from '@/components/android/UploadBanner'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { EdgeFade } from '@/components/EdgeFade'
import { LockedContentShield } from '@/components/LockedContentShield'
import { LockedNoteView } from '@/components/LockedNoteView'
import { NoteConflictBanner } from '@/components/NoteConflictBanner'
import { SharedItemsTray } from '@/components/share/SharedItemsTray'
import { createThemedStylesheetWithHooks, useReduceMotion } from '@/components/Themed'
import { TiptapEditor } from '@/components/TiptapEditor'
import { UploadQueueBanner } from '@/components/upload/UploadQueueBanner'
import { useNoteConflict } from '@/components/useNoteConflict'
import type { VoiceTypingMode } from '@/components/useVoiceTypingSheet'
import { VoiceTypingSheet } from '@/components/VoiceTypingSheet'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_42,
  UI_SIZE_72,
  UI_SIZE_80,
  UI_SIZE_96,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useDeferredEditorMount } from '@/hooks/useDeferredEditorMount'
import { useLockedNoteScreenProtection } from '@/hooks/useLockedNoteScreenProtection'
import { useShareIntakeController } from '@/hooks/useShareIntakeController'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hasFileExtension } from '@/lib/fileSignature'
import { hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { snapTo } from '@/lib/motion'
import {
  cleanupCachedAttachment,
  copyFileToSAF,
  downloadToCache,
  shareMessage,
} from '@/lib/noteAttachmentManager'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { buildNoteSharePayload } from '@/lib/noteShare'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import { NoteEditorContext } from '@/providers/NoteEditorContext'

import { NoteHistoryModal } from '../components/activity/NoteHistoryModal'
import { AudioRecorderModal, type RecordingDoneOptions } from '../components/AudioRecorderModal'
import { isPdfAttachment } from '../lib/pdfTools'
import { getAttachmentFileName, isAudioFile, isImageFile } from '../utils/media'

import { useToast } from './ToastProvider'
import { useNoteEditor } from './useNoteEditor'
import { useNoteEditorActions } from './useNoteEditorActions'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  avif: 'image/avif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  zip: 'application/zip',
}

const FALLBACK_MIME_TYPE = 'application/octet-stream'
const FALLBACK_IMAGE_FILE_NAME = 'image'
const FALLBACK_FILE_NAME = 'file'

function applyDownloadedExtension(fileName: string, localPath: string): string {
  if (hasFileExtension(fileName)) return fileName
  const localName = localPath.split('/').pop() || ''
  if (!hasFileExtension(localName)) return fileName
  return `${fileName}.${localName.split('.').pop()}`
}

const EDITOR_HEADER_HEIGHT = 52

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReduceMotion()
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleSave = useMemo(() => androidRipple(c.onPrimaryContainer), [c.onPrimaryContainer])
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const styles = useStyles()
  const { width } = Dimensions.get('window')
  const { showToast } = useToast()

  const editor = useNoteEditor()
  const {
    editorRef,
    noteId,
    isOpen,
    isEditing,
    keyboardHeight,
    isSharing,
    setIsSharing,
    uploadInfo,
    setUploadInfo,
    selectedImageSrc,
    setSelectedImageSrc,
    selectedAttachmentSrc,
    setSelectedAttachmentSrc,
    selectedAttachmentFileName,
    setSelectedAttachmentFileName,
    moveDialogVisible,
    setMoveDialogVisible,
    moreSheetVisible,
    setMoreSheetVisible,
    attachSheetVisible,
    setAttachSheetVisible,
    imageSheetVisible,
    setImageSheetVisible,
    attachmentSheetVisible2,
    setAttachmentSheetVisible2,
    isRecorderVisible,
    historyVisible,
    setHistoryVisible,
    setIsRecorderVisible,
    recorderEverOpened,
    setRecorderEverOpened,
    dialogInfo,
    setDialogInfo,
    slideAnim,
    titleRef,
    noteContentRef,
    moveFolders,
    resetEditorState,
    closeNote,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
    noteData,
    handleYjsMessage,
  } = editor

  const isPreviewingRef = useRef(false)

  const shouldMountEditor = useDeferredEditorMount(isOpen)

  const uploadQueue = useNoteUploadQueue(noteId)
  const hasUploadQueue = uploadQueue.items.length > 0
  const uploadBannerBottom = useMemo(
    () =>
      (keyboardHeight > 0 ? keyboardHeight + UI_SIZE_42 : insets.bottom + UI_SIZE_12) + UI_SIZE_72,
    [keyboardHeight, insets.bottom],
  )
  const lockMethod = useSelector(getLockMethod)
  const activityEnabled = useSelector(getActivityLogEnabled) as boolean
  const isNoteUnlockedForNote = useIsNoteUnlocked(noteId)
  const isNoteLocked = !!noteData?.locked && !!noteId && !isNoteUnlockedForNote
  const protectLockedNote = isOpen && !!noteData?.locked
  useLockedNoteScreenProtection(protectLockedNote)
  const voiceTypingReady = useSelector(
    (state) =>
      LOCAL_AI_ENABLED &&
      (selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.VOICE_TYPING) as boolean),
  )
  const transcribeReady = useSelector(
    (state) =>
      LOCAL_AI_ENABLED &&
      (selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS) as boolean),
  )
  const extractTextReady = useSelector(
    (state) =>
      LOCAL_AI_ENABLED &&
      (selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.EXTRACT_TEXT) as boolean),
  )
  const { isVisible: hasNoteConflict } = useNoteConflict(noteId)
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false)
  const [voiceMode, setVoiceMode] = useState<VoiceTypingMode>('dictate')
  const [voiceSourceUri, setVoiceSourceUri] = useState<string | null>(null)
  const voiceSheetVisibleRef = useRef(false)
  const transcriptTargetRef = useRef<string | null>(null)
  const canAddSharedItems = isOpen && !!noteId && !isNoteLocked && keyboardHeight === 0
  const sharedTrayBottom = useMemo(() => {
    if (!isOpen) return insets.bottom + UI_SIZE_96
    return uploadBannerBottom + (hasUploadQueue ? UI_SIZE_80 : 0)
  }, [isOpen, insets.bottom, uploadBannerBottom, hasUploadQueue])
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

  const handleUploadError = useCallback((message: string) => showToast(message), [showToast])

  const handleCameraPermissionDenied = useCallback(
    () => showToast(t('permissions.camera.message')),
    [showToast, t],
  )

  const deleteUploadCache = useCallback(async (cacheUri: string) => {
    const FileSystem = await import('expo-file-system/legacy')
    await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {})
  }, [])

  const handleBeforeToggleLock = useCallback(
    () => setMoreSheetVisible(false),
    [setMoreSheetVisible],
  )

  const handleUnreadableSharedItems = useCallback(
    (count: number) => showToast(t('shareIntake.unreadableMessage', { count })),
    [showToast, t],
  )

  useShareIntakeController({
    isNoteOpen: isOpen,
    closeNote,
    onUnreadableItems: handleUnreadableSharedItems,
  })

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
    screenWidth: width,
    recordingFileNamePrefix: 'voice-note',
    labels: editorLabels,
    onUploadError: handleUploadError,
    onCameraPermissionDenied: handleCameraPermissionDenied,
    deleteUploadCache,
    onBeforeToggleLock: handleBeforeToggleLock,
  })

  const executeShare = useCallback(
    async (src: string, fileName: string) => {
      try {
        const cleanUrl = resolveHyperdriveUrl(src)
        const localPath = await downloadToCache(cleanUrl, fileName)
        if (localPath) {
          await shareMessage('', [localPath])
        } else {
          await shareMessage(cleanUrl, [])
        }
      } catch {}
    },
    [resolveHyperdriveUrl],
  )

  const executeDownload = useCallback(
    async (src: string, fileName: string) => {
      try {
        const cleanUrl = resolveHyperdriveUrl(src)
        const FileSystem = await import('expo-file-system/legacy')
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (permissions.granted) {
          setUploadInfo({
            fileName,
            status: t('noteCard.actions.downloading', 'Downloading...'),
            progress: 0,
          })
          const localPath = await downloadToCache(cleanUrl, fileName, (progress) =>
            setUploadInfo({
              fileName,
              status: t('noteCard.actions.downloading', 'Downloading...'),
              progress,
            }),
          )
          if (localPath) {
            const targetName = applyDownloadedExtension(fileName, localPath)
            const ext = targetName.split('.').pop()?.toLowerCase() || ''
            const mimeType = MIME_TYPES[ext] || FALLBACK_MIME_TYPE
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              targetName,
              mimeType,
            )
            await copyFileToSAF(localPath, uri)
            hapticSuccess()
            showToast(t('noteCard.downloadComplete', 'File downloaded successfully.'))
          } else {
            showToast(t('noteEditor.upload.failedDownload', 'Could not download the file.'))
          }
        }
      } catch (e) {
        showToast(String(e))
      } finally {
        setUploadInfo(null)
      }
    },
    [resolveHyperdriveUrl, setUploadInfo, showToast, t],
  )

  const handleImageLongPress = useCallback(
    (src: string) => {
      if (!src) return
      hapticMedium()
      setSelectedImageSrc(src)
      setImageSheetVisible(true)
    },
    [setSelectedImageSrc, setImageSheetVisible],
  )

  const handleImageMenuDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    hapticWarning()
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
    setSelectedImageSrc(null)
  }, [selectedImageSrc, handleDeleteAttachment, setImageSheetVisible, setSelectedImageSrc])

  const handleImageMenuShare = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeShare(src, getAttachmentFileName(src, FALLBACK_IMAGE_FILE_NAME))
  }, [selectedImageSrc, executeShare, setImageSheetVisible, setSelectedImageSrc])

  const handleImageMenuDownload = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeDownload(src, getAttachmentFileName(src, FALLBACK_IMAGE_FILE_NAME))
  }, [selectedImageSrc, executeDownload, setImageSheetVisible, setSelectedImageSrc])

  const handleAttachmentLongPress = useCallback(
    (url: string, fileName: string) => {
      if (!url) return
      hapticMedium()
      setSelectedAttachmentSrc(url)
      setSelectedAttachmentFileName(fileName)
      setAttachmentSheetVisible2(true)
    },
    [setSelectedAttachmentSrc, setSelectedAttachmentFileName, setAttachmentSheetVisible2],
  )

  const handleAttachmentMenuShare = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || getAttachmentFileName(src, FALLBACK_FILE_NAME)
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    await executeShare(src, fileName)
  }, [
    selectedAttachmentSrc,
    selectedAttachmentFileName,
    executeShare,
    setAttachmentSheetVisible2,
    setSelectedAttachmentSrc,
    setSelectedAttachmentFileName,
  ])

  const handleAttachmentMenuDelete = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const url = selectedAttachmentSrc
    hapticWarning()
    await handleDeleteAttachment(url)
    editorRef.current?.deleteAttachment(url)
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
  }, [
    selectedAttachmentSrc,
    handleDeleteAttachment,
    setAttachmentSheetVisible2,
    setSelectedAttachmentSrc,
    setSelectedAttachmentFileName,
  ])

  const handleAttachmentMenuDownload = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || getAttachmentFileName(src, FALLBACK_FILE_NAME)
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    await executeDownload(src, fileName)
  }, [
    selectedAttachmentSrc,
    selectedAttachmentFileName,
    executeDownload,
    setAttachmentSheetVisible2,
    setSelectedAttachmentSrc,
    setSelectedAttachmentFileName,
  ])

  const openVoiceSheet = useCallback((mode: VoiceTypingMode) => {
    setVoiceMode(mode)
    setVoiceSourceUri(null)
    voiceSheetVisibleRef.current = true
    setVoiceSheetVisible(true)
  }, [])

  const handleCloseVoiceSheet = useCallback(() => {
    voiceSheetVisibleRef.current = false
    setVoiceSheetVisible(false)
  }, [])

  const handleVoiceTyping = useCallback(() => {
    Keyboard.dismiss()
    editorRef.current?.blur()
    openVoiceSheet('dictate')
  }, [editorRef, openVoiceSheet])

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
        showToast(t(downloadErrorKey))
      }
    },
    [handleCloseVoiceSheet, openVoiceSheet, resolveHyperdriveUrl, showToast, t],
  )

  const handleAttachmentMenuTranscribe = useCallback(() => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || getAttachmentFileName(src, 'recording.m4a')
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    transcriptTargetRef.current = src
    openSourceSheet('transcribe', src, fileName, 'localAi.errors.download')
  }, [
    openSourceSheet,
    selectedAttachmentFileName,
    selectedAttachmentSrc,
    setAttachmentSheetVisible2,
    setSelectedAttachmentFileName,
    setSelectedAttachmentSrc,
  ])

  const handleImageMenuExtractText = useCallback(() => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    openSourceSheet(
      'extract',
      src,
      getAttachmentFileName(src, FALLBACK_IMAGE_FILE_NAME),
      'localAi.errors.downloadImage',
    )
  }, [openSourceSheet, selectedImageSrc, setImageSheetVisible, setSelectedImageSrc])

  const handleAttachmentMenuExtractText = useCallback(() => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || getAttachmentFileName(src, 'document.pdf')
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    openSourceSheet('extract', src, fileName, 'localAi.errors.downloadFile')
  }, [
    openSourceSheet,
    selectedAttachmentFileName,
    selectedAttachmentSrc,
    setAttachmentSheetVisible2,
    setSelectedAttachmentFileName,
    setSelectedAttachmentSrc,
  ])

  const handleInsertVoiceText = useCallback(
    (text: string) => {
      handleCloseVoiceSheet()
      const transcriptTarget = transcriptTargetRef.current
      transcriptTargetRef.current = null
      const paragraphs = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ text: line }))
      if (paragraphs.length === 0) return
      if (voiceMode === 'transcribe') {
        editorRef.current?.insertTranscript(
          transcriptTarget,
          t('localAi.transcriptTitle'),
          paragraphs,
        )
        return
      }
      if (voiceMode !== 'dictate') editorRef.current?.moveCursorToEnd()
      editorRef.current?.appendParagraphs(paragraphs)
    },
    [editorRef, handleCloseVoiceSheet, t, voiceMode],
  )

  const handleRecorderDone = useCallback(
    async (uri: string, durationMs: number, options?: RecordingDoneOptions) => {
      let transcriptUri: string | null = null
      if (options?.addTranscript) {
        try {
          const copy = new FsFile(Paths.cache, `transcript-${Date.now()}.m4a`)
          new FsFile(uri).copy(copy)
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

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      try {
        const cleanUrl = resolveHyperdriveUrl(url)
        const name = fileName || cleanUrl.split('/').pop() || 'file'
        const status = t('noteCard.actions.downloading', 'Downloading...')
        setUploadInfo({ fileName: name, status, progress: 0 })
        const localPath = await downloadToCache(cleanUrl, name, (progress) =>
          setUploadInfo({ fileName: name, status, progress }),
        )
        const ExpoNativeShareModule = await import('../../modules/expo-native-share')
        if (localPath) {
          await ExpoNativeShareModule.default.preview({ url: localPath })
        } else {
          await ExpoNativeShareModule.default.preview({ url: cleanUrl })
        }
      } catch {
      } finally {
        setUploadInfo(null)
        isPreviewingRef.current = false
      }
    },
    [resolveHyperdriveUrl, setUploadInfo, t],
  )

  const handlePreviewAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!isImageFile(fileName) && !url.startsWith('data:image/')) {
        handleOpenAttachment(url, fileName)
        return
      }
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      try {
        const cleanUrl = resolveHyperdriveUrl(url)
        const name = fileName || cleanUrl.split('/').pop() || 'image.jpg'
        const localPath = await downloadToCache(cleanUrl, name)
        if (localPath) {
          const ExpoNativeShareModule = await import('../../modules/expo-native-share')
          await ExpoNativeShareModule.default.preview({ url: localPath })
        }
      } catch {
      } finally {
        isPreviewingRef.current = false
      }
    },
    [handleOpenAttachment, resolveHyperdriveUrl],
  )

  const handleConfirmMove = useCallback(
    (folderId: string) => {
      setMoveDialogVisible(false)
      handleMoveNote(folderId)
    },
    [handleMoveNote, setMoveDialogVisible],
  )

  const handleRecordAudio = useCallback(() => {
    Keyboard.dismiss()
    setRecorderEverOpened(true)
    setIsRecorderVisible(true)
  }, [setRecorderEverOpened, setIsRecorderVisible])

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    hapticMedium()
    setDialogInfo({
      title: t('noteCard.actions.delete'),
      message: t('noteCard.deleteConfirmation'),
      confirmText: t('noteCard.actions.delete'),
      isDestructive: true,
      onConfirm: () => {
        dispatch(deleteNote(noteId as any))
        const w = Dimensions.get('window').width
        if (reduceMotion) {
          snapTo(slideAnim, w, resetEditorState)
          return
        }
        Animated.timing(slideAnim, {
          toValue: w,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          resetEditorState()
        })
      },
    })
  }, [noteId, dispatch, slideAnim, resetEditorState, setDialogInfo, reduceMotion, t])

  const handleCloseNoteHistory = useCallback(() => setHistoryVisible(false), [setHistoryVisible])

  const moreSheetActions = useMemo(() => {
    const list = []
    list.push({
      icon: noteData?.pinned ? 'pin-off-outline' : 'pin-outline',
      label: noteData?.pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin'),
      onPress: () => {
        setMoreSheetVisible(false)
        handleTogglePin()
      },
    })
    if (moveFolders.length > 0) {
      list.push({
        icon: 'folder-move-outline',
        label: t('noteCard.actions.moveTo'),
        onPress: () => {
          setMoreSheetVisible(false)
          setMoveDialogVisible(true)
        },
      })
    }
    list.push({
      icon: noteData?.locked ? 'lock-off-outline' : 'lock-outline',
      label: noteData?.locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock'),
      onPress: handleToggleLock,
    })
    if (activityEnabled) {
      list.push({
        icon: 'history',
        label: t('noteEditor.menu.noteHistory'),
        onPress: () => {
          setMoreSheetVisible(false)
          setHistoryVisible(true)
        },
      })
    }
    list.push({
      icon: 'delete-outline',
      label: t('noteCard.actions.delete'),
      onPress: () => {
        setMoreSheetVisible(false)
        handleDeleteNote()
      },
      destructive: true,
    })
    return list
  }, [
    moveFolders,
    noteData?.locked,
    noteData?.pinned,
    noteId,
    activityEnabled,
    setHistoryVisible,
    t,
    handleDeleteNote,
    handleToggleLock,
    handleTogglePin,
    setMoreSheetVisible,
    setMoveDialogVisible,
  ])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    hapticMedium()
    setIsSharing(true)
    try {
      const { message, urls } = await buildNoteSharePayload({
        title: titleRef.current || t('noteCard.untitled'),
        html: noteContentRef.current || '',
        resolveHyperdriveUrl,
      })
      await shareMessage(message, urls)
    } catch (error) {
      console.error('handleShare', error)
    } finally {
      setIsSharing(false)
    }
  }, [isSharing, setIsSharing, resolveHyperdriveUrl, t])

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <Animated.View
        style={[styles.animatedView, { transform: [{ translateX: slideAnim }] }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

        {shouldMountEditor && (
          <TiptapEditor
            ref={editorRef}
            noteId={noteId ?? 'new'}
            initialContent=""
            initialTitle=""
            safeAreaTop={insets.top + EDITOR_HEADER_HEIGHT}
            safeAreaBottom={0}
            backgroundColor={c.background}
            onContentChange={handleUpdate}
            onYjsMessage={handleYjsMessage}
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
          />
        )}

        <NoteConflictBanner noteKey={noteId} />

        {isNoteLocked && (
          <View style={styles.lockOverlay}>
            <LockedNoteView noteId={noteId ?? ''} />
          </View>
        )}

        <View style={styles.headerFade} pointerEvents="none">
          <EdgeFade color={c.background} />
        </View>

        <View style={styles.floatingLeft} pointerEvents="box-none">
          <Pressable
            onPress={closeNote}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            android_ripple={rippleBorderless}
            style={styles.floatingIconBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_22} color={c.primary} />
          </Pressable>
        </View>

        {!isNoteLocked && (
          <View style={styles.floatingRight} pointerEvents="box-none">
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={t('noteCard.actions.share')}
              android_ripple={rippleBorderless}
              style={styles.floatingIconBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={UI_ICON_SIZE_20}
                color={c.primary}
              />
            </Pressable>

            <Pressable
              onPress={() => setMoreSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('noteCard.actions.options')}
              android_ripple={rippleBorderless}
              style={styles.floatingIconBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={UI_ICON_SIZE_22}
                color={c.primary}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                if (isEditing) {
                  handleDone()
                } else {
                  setTimeout(() => editorRef.current?.focus(), 100)
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? t('common.done') : t('formatting.editNote')}
              android_ripple={rippleSave}
              style={styles.saveBtn}
            >
              <MaterialCommunityIcons
                name={isEditing ? 'check' : 'pencil-outline'}
                size={UI_ICON_SIZE_20}
                color={c.onPrimaryContainer}
              />
            </Pressable>
          </View>
        )}

        <LockedContentShield active={protectLockedNote} />

        <View style={styles.bottomFade} pointerEvents="none">
          <EdgeFade color={c.background} placement="bottom" />
        </View>

        {!isNoteLocked && (
          <EditorToolbar
            isActive={isActive}
            editorRef={editorRef}
            onVoiceTyping={voiceTypingReady ? handleVoiceTyping : undefined}
            onAttachPress={() => {
              Keyboard.dismiss()
              editorRef.current?.blur()
              setAttachSheetVisible(true)
            }}
          />
        )}

        <AttachmentSheet
          visible={attachSheetVisible}
          onDismiss={() => setAttachSheetVisible(false)}
          onPickImage={handlePickImage}
          onTakePhoto={handleTakePhoto}
          onTakeVideo={handleTakeVideo}
          onPickFile={handlePickFile}
          onScanDocument={handleScanDocument}
          onRecordAudio={handleRecordAudio}
        />

        <UploadQueueBanner noteId={noteId} bottom={uploadBannerBottom} />

        {!hasUploadQueue && uploadInfo ? (
          <UploadBanner
            fileName={uploadInfo.fileName}
            status={uploadInfo.status}
            progress={uploadInfo.progress}
            style={[
              styles.uploadBanner,
              {
                bottom:
                  (keyboardHeight > 0 ? keyboardHeight + UI_SIZE_42 : insets.bottom + UI_SIZE_12) +
                  UI_SIZE_72,
              },
            ]}
          />
        ) : null}

        <FolderPickerSheet
          visible={moveDialogVisible}
          onDismiss={() => setMoveDialogVisible(false)}
          folders={moveFolders}
          onSelect={(folderId) => {
            setMoveDialogVisible(false)
            handleConfirmMove(folderId)
          }}
        />

        <Modal
          visible={!!dialogInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setDialogInfo(null)}
          statusBarTranslucent
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDialogInfo(null)}>
            <Pressable style={styles.infoDialog} onPress={() => {}}>
              <Text style={styles.infoDialogTitle}>{dialogInfo?.title}</Text>
              <Text style={styles.infoDialogMessage}>{dialogInfo?.message}</Text>
              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setDialogInfo(null)}
                  android_ripple={ripple}
                  style={styles.dialogBtn}
                >
                  <Text
                    style={
                      dialogInfo?.onConfirm
                        ? styles.infoDialogCancelText
                        : styles.infoDialogOkayText
                    }
                  >
                    {dialogInfo?.onConfirm
                      ? t('common.cancel', 'Cancel')
                      : t('pairing.overlay.okay', 'Okay')}
                  </Text>
                </Pressable>
                {dialogInfo?.onConfirm && (
                  <Pressable
                    onPress={() => {
                      dialogInfo.onConfirm!()
                      setDialogInfo(null)
                    }}
                    android_ripple={ripple}
                    style={styles.dialogBtn}
                  >
                    <Text
                      style={
                        dialogInfo.isDestructive
                          ? styles.infoDialogConfirmTextDestructive
                          : styles.infoDialogConfirmTextInfo
                      }
                    >
                      {dialogInfo.confirmText ?? t('common.confirm', 'Confirm')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </Animated.View>

      <SharedItemsTray
        isNoteOpen={isOpen}
        canAddToNote={canAddSharedItems}
        bottom={sharedTrayBottom}
        onAddToNote={handleAddSharedItems}
      />

      <BottomActionSheet
        visible={moreSheetVisible}
        onDismiss={() => setMoreSheetVisible(false)}
        title={titleRef.current || t('noteCard.untitled')}
        subtitle={t('noteCard.actions.options')}
        actions={moreSheetActions}
      />

      <BottomActionSheet
        visible={imageSheetVisible}
        onDismiss={() => setImageSheetVisible(false)}
        title={t('noteEditor.menu.image')}
        actions={[
          {
            icon: 'download-outline',
            label: t('noteEditor.menu.download', 'Download'),
            onPress: handleImageMenuDownload,
          },
          {
            icon: 'share-variant-outline',
            label: t('noteCard.actions.share'),
            onPress: handleImageMenuShare,
          },
          ...(extractTextReady
            ? [
                {
                  icon: 'text-recognition',
                  label: t('localAi.extractText.menuLabel'),
                  onPress: handleImageMenuExtractText,
                },
              ]
            : []),
          {
            icon: 'delete-outline',
            label: t('noteCard.actions.delete'),
            onPress: handleImageMenuDelete,
            destructive: true,
          },
        ]}
      />

      <BottomActionSheet
        visible={attachmentSheetVisible2}
        onDismiss={() => setAttachmentSheetVisible2(false)}
        title={selectedAttachmentFileName || t('noteEditor.menu.attachment')}
        actions={[
          {
            icon: 'download-outline',
            label: t('noteEditor.menu.download', 'Download'),
            onPress: handleAttachmentMenuDownload,
          },
          {
            icon: 'share-variant-outline',
            label: t('noteCard.actions.share'),
            onPress: handleAttachmentMenuShare,
          },
          ...(transcribeReady && isAudioFile(selectedAttachmentFileName ?? undefined)
            ? [
                {
                  icon: 'text-box-outline',
                  label: t('localAi.transcribe.menuLabel'),
                  onPress: handleAttachmentMenuTranscribe,
                },
              ]
            : []),
          ...(extractTextReady && isPdfAttachment(selectedAttachmentFileName)
            ? [
                {
                  icon: 'text-recognition',
                  label: t('localAi.extractText.menuLabel'),
                  onPress: handleAttachmentMenuExtractText,
                },
              ]
            : []),
          {
            icon: 'delete-outline',
            label: t('noteCard.actions.delete'),
            onPress: handleAttachmentMenuDelete,
            destructive: true,
          },
        ]}
      />

      {!!noteId && (
        <NoteHistoryModal
          visible={historyVisible}
          noteId={noteId}
          onClose={handleCloseNoteHistory}
        />
      )}

      {recorderEverOpened && (
        <AudioRecorderModal
          visible={isRecorderVisible}
          transcriptAvailable={transcribeReady}
          onDone={handleRecorderDone}
          onCancel={() => setIsRecorderVisible(false)}
        />
      )}

      {LOCAL_AI_ENABLED && (
        <VoiceTypingSheet
          visible={voiceSheetVisible}
          mode={voiceMode}
          sourceUri={voiceSourceUri}
          insertBlocked={hasNoteConflict}
          onInsert={handleInsertVoiceText}
          onClose={handleCloseVoiceSheet}
        />
      )}
    </NoteEditorContext.Provider>
  )
}

const useProviderHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as any
  const { width } = Dimensions.get('window')
  const styles = StyleSheet.create({
    animatedView: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.background,
    },
    lockOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 15,
      backgroundColor: c.background,
    },
    headerFade: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: insets.top + EDITOR_HEADER_HEIGHT,
      zIndex: 18,
    },
    bottomFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: insets.bottom + UI_SIZE_20,
      zIndex: 5,
    },
    floatingLeft: {
      position: 'absolute',
      left: UI_SIZE_12,
      top: insets.top + UI_SIZE_8,
      zIndex: 20,
    },
    floatingRight: {
      position: 'absolute',
      right: UI_SIZE_12,
      top: insets.top + UI_SIZE_8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      zIndex: 20,
    },
    floatingIconBtn: {
      overflow: 'hidden',
      width: 38,
      height: 38,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(
        c.surfaceContainerHighest ?? c.surfaceVariant,
        md3.dark ? 0.82 : 0.92,
      ),
      borderColor: md3.dark ? c.transparent : hexWithAlpha(c.outline, 0.5),
    },
    saveBtn: {
      width: 38,
      height: 38,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primaryContainer,
    },
    uploadBanner: {
      position: 'absolute',
      left: UI_SIZE_20,
      right: UI_SIZE_20,
      zIndex: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scannerOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoDialog: {
      backgroundColor: c.surfaceContainerHighest,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_24,
      width: Math.min(width - 48, 400),
      elevation: 6,
    },
    infoDialogTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginBottom: UI_SIZE_16,
    },
    infoDialogMessage: {
      color: c.onSurfaceVariant,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
    },
    infoDialogCancelText: {
      color: c.onSurfaceVariant,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
    },
    infoDialogConfirmTextInfo: {
      color: c.primary,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
    },
    infoDialogConfirmTextDestructive: {
      color: c.error,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
    },
    infoDialogOkayText: {
      color: c.primary,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: UI_SIZE_16,
      gap: UI_SIZE_4,
    },
    dialogBtn: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
    },
  })
  return styles
}, useProviderHooks)
