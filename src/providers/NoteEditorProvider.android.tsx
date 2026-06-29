import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { deleteNote, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import * as Haptics from 'expo-haptics'
import type { ImagePickerAsset } from 'expo-image-picker'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { AudioRecorderModal } from '../components/AudioRecorderModal'
import { isImageFile } from '../utils/media'

import { useToast } from './ToastProvider'
import { useNoteEditor } from './useNoteEditor'

import { AttachmentSheet } from '@/components/android/AttachmentSheet'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { EditorToolbar } from '@/components/android/EditorToolbar'
import { FolderPickerSheet } from '@/components/android/FolderPickerSheet'
import { UploadBanner } from '@/components/android/UploadBanner'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { TiptapEditor } from '@/components/TiptapEditor'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_4,
  UI_SIZE_42,
  UI_SIZE_6,
  UI_SIZE_72,
  UI_SIZE_8,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import {
  copyFileToSAF,
  deleteAttachment,
  downloadToCache,
  pickDocument,
  pickImageFromLibrary,
  scanDocument,
  shareMessage,
  takePhotoFromCamera,
  takeVideoFromCamera,
  uploadDocumentFile,
  uploadImage,
  uploadRecording,
  uploadVideo,
} from '@/lib/noteAttachmentManager'
import { NoteEditorContext } from '@/providers/NoteEditorContext'
import { parseNoteAttachmentsAndText } from '@/utils/noteParser'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
}

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const styles = useStyles()
  const { width } = Dimensions.get('window')
  const { showToast } = useToast()

  const {
    editorRef,
    noteId,
    isOpen,
    isEditing,
    setIsEditing,
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
    setIsRecorderVisible,
    recorderEverOpened,
    setRecorderEverOpened,
    dialogInfo,
    setDialogInfo,
    slideAnim,
    titleRef,
    noteContentRef,
    isLoadingNoteRef,
    moveFolders,
    resetEditorState,
    closeNote,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
  } = useNoteEditor()

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
      if (isLoadingNoteRef.current) {
        isLoadingNoteRef.current = false
        noteContentRef.current = finalHtml
        return
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
      if (asset.type === 'video') {
        const displayName = asset.fileName || `video-${Date.now()}.mp4`
        setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.preparing') })
        try {
          const { link, size } = await uploadVideo(noteId!, asset.uri, displayName)
          if (link) {
            const resolvedLink = resolveHyperdriveUrl(link)
            editorRef.current?.insertFileAttachment(
              resolvedLink,
              displayName,
              size,
              asset.mimeType || 'video/mp4',
            )
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          }
        } catch {
          showToast(t('noteEditor.upload.failedVideo'))
        } finally {
          setUploadInfo(null)
        }
        return
      }

      const { uri, width: assetWidth, height: assetHeight, fileName } = asset
      const displayName = fileName || t('noteEditor.upload.photo')
      setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.processing') })
      const maxWidth = width - 40
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
      try {
        setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.uploading') })
        const { link } = await uploadImage(noteId!, uri, fileName || `image-${Date.now()}.jpg`)
        if (link) {
          const resolvedLink = resolveHyperdriveUrl(link)
          editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      } catch {
      } finally {
        setUploadInfo(null)
      }
    },
    [noteId, resolveHyperdriveUrl, setUploadInfo, showToast, t, width],
  )

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const asset = await pickImageFromLibrary()
    if (asset) {
      await processMediaAsset(asset)
    }
  }, [processMediaAsset])

  const handleTakePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const asset = await takePhotoFromCamera()
    if (asset) {
      await processMediaAsset(asset)
    }
  }, [processMediaAsset])

  const handleTakeVideo = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const asset = await takeVideoFromCamera()
    if (asset) {
      await processMediaAsset(asset)
    }
  }, [processMediaAsset])

  const handleScanDocument = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const scannedImages = await scanDocument()
      if (!scannedImages) return
      const maxWidth = width - 40
      const maxHeight = 400
      for (let i = 0; i < scannedImages.length; i++) {
        const uri = scannedImages[i]
        const pageLabel =
          scannedImages.length > 1
            ? t('noteEditor.upload.pageCount', { count: i + 1, total: scannedImages.length })
            : t('noteEditor.upload.scannedDoc')
        const displayName = `scan-${Date.now()}-page${i + 1}.jpg`
        setUploadInfo({ fileName: pageLabel, status: t('noteEditor.upload.processing') })
        try {
          const sizePromise = new Promise<{ width: number; height: number }>((resolve, reject) => {
            Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject)
          })
          const { width: imgW, height: imgH } = await sizePromise
          let finalWidth = imgW
          let finalHeight = imgH
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
          setUploadInfo({ fileName: pageLabel, status: t('noteEditor.upload.uploading') })
          const { link } = await uploadDocumentFile(noteId!, uri, displayName)
          if (link) {
            const resolvedLink = resolveHyperdriveUrl(link)
            editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          }
        } catch {}
      }
    } catch {
    } finally {
      setUploadInfo(null)
    }
  }, [noteId, resolveHyperdriveUrl, setUploadInfo, t, width])

  const handlePickFile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const asset = await pickDocument()
    if (!asset) return
    const { uri, name, size, mimeType } = asset
    const displayName = name || t('noteEditor.upload.file')
    const sizeStr = size
      ? size < 1048576
        ? `${(size / 1024).toFixed(0)} KB`
        : `${(size / 1048576).toFixed(1)} MB`
      : ''
    setUploadInfo({
      fileName: displayName,
      status: sizeStr
        ? t('noteEditor.upload.readingWithSize', { size: sizeStr })
        : t('noteEditor.upload.reading'),
    })
    try {
      setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.uploading') })
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
      } else {
        const { link } = await uploadDocumentFile(noteId!, uri, name || `file-${Date.now()}`)
        if (link) {
          const resolvedLink = resolveHyperdriveUrl(link)
          const isAudio = mimeType?.startsWith('audio/')
          if (isAudio) {
            editorRef.current?.insertAudioAttachment(
              resolvedLink,
              name || t('noteEditor.upload.audio'),
            )
          } else {
            editorRef.current?.insertFileAttachment(
              resolvedLink,
              name || t('noteEditor.upload.file'),
              size || 0,
              mimeType || '',
            )
          }
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      }
    } catch {
    } finally {
      setUploadInfo(null)
    }
  }, [noteId, resolveHyperdriveUrl, processMediaAsset, setUploadInfo, t])

  const handleDeleteAttachment = useCallback(async (url: string) => {
    if (!url) return
    try {
      await deleteAttachment(url)
    } catch {}
  }, [])

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
          setUploadInfo({ fileName, status: t('noteCard.actions.downloading', 'Downloading...') })
          const localPath = await downloadToCache(cleanUrl, fileName)
          if (localPath) {
            const ext = fileName.split('.').pop()?.toLowerCase() || ''
            const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              mimeType,
            )
            await copyFileToSAF(localPath, uri)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectedImageSrc(src)
      setImageSheetVisible(true)
    },
    [setSelectedImageSrc, setImageSheetVisible],
  )

  const handleImageMenuDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
    setSelectedImageSrc(null)
  }, [selectedImageSrc, handleDeleteAttachment, setImageSheetVisible, setSelectedImageSrc])

  const handleImageMenuShare = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeShare(src, src.split('/').pop() || 'image.jpg')
  }, [selectedImageSrc, executeShare, setImageSheetVisible, setSelectedImageSrc])

  const handleImageMenuDownload = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeDownload(src, src.split('/').pop() || 'image.jpg')
  }, [selectedImageSrc, executeDownload, setImageSheetVisible, setSelectedImageSrc])

  const handleAttachmentLongPress = useCallback(
    (url: string, fileName: string) => {
      if (!url) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
    const fileName = selectedAttachmentFileName || src.split('/').pop() || 'file'
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
    const fileName = selectedAttachmentFileName || src.split('/').pop() || 'file'
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

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!url) return
      try {
        const cleanUrl = resolveHyperdriveUrl(url)
        const name = fileName || cleanUrl.split('/').pop() || 'file'
        const localPath = await downloadToCache(cleanUrl, name)
        const ExpoNativeShareModule = await import('../../modules/expo-native-share')
        if (localPath) {
          await ExpoNativeShareModule.default.preview({ url: localPath })
        } else {
          await ExpoNativeShareModule.default.preview({ url: cleanUrl })
        }
      } catch {}
    },
    [resolveHyperdriveUrl],
  )

  const handlePreviewAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!isImageFile(fileName) && !url.startsWith('data:image/')) {
        handleOpenAttachment(url, fileName)
        return
      }
      try {
        const cleanUrl = resolveHyperdriveUrl(url)
        const name = fileName || cleanUrl.split('/').pop() || 'image.jpg'
        const localPath = await downloadToCache(cleanUrl, name)
        if (localPath) {
          const ExpoNativeShareModule = await import('../../modules/expo-native-share')
          await ExpoNativeShareModule.default.preview({ url: localPath })
        }
      } catch {}
    },
    [handleOpenAttachment, resolveHyperdriveUrl],
  )

  const handleMoveNote = useCallback(
    (folderId: string) => {
      if (!noteId) return
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    [noteId, dispatch],
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

  const handleRecordingDone = useCallback(
    async (uri: string, _durationMs: number) => {
      setIsRecorderVisible(false)
      const fileName = `voice-note-${Date.now()}.m4a`
      setUploadInfo({ fileName, status: t('noteEditor.upload.uploading') })
      try {
        const { link } = await uploadRecording(noteId!, uri, fileName)
        if (link) {
          const resolvedLink = resolveHyperdriveUrl(link)
          editorRef.current?.insertAudioAttachment(resolvedLink, fileName)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      } catch {
      } finally {
        setUploadInfo(null)
      }
    },
    [noteId, resolveHyperdriveUrl, setUploadInfo, setIsRecorderVisible, t],
  )

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setDialogInfo({
      title: t('noteCard.actions.delete'),
      message: t('noteCard.deleteConfirmation'),
      confirmText: t('noteCard.actions.delete'),
      isDestructive: true,
      onConfirm: () => {
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
    })
  }, [noteId, dispatch, slideAnim, resetEditorState, setDialogInfo, t])

  const moreSheetActions = useMemo(() => {
    const list = []
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
      icon: 'delete-outline',
      label: t('noteCard.actions.delete'),
      onPress: () => {
        setMoreSheetVisible(false)
        handleDeleteNote()
      },
      destructive: true,
    })
    return list
  }, [moveFolders, t, handleDeleteNote, setMoreSheetVisible, setMoveDialogVisible])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSharing(true)
    const title = titleRef.current || t('noteCard.untitled')
    const html = noteContentRef.current || ''
    const { plainText: rawPlainText } = parseNoteAttachmentsAndText(html)
    const message = title ? `${title}\n\n${rawPlainText}` : rawPlainText
    try {
      await shareMessage(message)
    } catch {}
    setIsSharing(false)
  }, [isSharing, setIsSharing, t])

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
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <TiptapEditor
          ref={editorRef}
          initialContent=""
          initialTitle=""
          safeAreaTop={insets.top + 52}
          safeAreaBottom={
            keyboardHeight > 0 ? 42 + 24 + UI_SIZE_72 : insets.bottom + 12 + UI_SIZE_72
          }
          backgroundColor={c.background}
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
        />

        <View style={styles.floatingLeft} pointerEvents="box-none">
          <Pressable
            onPress={closeNote}
            style={({ pressed }) => [styles.floatingIconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_22} color={c.primary} />
          </Pressable>
        </View>

        <View style={styles.floatingRight} pointerEvents="box-none">
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.floatingIconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="export-variant"
              size={UI_ICON_SIZE_20}
              color={c.primary}
            />
          </Pressable>

          <Pressable
            onPress={() => setMoreSheetVisible(true)}
            style={({ pressed }) => [styles.floatingIconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="dots-vertical" size={UI_ICON_SIZE_22} color={c.primary} />
          </Pressable>

          <BottomActionSheet
            visible={moreSheetVisible}
            onDismiss={() => setMoreSheetVisible(false)}
            title={titleRef.current || t('noteCard.untitled')}
            subtitle={t('noteCard.actions.options')}
            actions={moreSheetActions}
          />

          <Pressable
            onPress={() => {
              if (isEditing) {
                handleDone()
              } else {
                setTimeout(() => editorRef.current?.focus(), 100)
              }
            }}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.savePressed]}
          >
            <MaterialCommunityIcons
              name={isEditing ? 'check' : 'pencil-outline'}
              size={UI_ICON_SIZE_20}
              color={c.onPrimaryContainer}
            />
          </Pressable>
        </View>

        <EditorToolbar
          isActive={isActive}
          editorRef={editorRef}
          toolbarBottom={
            keyboardHeight > 0 ? keyboardHeight + UI_SIZE_42 : insets.bottom + UI_SIZE_12
          }
          onAttachPress={() => {
            Keyboard.dismiss()
            editorRef.current?.blur()
            setAttachSheetVisible(true)
          }}
        />

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

        {uploadInfo && (
          <UploadBanner
            fileName={uploadInfo.fileName}
            status={uploadInfo.status}
            style={[
              styles.uploadBanner,
              {
                bottom:
                  (keyboardHeight > 0 ? keyboardHeight + UI_SIZE_42 : insets.bottom + UI_SIZE_12) +
                  UI_SIZE_72,
              },
            ]}
          />
        )}

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
                <Pressable onPress={() => setDialogInfo(null)} style={styles.dialogBtn}>
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
          {
            icon: 'delete-outline',
            label: t('noteCard.actions.delete'),
            onPress: handleAttachmentMenuDelete,
            destructive: true,
          },
        ]}
      />

      {recorderEverOpened && (
        <AudioRecorderModal
          visible={isRecorderVisible}
          onDone={handleRecordingDone}
          onCancel={() => setIsRecorderVisible(false)}
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
      width: 38,
      height: 38,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(
        c.surfaceContainerHighest ?? c.surfaceVariant,
        md3.dark ? 0.82 : 0.92,
      ),
      borderWidth: md3.dark ? 0 : 1,
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
      backgroundColor: c.surfaceContainerHigh,
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
    pressed: {
      opacity: 0.7,
    },
    savePressed: {
      opacity: 0.8,
    },
  })
  return styles
}, useProviderHooks)
