import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { deleteNote, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import type { DocumentPickerAsset } from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import type { ImagePickerAsset } from 'expo-image-picker'
import { SymbolView } from 'expo-symbols'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import ExpoNativeShareModule from '../../modules/expo-native-share'
import { isImageFile } from '../utils/media'

import { useNoteEditor } from './useNoteEditor'

import { AudioRecorderModal } from '@/components/AudioRecorderModal'
import { GlassView } from '@/components/GlassView'
import { EditorToolbar } from '@/components/ios/EditorToolbar'
import { LockedContentShield } from '@/components/LockedContentShield'
import { LockedNoteView } from '@/components/LockedNoteView'
import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { TiptapEditor } from '@/components/TiptapEditor'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_32,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import { useLockedNoteScreenProtection } from '@/hooks/useLockedNoteScreenProtection'
import {
  CameraPermissionDeniedError,
  copyVideoToUploadCache,
  deleteAttachment,
  downloadToCache,
  pickDocuments,
  pickImagesFromLibrary,
  saveImageToPhotos,
  scanDocument,
  shareMessage,
  takePhotoFromCamera,
  takeVideoFromCamera,
  toBackendPath,
} from '@/lib/noteAttachmentManager'
import { isNoteUnlocked, useNoteLockVersion } from '@/lib/noteLock'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { runNoteUpload } from '@/lib/noteUploadManager'
import { showCameraPermissionAlert } from '@/lib/permissionAlerts'
import { useNoteUpload } from '@/lib/uploadRegistry'
import { NoteEditorContext } from '@/providers/NoteEditorContext'
import { parseNoteAttachmentsAndText, resolveAttachmentFilename } from '@/utils/noteParser'

const ExpoUI: any = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const styles = useStyles()
  const { t } = useTranslation()

  const {
    editorRef,
    noteId,
    isOpen,
    isEditing,
    setIsEditing,
    keyboardHeight,
    isSharing,
    setIsSharing,
    loadedNoteRef,
    selectedImageSrc,
    setSelectedImageSrc,
    selectedAttachmentSrc,
    setSelectedAttachmentSrc,
    selectedAttachmentFileName,
    setSelectedAttachmentFileName,
    isRecorderVisible,
    setIsRecorderVisible,
    imageActionRect,
    setImageActionRect,
    isImageActionSheetOpen,
    setIsImageActionSheetOpen,
    attachmentActionRect,
    setAttachmentActionRect,
    isAttachmentActionSheetOpen,
    setIsAttachmentActionSheetOpen,
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
    isEdgeSwipeActive,
    setIsEdgeSwipeActive,
    noteData,
    handleYjsMessage,
  } = useNoteEditor()

  const isPreviewingRef = useRef(false)
  const currentUpload = useNoteUpload(noteId)

  useNoteLockVersion()
  const lockMethod = useSelector(getLockMethod)
  const isNoteLocked = !!noteData?.locked && !!noteId && !isNoteUnlocked(noteId)
  const protectLockedNote = isOpen && !!noteData?.locked
  useLockedNoteScreenProtection(protectLockedNote)

  const handleUpdate = useCallback(
    (html: string) => {
      if (!noteId || noteId === 'new') return
      let finalHtml = html
      if (resolveHyperdriveUrl) {
        finalHtml = finalHtml.replaceAll(
          resolveHyperdriveUrl(HYPERDRIVE_URL_PREFIX),
          HYPERDRIVE_URL_PREFIX,
        )
      }
      if (finalHtml === noteContentRef.current) return
      noteContentRef.current = finalHtml
      dispatch(updateNote({ key: noteId, title: titleRef.current, note: finalHtml } as any))
    },
    [dispatch, noteId, resolveHyperdriveUrl],
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (titleRef.current === newTitle) return
      titleRef.current = newTitle
      if (!noteId || noteId === 'new') return
      dispatch(updateNote({ key: noteId, title: newTitle, note: noteContentRef.current } as any))
    },
    [dispatch, noteId],
  )

  const handleDone = useCallback(async () => {
    await editorRef.current?.save()
    editorRef.current?.blur()
    Keyboard.dismiss()
    setIsEditing(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [setIsEditing])

  const processMediaAsset = useCallback(
    async (asset: ImagePickerAsset) => {
      if (!noteId) return
      const targetNoteId = noteId

      if (asset.type === 'video') {
        const displayName = asset.fileName || `video-${Date.now()}.mp4`
        const mimeType = asset.mimeType || 'video/mp4'
        let prepared
        try {
          prepared = await copyVideoToUploadCache(asset.uri, displayName)
        } catch {
          Alert.alert(t('noteEditor.upload.failedTitle'), t('noteEditor.upload.failedVideo'))
          return
        }
        try {
          await runNoteUpload({
            noteId: targetNoteId,
            path: prepared.path,
            fileName: displayName,
            displayName,
            attachment: { type: 'file', fileSize: prepared.size, fileType: mimeType },
            insertLive: (link) => {
              editorRef.current?.insertFileAttachment(link, displayName, prepared.size, mimeType)
              setTimeout(() => editorRef.current?.scrollToEnd(), 300)
            },
            resolveLink: resolveHyperdriveUrl,
            isNoteOpen: () => loadedNoteRef.current === targetNoteId,
            onError: () =>
              Alert.alert(t('noteEditor.upload.failedTitle'), t('noteEditor.upload.failedVideo')),
          })
        } finally {
          await FileSystem.deleteAsync(prepared.cacheUri, { idempotent: true }).catch(() => {})
        }
        return
      }

      const { uri, width: assetWidth, height: assetHeight, fileName } = asset
      const displayName = fileName || t('noteEditor.upload.photo')
      const maxWidth = Dimensions.get('window').width - 40
      const maxHeight = 400
      let finalWidth = assetWidth
      let finalHeight = assetHeight
      if (assetWidth > maxWidth) {
        const ratio = maxWidth / assetWidth
        finalWidth = maxWidth
        finalHeight = assetHeight * ratio
      }
      if (finalHeight > maxHeight) {
        const ratio = maxHeight / finalHeight
        finalHeight = maxHeight
        finalWidth = finalWidth * ratio
      }

      await runNoteUpload({
        noteId: targetNoteId,
        path: toBackendPath(uri),
        fileName: fileName || `image-${Date.now()}.jpg`,
        displayName,
        attachment: { type: 'image', width: finalWidth, height: finalHeight },
        insertLive: (link) => {
          editorRef.current?.insertImage(link, finalWidth, finalHeight)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        },
        resolveLink: resolveHyperdriveUrl,
        isNoteOpen: () => loadedNoteRef.current === targetNoteId,
      })
    },
    [noteId, resolveHyperdriveUrl, t],
  )

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const assets = await pickImagesFromLibrary()
    if (!assets) return
    for (const asset of assets) {
      await processMediaAsset(asset)
    }
  }, [processMediaAsset])

  const handleTakePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const asset = await takePhotoFromCamera()
      if (asset) {
        await processMediaAsset(asset)
      }
    } catch (e) {
      if (e instanceof CameraPermissionDeniedError) showCameraPermissionAlert(t)
    }
  }, [processMediaAsset, t])

  const handleTakeVideo = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const asset = await takeVideoFromCamera()
      if (asset) {
        await processMediaAsset(asset)
      }
    } catch (e) {
      if (e instanceof CameraPermissionDeniedError) showCameraPermissionAlert(t)
    }
  }, [processMediaAsset, t])

  const handleScanDocument = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!noteId) return
    const targetNoteId = noteId
    try {
      const scannedImages = await scanDocument()
      if (!scannedImages) return
      const maxWidth = Dimensions.get('window').width - 40
      const maxHeight = 400

      for (let i = 0; i < scannedImages.length; i++) {
        const uri = scannedImages[i]
        const displayName =
          scannedImages.length > 1
            ? t('noteEditor.upload.pageCount', { count: i + 1, total: scannedImages.length })
            : t('noteEditor.upload.scannedDoc')
        const fileName = `scan-${Date.now()}-page${i + 1}.jpg`

        let finalWidth = maxWidth
        let finalHeight = maxHeight
        try {
          const { width: imgW, height: imgH } = await new Promise<{
            width: number
            height: number
          }>((resolve, reject) => {
            Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject)
          })
          finalWidth = imgW
          finalHeight = imgH
          if (imgW > maxWidth) {
            const ratio = maxWidth / imgW
            finalWidth = maxWidth
            finalHeight = imgH * ratio
          }
          if (finalHeight > maxHeight) {
            const ratio = maxHeight / finalHeight
            finalHeight = maxHeight
            finalWidth = finalWidth * ratio
          }
        } catch {}

        await runNoteUpload({
          noteId: targetNoteId,
          path: toBackendPath(uri),
          fileName,
          displayName,
          attachment: { type: 'image', width: finalWidth, height: finalHeight },
          insertLive: (link) => {
            editorRef.current?.insertImage(link, finalWidth, finalHeight)
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          },
          resolveLink: resolveHyperdriveUrl,
          isNoteOpen: () => loadedNoteRef.current === targetNoteId,
        })
      }
    } catch {}
  }, [noteId, resolveHyperdriveUrl, t])

  const processDocumentAsset = useCallback(
    async (asset: DocumentPickerAsset) => {
      if (!noteId) return
      const targetNoteId = noteId
      const { uri, name, size, mimeType } = asset

      if (isImageFile(name, mimeType)) {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          Image.getSize(
            uri,
            (w, h) => resolve({ width: w, height: h }),
            () => resolve({ width: 0, height: 0 }),
          )
        })
        if (dimensions.width > 0) {
          await processMediaAsset({
            type: 'image',
            uri,
            width: dimensions.width,
            height: dimensions.height,
            fileName: name,
            mimeType,
          } as ImagePickerAsset)
        }
        return
      }

      const isAudio = mimeType?.startsWith('audio/')
      const displayName = name || t('noteEditor.upload.file')
      await runNoteUpload({
        noteId: targetNoteId,
        path: toBackendPath(uri),
        fileName: name || `file-${Date.now()}`,
        displayName,
        attachment: isAudio
          ? { type: 'audio' }
          : { type: 'file', fileSize: size || 0, fileType: mimeType || '' },
        insertLive: (link) => {
          if (isAudio) {
            editorRef.current?.insertAudioAttachment(link, name || t('noteEditor.upload.audio'))
          } else {
            editorRef.current?.insertFileAttachment(
              link,
              name || t('noteEditor.upload.file'),
              size || 0,
              mimeType || '',
            )
          }
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        },
        resolveLink: resolveHyperdriveUrl,
        isNoteOpen: () => loadedNoteRef.current === targetNoteId,
      })
    },
    [noteId, resolveHyperdriveUrl, processMediaAsset, t],
  )

  const handlePickFile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const assets = await pickDocuments()
    if (!assets) return
    for (const asset of assets) {
      await processDocumentAsset(asset)
    }
  }, [processDocumentAsset])

  const handleRecordAudio = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Keyboard.dismiss()
    editorRef.current?.blur()
    setTimeout(() => setIsRecorderVisible(true), 100)
  }, [setIsRecorderVisible])

  const handleRecordingDone = useCallback(
    async (uri: string, _durationMs: number) => {
      setIsRecorderVisible(false)
      if (!noteId) return
      const targetNoteId = noteId
      const fileName = `recording-${Date.now()}.m4a`
      await runNoteUpload({
        noteId: targetNoteId,
        path: toBackendPath(uri),
        fileName,
        displayName: fileName,
        attachment: { type: 'audio' },
        insertLive: (link) => {
          editorRef.current?.insertAudioAttachment(link, fileName)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        },
        resolveLink: resolveHyperdriveUrl,
        isNoteOpen: () => loadedNoteRef.current === targetNoteId,
      })
    },
    [noteId, resolveHyperdriveUrl, setIsRecorderVisible, t],
  )

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(t('noteCard.actions.delete'), t('noteCard.deleteConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('noteCard.actions.delete'),
        style: 'destructive',
        onPress: () => {
          dispatch(deleteNote(noteId as any))
          const w = Dimensions.get('window').width
          Animated.timing(slideAnim, {
            toValue: w,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            resetEditorState()
          })
        },
      },
    ])
  }, [noteId, dispatch, slideAnim, resetEditorState, t])

  const handleMoveNote = useCallback(
    (folderId: string) => {
      if (!noteId) return
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    [noteId, dispatch],
  )

  const handleShare = useCallback(async () => {
    if (isSharing) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSharing(true)
    const title = titleRef.current || t('noteCard.untitled')
    const html = noteContentRef.current || ''
    const urls: string[] = []

    const processLink = async (link: string, defaultExt: string, tagContent: string) => {
      let cleanLink = link.replace(/&amp;/g, '&')
      if (resolveHyperdriveUrl) {
        cleanLink = resolveHyperdriveUrl(cleanLink)
      }
      try {
        const filename = resolveAttachmentFilename(cleanLink, defaultExt, tagContent)
        const localUri = await downloadToCache(cleanLink, filename)
        urls.push(localUri)
      } catch {}
    }

    const { attachments, plainText: rawPlainText } = parseNoteAttachmentsAndText(html)
    for (const att of attachments) {
      await processLink(att.url, att.defaultExt, att.tag)
    }

    let plainText = rawPlainText
    if (resolveHyperdriveUrl) {
      const serverBase = resolveHyperdriveUrl(HYPERDRIVE_URL_PREFIX)
      const serverRegex = new RegExp(
        `${serverBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`,
        'gi',
      )
      plainText = plainText.replace(serverRegex, '')
    }
    plainText = plainText.replace(new RegExp(`${HYPERDRIVE_URL_PREFIX}[^\\s]*`, 'gi'), '')
    plainText = plainText.replace(/\n{3,}/g, '\n\n').trim()

    const message = title ? `${title}\n\n${plainText}` : plainText
    try {
      await shareMessage(message, urls)
    } catch {
      await Share.share({ title, message })
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

  const handleToggleLock = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    toggleNoteLock({
      key: noteId,
      currentlyLocked: !!noteData?.locked,
      reason: t('noteCard.unlockReason'),
      dispatch,
      lockMethod,
    })
  }, [noteId, noteData?.locked, dispatch, lockMethod, t])

  const handleMoreOptions = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (Platform.OS === 'ios') {
      const lockLabel = noteData?.locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock')
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            t('noteCard.actions.moveTo'),
            lockLabel,
            t('noteCard.actions.delete'),
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (index: number) => {
          if (index === 1) showMoveToSheet()
          else if (index === 2) handleToggleLock()
          else if (index === 3) handleDeleteNote()
        },
      )
    } else {
      handleDeleteNote()
    }
  }, [noteId, noteData?.locked, showMoveToSheet, handleToggleLock, handleDeleteNote, t])

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
          await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
        }
      }
    },
    [t],
  )

  const handlePreviewAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
          await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
        }
      }
    },
    [t],
  )

  const handleDeleteAttachment = useCallback(async (url: string) => {
    if (!url) return
    try {
      await deleteAttachment(url)
    } catch {}
  }, [])

  const handleImageSaveToPhotos = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    try {
      const src = selectedImageSrc
      const fileName = src.startsWith('data:')
        ? `image_${Date.now()}.jpg`
        : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
      await saveImageToPhotos(src, fileName)
    } catch {
      Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
    }
  }, [selectedImageSrc, setIsImageActionSheetOpen, t])

  const handleImageDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    const src = selectedImageSrc
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
  }, [selectedImageSrc, setIsImageActionSheetOpen, handleDeleteAttachment])

  const handleImageLongPress = useCallback(
    (src: string, rect?: { x: number; y: number; width: number; height: number }) => {
      if (!src) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
          slideAnim.stopAnimation()
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isOpen || gestureState.dx <= 0) return
          const width = Dimensions.get('window').width
          slideAnim.setValue(Math.min(gestureState.dx, width))
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isOpen) return
          const width = Dimensions.get('window').width
          const shouldClose = gestureState.dx > width * 0.3 || gestureState.vx > 0.75

          if (shouldClose) {
            closeNote()
            return
          }

          setIsEdgeSwipeActive(false)
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 260,
          }).start()
        },
        onPanResponderTerminate: () => {
          setIsEdgeSwipeActive(false)
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 260,
          }).start()
        },
      }),
    [closeNote, isOpen, slideAnim, setIsEdgeSwipeActive],
  )

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  const toolbarBottom = useMemo(
    () => (keyboardHeight > 0 ? keyboardHeight + 12 : Platform.OS === 'ios' ? 32 : 16),
    [keyboardHeight],
  )

  const lockOverlayStyle = useMemo(
    () => [styles.lockOverlay, { top: insets.top + 52 }],
    [styles.lockOverlay, insets.top],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <>
        <Animated.View
          style={[styles.animatedView, { transform: [{ translateX: slideAnim }] }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          {Platform.OS === 'ios' && isOpen ? (
            <View
              style={styles.edgeSwipeZone}
              pointerEvents="box-only"
              {...edgeSwipeResponder.panHandlers}
            />
          ) : null}

          <View style={[styles.header, { paddingTop: insets.top - 5 }]}>
            <View style={styles.headerRow}>
              <GlassView intensity={40} borderRadius={24} style={styles.headerBtn}>
                <Pressable
                  onPress={closeNote}
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
                <GlassView intensity={40} borderRadius={22} style={styles.headerBtn}>
                  <Pressable
                    onPress={handleDone}
                    style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                  >
                    <SymbolView
                      name="checkmark"
                      size={UI_ICON_SIZE_22}
                      tintColor={colors.text}
                      weight="semibold"
                      fallback={<View />}
                    />
                  </Pressable>
                </GlassView>
              ) : (
                <GlassView intensity={40} borderRadius={24} style={styles.headerPill} isInteractive>
                  <Pressable
                    onPress={handleShare}
                    disabled={isSharing}
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
                            <View style={styles.headerBtnInner}>
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
                        <ExpoUI.Menu
                          label={t('noteCard.actions.moveTo')}
                          systemImage="folder.badge.plus"
                        >
                          {moveFolders.length > 0 ? (
                            moveFolders.map((f: any) => (
                              <ExpoUI.Button
                                key={f.id}
                                label={f.name}
                                systemImage="folder"
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

          <TiptapEditor
            ref={editorRef}
            noteId={noteId ?? 'new'}
            initialContent=""
            initialTitle=""
            safeAreaTop={insets.top + 52}
            safeAreaBottom={0}
            scrollEnabled={!isEdgeSwipeActive}
            onContentChange={handleUpdate}
            onTitleChange={handleTitleChange}
            onStyleStateChange={handleStyleStateChange}
            onEditorFocus={handleEditorFocus}
            onEditorBlur={handleEditorBlur}
            onOpenAttachment={handleOpenAttachment}
            onPreviewAttachment={handlePreviewAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            onImageLongPress={handleImageLongPress}
            onAttachmentLongPress={handleAttachmentLongPress}
            onYjsMessage={handleYjsMessage}
          />

          {isOpen && !isNoteLocked && (
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
            />
          )}

          {isNoteLocked && (
            <View style={lockOverlayStyle}>
              <LockedNoteView noteId={noteId ?? ''} />
            </View>
          )}

          <LockedContentShield active={protectLockedNote} />

          <AudioRecorderModal
            visible={isRecorderVisible}
            onDone={handleRecordingDone}
            onCancel={() => setIsRecorderVisible(false)}
          />

          {currentUpload && (
            <View style={[styles.uploadContainer, { bottom: toolbarBottom + 64 }]}>
              <GlassView intensity={12} borderRadius={16} style={styles.uploadToast} isInteractive>
                <View style={styles.uploadTextWrap}>
                  <View style={styles.uploadHeaderRow}>
                    <Text style={styles.uploadTitle}>{t('noteEditor.upload.uploading')}</Text>
                    <Text style={styles.uploadPercent}>{`${currentUpload.progress}%`}</Text>
                  </View>
                  <Text style={styles.uploadFileName} numberOfLines={1}>
                    {currentUpload.fileName}
                  </Text>
                  <View style={styles.uploadTrack}>
                    <View style={[styles.uploadFill, { width: `${currentUpload.progress}%` }]} />
                  </View>
                </View>
                <Pressable
                  onPress={currentUpload.cancel}
                  hitSlop={8}
                  style={({ pressed }) => [styles.uploadCancel, pressed && styles.pressed]}
                >
                  <SymbolView
                    name="xmark"
                    size={UI_ICON_SIZE_16}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              </GlassView>
            </View>
          )}

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
      </>
    </NoteEditorContext.Provider>
  )
}

const ActionSheetIOS: any = Platform.OS === 'ios' ? require('react-native').ActionSheetIOS : null

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    animatedView: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.background,
    },
    lockOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9,
      backgroundColor: theme.colors.background,
    },
    header: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 10,
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
    uploadContainer: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      alignItems: 'center',
      zIndex: 20,
    },
    uploadToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      overflow: 'hidden',
    },
    uploadTextWrap: {
      flex: 1,
      gap: UI_SIZE_6,
    },
    uploadHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: UI_SIZE_12,
    },
    uploadTitle: {
      flex: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    uploadFileName: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    uploadPercent: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.textSecondary,
    },
    uploadTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    uploadFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
    uploadCancel: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      alignItems: 'center',
      justifyContent: 'center',
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
