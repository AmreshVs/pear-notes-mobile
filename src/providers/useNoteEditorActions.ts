import { useCallback } from 'react'
import { Image, Keyboard } from 'react-native'
import { useDispatch } from 'react-redux'
import type { DocumentPickerAsset } from 'expo-document-picker'
import type { ImagePickerAsset } from 'expo-image-picker'

import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { setEditorContent, setEditorTitle } from '@pear-notes/core/store/slices/editorSlice.js'
import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics'
import {
  CameraPermissionDeniedError,
  copyVideoToUploadCache,
  deleteAttachment,
  deleteCachedAsset,
  pickDocuments,
  pickImagesFromLibrary,
  scanDocument,
  takePhotoFromCamera,
  takeVideoFromCamera,
  toBackendPath,
} from '@/lib/noteAttachmentManager'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { runNoteUpload } from '@/lib/noteUploadManager'
import { createScanPdf, getPdfThumbnail, PDF_MIME_TYPE } from '@/lib/pdfTools'
import {
  clearNoteUploadQueue,
  enqueueNoteUploads,
  isNoteUploadItemCancelled,
} from '@/lib/uploadRegistry'
import { isImageFile } from '@/utils/media'

import type { useNoteEditor } from './useNoteEditor'

const IMAGE_MAX_HEIGHT = 400
const IMAGE_WIDTH_INSET = 40
const SCROLL_TO_END_DELAY = 300

let uploadItemSequence = 0
const nextUploadItemId = () => `upload-${Date.now()}-${(uploadItemSequence += 1)}`

const getAssetDisplayName = (
  asset: { fileName?: string | null; name?: string },
  fallback: string,
) => asset.fileName || (asset as { name?: string }).name || fallback

export type NoteEditorActionLabels = {
  photo: string
  file: string
  audio: string
  scannedDoc: string
  uploadFailedVideo: string
  uploadFailedScan: string
  unlockReason: string
  lockReason: string
  pageCountLabel: (count: number) => string
}

export type NoteEditorActionOptions = {
  editor: ReturnType<typeof useNoteEditor>
  lockMethod?: string
  screenWidth: number
  recordingFileNamePrefix: string
  labels: NoteEditorActionLabels
  onUploadError: (message: string) => void
  onCameraPermissionDenied: () => void
  deleteUploadCache: (cacheUri: string) => Promise<void>
  onBeforeToggleLock?: () => void
}

export function useNoteEditorActions({
  editor,
  lockMethod,
  screenWidth,
  recordingFileNamePrefix,
  labels,
  onUploadError,
  onCameraPermissionDenied,
  deleteUploadCache,
  onBeforeToggleLock,
}: NoteEditorActionOptions) {
  const dispatch = useDispatch()
  const {
    editorRef,
    noteId,
    noteData,
    setIsEditing,
    setIsRecorderVisible,
    loadedNoteRef,
    titleRef,
    noteContentRef,
    resolveHyperdriveUrl,
  } = editor

  const fitImage = useCallback(
    (width: number, height: number) => {
      const maxWidth = screenWidth - IMAGE_WIDTH_INSET
      let finalWidth = width
      let finalHeight = height
      if (width > maxWidth) {
        const ratio = maxWidth / width
        finalWidth = maxWidth
        finalHeight = height * ratio
      }
      if (finalHeight > IMAGE_MAX_HEIGHT) {
        const ratio = IMAGE_MAX_HEIGHT / finalHeight
        finalHeight = IMAGE_MAX_HEIGHT
        finalWidth = finalWidth * ratio
      }
      return { finalWidth, finalHeight }
    },
    [screenWidth],
  )

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
      dispatch(setEditorContent({ html: finalHtml, text: '' } as any))
      dispatch(
        updateNote({
          key: noteId,
          title: titleRef.current,
          note: finalHtml,
          fromEditor: true,
        } as any),
      )
    },
    [dispatch, noteId, resolveHyperdriveUrl, noteContentRef, titleRef],
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (titleRef.current === newTitle) return
      titleRef.current = newTitle
      if (!noteId || noteId === 'new') return
      dispatch(setEditorTitle(newTitle as any))
      dispatch(
        updateNote({
          key: noteId,
          title: newTitle,
          note: noteContentRef.current,
          fromEditor: true,
        } as any),
      )
    },
    [dispatch, noteId, titleRef, noteContentRef],
  )

  const processMediaAsset = useCallback(
    async (asset: ImagePickerAsset, itemId: string) => {
      if (!noteId || isNoteUploadItemCancelled(itemId)) return
      const targetNoteId = noteId

      if (asset.type === 'video') {
        const displayName = asset.fileName || `video-${Date.now()}.mp4`
        const mimeType = asset.mimeType || 'video/mp4'
        let prepared
        try {
          prepared = await copyVideoToUploadCache(asset.uri, displayName)
        } catch {
          onUploadError(labels.uploadFailedVideo)
          return
        }
        try {
          await runNoteUpload({
            noteId: targetNoteId,
            itemId,
            path: prepared.path,
            fileName: displayName,
            displayName,
            attachment: { type: 'file', fileSize: prepared.size, fileType: mimeType },
            insertLive: (link) => {
              editorRef.current?.insertFileAttachment(link, displayName, prepared.size, mimeType)
              setTimeout(() => editorRef.current?.scrollToEnd(), SCROLL_TO_END_DELAY)
            },
            resolveLink: resolveHyperdriveUrl,
            isNoteOpen: () => loadedNoteRef.current === targetNoteId,
            onError: () => onUploadError(labels.uploadFailedVideo),
          })
        } finally {
          await deleteUploadCache(prepared.cacheUri)
          await deleteCachedAsset(asset.uri)
        }
        return
      }

      const { uri, width: assetWidth, height: assetHeight, fileName } = asset
      const displayName = fileName || labels.photo
      const { finalWidth, finalHeight } = fitImage(assetWidth, assetHeight)

      try {
        await runNoteUpload({
          noteId: targetNoteId,
          itemId,
          path: toBackendPath(uri),
          fileName: fileName || `image-${Date.now()}.jpg`,
          displayName,
          attachment: { type: 'image', width: finalWidth, height: finalHeight },
          insertLive: (link) => {
            editorRef.current?.insertImage(link, finalWidth, finalHeight)
            setTimeout(() => editorRef.current?.scrollToEnd(), SCROLL_TO_END_DELAY)
          },
          resolveLink: resolveHyperdriveUrl,
          isNoteOpen: () => loadedNoteRef.current === targetNoteId,
        })
      } finally {
        await deleteCachedAsset(uri)
      }
    },
    [
      noteId,
      resolveHyperdriveUrl,
      editorRef,
      loadedNoteRef,
      labels,
      onUploadError,
      deleteUploadCache,
      fitImage,
    ],
  )

  const processDocumentAsset = useCallback(
    async (asset: DocumentPickerAsset, itemId: string) => {
      if (!noteId || isNoteUploadItemCancelled(itemId)) return
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
          await processMediaAsset(
            {
              type: 'image',
              uri,
              width: dimensions.width,
              height: dimensions.height,
              fileName: name,
              mimeType,
            } as ImagePickerAsset,
            itemId,
          )
        }
        return
      }

      const isAudio = mimeType?.startsWith('audio/')
      const displayName = name || labels.file
      try {
        await runNoteUpload({
          noteId: targetNoteId,
          itemId,
          path: toBackendPath(uri),
          fileName: name || `file-${Date.now()}`,
          displayName,
          attachment: isAudio
            ? { type: 'audio' }
            : { type: 'file', fileSize: size || 0, fileType: mimeType || '' },
          insertLive: (link) => {
            if (isAudio) {
              editorRef.current?.insertAudioAttachment(link, name || labels.audio)
            } else {
              editorRef.current?.insertFileAttachment(
                link,
                name || labels.file,
                size || 0,
                mimeType || '',
              )
            }
            setTimeout(() => editorRef.current?.scrollToEnd(), SCROLL_TO_END_DELAY)
          },
          resolveLink: resolveHyperdriveUrl,
          isNoteOpen: () => loadedNoteRef.current === targetNoteId,
        })
      } finally {
        await deleteCachedAsset(uri)
      }
    },
    [noteId, resolveHyperdriveUrl, processMediaAsset, editorRef, loadedNoteRef, labels],
  )

  const handlePickImage = useCallback(async () => {
    hapticMedium()
    const assets = await pickImagesFromLibrary()
    if (!assets || !noteId) return
    const queued = assets.map((asset) => ({
      id: nextUploadItemId(),
      fileName: getAssetDisplayName(asset, labels.photo),
      asset,
    }))
    enqueueNoteUploads(noteId, queued)
    for (const entry of queued) {
      await processMediaAsset(entry.asset, entry.id)
    }
    clearNoteUploadQueue(noteId)
  }, [processMediaAsset, noteId, labels])

  const handleTakePhoto = useCallback(async () => {
    hapticMedium()
    try {
      const asset = await takePhotoFromCamera()
      if (asset && noteId) {
        const itemId = nextUploadItemId()
        enqueueNoteUploads(noteId, [
          { id: itemId, fileName: getAssetDisplayName(asset, labels.photo) },
        ])
        await processMediaAsset(asset, itemId)
        clearNoteUploadQueue(noteId)
      }
    } catch (e) {
      if (e instanceof CameraPermissionDeniedError) onCameraPermissionDenied()
    }
  }, [processMediaAsset, onCameraPermissionDenied, noteId, labels])

  const handleTakeVideo = useCallback(async () => {
    hapticMedium()
    try {
      const asset = await takeVideoFromCamera()
      if (asset && noteId) {
        const itemId = nextUploadItemId()
        enqueueNoteUploads(noteId, [
          { id: itemId, fileName: getAssetDisplayName(asset, labels.photo) },
        ])
        await processMediaAsset(asset, itemId)
        clearNoteUploadQueue(noteId)
      }
    } catch (e) {
      if (e instanceof CameraPermissionDeniedError) onCameraPermissionDenied()
    }
  }, [processMediaAsset, onCameraPermissionDenied, noteId, labels])

  const handlePickFile = useCallback(async () => {
    hapticMedium()
    const assets = await pickDocuments()
    if (!assets || !noteId) return
    const queued = assets.map((asset) => ({
      id: nextUploadItemId(),
      fileName: getAssetDisplayName(asset, labels.file),
      asset,
    }))
    enqueueNoteUploads(noteId, queued)
    for (const entry of queued) {
      await processDocumentAsset(entry.asset, entry.id)
    }
    clearNoteUploadQueue(noteId)
  }, [processDocumentAsset, noteId, labels])

  const handleScanDocument = useCallback(async () => {
    hapticMedium()
    if (!noteId) return
    const targetNoteId = noteId
    try {
      const scannedImages = await scanDocument()
      if (!scannedImages) return

      const itemId = nextUploadItemId()
      enqueueNoteUploads(targetNoteId, [{ id: itemId, fileName: labels.scannedDoc }])

      let pdf
      try {
        pdf = await createScanPdf(scannedImages, labels.scannedDoc)
      } finally {
        for (const uri of scannedImages) await deleteCachedAsset(uri)
      }

      if (isNoteUploadItemCancelled(itemId)) {
        await deleteCachedAsset(pdf.uri)
        clearNoteUploadQueue(targetNoteId)
        return
      }

      try {
        await runNoteUpload({
          noteId: targetNoteId,
          itemId,
          path: pdf.path,
          fileName: pdf.fileName,
          displayName: labels.scannedDoc,
          attachment: { type: 'file', fileSize: pdf.fileSize, fileType: PDF_MIME_TYPE },
          insertLive: (link) => {
            editorRef.current?.insertFileAttachment(link, pdf.fileName, pdf.fileSize, PDF_MIME_TYPE)
            setTimeout(() => editorRef.current?.scrollToEnd(), SCROLL_TO_END_DELAY)
          },
          resolveLink: resolveHyperdriveUrl,
          isNoteOpen: () => loadedNoteRef.current === targetNoteId,
          onError: () => onUploadError(labels.uploadFailedScan),
        })
      } finally {
        await deleteCachedAsset(pdf.uri)
      }
      clearNoteUploadQueue(targetNoteId)
    } catch {
      clearNoteUploadQueue(targetNoteId)
      onUploadError(labels.uploadFailedScan)
    }
  }, [noteId, resolveHyperdriveUrl, editorRef, loadedNoteRef, labels, onUploadError])

  const handleRequestPdfThumbnail = useCallback(
    async (url: string, fileName: string, attachmentId: string) => {
      try {
        const thumbnail = await getPdfThumbnail(resolveHyperdriveUrl(url), fileName)
        if (!thumbnail) return
        editorRef.current?.setAttachmentThumbnail(
          url,
          thumbnail.dataUri,
          thumbnail.pageCount,
          labels.pageCountLabel(thumbnail.pageCount),
          attachmentId,
        )
      } catch {}
    },
    [editorRef, labels, resolveHyperdriveUrl],
  )

  const handleRecordingDone = useCallback(
    async (uri: string, _durationMs: number) => {
      setIsRecorderVisible(false)
      if (!noteId) return
      const targetNoteId = noteId
      const fileName = `${recordingFileNamePrefix}-${Date.now()}.m4a`
      const itemId = nextUploadItemId()
      enqueueNoteUploads(targetNoteId, [{ id: itemId, fileName }])
      try {
        await runNoteUpload({
          noteId: targetNoteId,
          itemId,
          path: toBackendPath(uri),
          fileName,
          displayName: fileName,
          attachment: { type: 'audio' },
          insertLive: (link) => {
            editorRef.current?.insertAudioAttachment(link, fileName)
            setTimeout(() => editorRef.current?.scrollToEnd(), SCROLL_TO_END_DELAY)
          },
          resolveLink: resolveHyperdriveUrl,
          isNoteOpen: () => loadedNoteRef.current === targetNoteId,
        })
      } finally {
        await deleteCachedAsset(uri)
      }
      clearNoteUploadQueue(targetNoteId)
    },
    [
      noteId,
      resolveHyperdriveUrl,
      setIsRecorderVisible,
      recordingFileNamePrefix,
      editorRef,
      loadedNoteRef,
    ],
  )

  const handleMoveNote = useCallback(
    (folderId: string) => {
      if (!noteId) return
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
      hapticSuccess()
    },
    [noteId, dispatch],
  )

  const handleTogglePin = useCallback(() => {
    if (!noteId) return
    dispatch(updateNote({ key: noteId, pinned: !noteData?.pinned } as any))
    hapticLight()
  }, [noteId, noteData?.pinned, dispatch])

  const handleDeleteAttachment = useCallback(
    async (url: string) => {
      if (!noteId || !url) return
      try {
        await deleteAttachment(noteId, url)
      } catch {}
    },
    [noteId],
  )

  const handleDone = useCallback(async () => {
    await editorRef.current?.save()
    editorRef.current?.blur()
    Keyboard.dismiss()
    setIsEditing(false)
    hapticLight()
  }, [setIsEditing, editorRef])

  const handleToggleLock = useCallback(() => {
    if (!noteId) return
    onBeforeToggleLock?.()
    toggleNoteLock({
      key: noteId,
      currentlyLocked: !!noteData?.locked,
      reason: labels.unlockReason,
      lockReason: labels.lockReason,
      dispatch,
      lockMethod,
    })
  }, [noteId, noteData?.locked, dispatch, lockMethod, labels, onBeforeToggleLock])

  return {
    handleUpdate,
    handleTitleChange,
    handlePickImage,
    handleTakePhoto,
    handleTakeVideo,
    handlePickFile,
    handleScanDocument,
    handleRequestPdfThumbnail,
    handleRecordingDone,
    handleMoveNote,
    handleTogglePin,
    handleDeleteAttachment,
    handleDone,
    handleToggleLock,
  }
}
