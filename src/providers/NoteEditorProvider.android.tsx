import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import {
  ALL_NOTES_KEY,
  HYPERDRIVE_URL_PREFIX,
  RECENTLY_DELETED_KEY,
} from '@pear-notes/core/constant.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { deleteNote, getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import type { ImagePickerAsset } from 'expo-image-picker'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  InteractionManager,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { Divider, Menu } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import ExpoNativeShareModule from '../../modules/expo-native-share'
import { AudioRecorderModal } from '../components/AudioRecorderModal'
import { isImageFile } from '../utils/media'

import { AttachmentSheet } from '@/components/android/AttachmentSheet'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'
import { NoteEditorContext } from '@/providers/NoteEditorContext'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject),
  )

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
}

type ToolbarBtnProps = {
  icon: string
  onPress: () => void
  active?: boolean
  c: ExtendedColors
}

const ToolbarBtn = memo(function ToolbarBtn({ icon, onPress, active, c }: ToolbarBtnProps) {
  const style = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      toolbarStyles.btn,
      active && { backgroundColor: hexWithAlpha(c.primaryContainer, 0.35) },
      pressed && { opacity: 0.5 },
    ],
    [active, c.primaryContainer],
  )
  return (
    <Pressable onPress={onPress} style={style}>
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={active ? c.primary : c.onSurface}
      />
    </Pressable>
  )
})

type EditorToolbarProps = {
  isActive: (key: keyof TiptapStyleState) => boolean
  editorRef: React.RefObject<TiptapEditorHandle | null>
  toolbarBottom: number
  onAttachPress: () => void
  c: ExtendedColors
  isDark: boolean
}

const EditorToolbar = memo(function EditorToolbar({
  isActive,
  editorRef,
  toolbarBottom,
  onAttachPress,
  c,
  isDark,
}: EditorToolbarProps) {
  const run = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }, [])

  const containerStyle = useMemo(
    () => [
      toolbarStyles.container,
      {
        bottom: toolbarBottom,
        backgroundColor: hexWithAlpha(c.surfaceContainerHigh ?? c.surface, 0.98),
        borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.3),
        elevation: 6,
        shadowColor: '#000',
      },
    ],
    [toolbarBottom, isDark, c.surfaceContainerHigh, c.surface, c.outlineVariant],
  )

  const dividerStyle = useMemo(
    () => [toolbarStyles.divider, { backgroundColor: hexWithAlpha(c.outlineVariant, 0.25) }],
    [c.outlineVariant],
  )

  const addBtnStyle = useMemo(
    () => [toolbarStyles.addBtn, { backgroundColor: c.primaryContainer }],
    [c.primaryContainer],
  )

  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={toolbarStyles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        <ToolbarBtn
          icon="checkbox-marked-outline"
          active={isActive('checkboxList')}
          onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
          c={c}
        />
        <View style={dividerStyle} />
        <ToolbarBtn
          icon="format-header-1"
          active={isActive('h1')}
          onPress={() => run(() => editorRef.current?.toggleH1())}
          c={c}
        />
        <ToolbarBtn
          icon="format-header-2"
          active={isActive('h2')}
          onPress={() => run(() => editorRef.current?.toggleH2())}
          c={c}
        />
        <ToolbarBtn
          icon="format-bold"
          active={isActive('bold')}
          onPress={() => run(() => editorRef.current?.toggleBold())}
          c={c}
        />
        <ToolbarBtn
          icon="format-italic"
          active={isActive('italic')}
          onPress={() => run(() => editorRef.current?.toggleItalic())}
          c={c}
        />
        <ToolbarBtn
          icon="format-list-bulleted"
          active={isActive('unorderedList')}
          onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
          c={c}
        />
        <ToolbarBtn
          icon="format-list-numbered"
          active={isActive('orderedList')}
          onPress={() => run(() => editorRef.current?.toggleOrderedList())}
          c={c}
        />
        <ToolbarBtn
          icon="format-quote-close"
          active={isActive('blockQuote')}
          onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
          c={c}
        />
        <ToolbarBtn
          icon="code-tags"
          active={isActive('codeBlock')}
          onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
          c={c}
        />
      </ScrollView>

      <View style={dividerStyle} />

      <Pressable
        onPress={() => run(onAttachPress)}
        style={({ pressed }) => [addBtnStyle, pressed && { opacity: 0.5 }]}
      >
        <MaterialCommunityIcons name="plus" size={24} color={c.onPrimaryContainer} />
      </Pressable>
    </View>
  )
})

type UploadBannerProps = {
  fileName: string
  status: string
  c: ExtendedColors
  style?: StyleProp<ViewStyle>
}

const UploadBanner = memo(function UploadBanner({ fileName, status, c, style }: UploadBannerProps) {
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: c.surfaceContainerHighest ?? c.surface },
        name: { color: c.onSurface },
        status: { color: c.onSurfaceVariant },
      }),
    [c],
  )

  return (
    <View style={[staticStyles.uploadBanner, dynamicStyles.container, style]}>
      <ActivityIndicator size="small" color={c.primary} style={staticStyles.uploadSpinner} />
      <View style={staticStyles.uploadText}>
        <Text style={[staticStyles.uploadName, dynamicStyles.name]} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={[staticStyles.uploadStatus, dynamicStyles.status]}>{status}</Text>
      </View>
    </View>
  )
})

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const editorRef = useRef<TiptapEditorHandle>(null)
  const { width, height } = useWindowDimensions()

  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isSharing, setIsSharing] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<{ fileName: string; status: string } | null>(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [selectedAttachmentSrc, setSelectedAttachmentSrc] = useState<string | null>(null)
  const [selectedAttachmentFileName, setSelectedAttachmentFileName] = useState<string | null>(null)
  const [moreMenuVisible, setMoreMenuVisible] = useState(false)
  const [moveDialogVisible, setMoveDialogVisible] = useState(false)
  const [attachSheetVisible, setAttachSheetVisible] = useState(false)
  const [imageSheetVisible, setImageSheetVisible] = useState(false)
  const [attachmentSheetVisible2, setAttachmentSheetVisible2] = useState(false)
  const [isRecorderVisible, setIsRecorderVisible] = useState(false)
  const [recorderEverOpened, setRecorderEverOpened] = useState(false)
  const [dialogInfo, setDialogInfo] = useState<{
    title: string
    message: string
    onConfirm?: () => void
    confirmText?: string
    isDestructive?: boolean
  } | null>(null)

  const styleStateRef = useRef<TiptapStyleState | null>(null)
  const [styleStateVersion, setStyleStateVersion] = useState(0)
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current
  const isClosingRef = useRef(false)
  const titleRef = useRef<string>('')
  const noteContentRef = useRef<string>('')
  const loadedNoteRef = useRef<string | null>(null)
  const isLoadingNoteRef = useRef(false)
  const isEditorFocusedRef = useRef(false)

  const noteSelector = useMemo(() => getNoteData(noteId ?? ''), [noteId])
  const rawNoteData = useSelector(noteSelector)
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  const allFolders = useSelector(getFolders) as any[]
  const moveFolders = useMemo(
    () =>
      allFolders.filter(
        (f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== RECENTLY_DELETED_KEY,
      ),
    [allFolders],
  )

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isOpen) return
      setKeyboardHeight(e.endCoordinates.height)
      setIsEditing(true)
      setTimeout(() => {
        editorRef.current?.setKeyboardInset(50, true)
      }, 50)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      if (!isOpen) return
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [isOpen])

  useEffect(() => {
    if (!noteId || noteId === loadedNoteRef.current) return
    loadedNoteRef.current = noteId
    titleRef.current = noteData?.title || ''
    noteContentRef.current = noteData?.note || ''

    let content = noteData?.note || ''
    if (hyperdriveServerAddress && content.includes(HYPERDRIVE_URL_PREFIX)) {
      content = content.replaceAll(
        HYPERDRIVE_URL_PREFIX,
        hyperdriveServerAddress.replace(/\/$/, ''),
      )
    }

    editorRef.current?.scrollToTop()
    editorRef.current?.setTitle(noteData?.title || '')

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start()

    isLoadingNoteRef.current = true
    InteractionManager.runAfterInteractions(() => {
      editorRef.current?.setHTML(content)
    })
  }, [noteId, noteData, hyperdriveServerAddress, slideAnim])

  const resetEditorState = useCallback(() => {
    setIsOpen(false)
    setNoteId(null)
    loadedNoteRef.current = null
    isClosingRef.current = false
  }, [])

  const animateClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    const w = Dimensions.get('window').width
    Animated.timing(slideAnim, {
      toValue: w,
      duration: 250,
      useNativeDriver: true,
    }).start(resetEditorState)
  }, [resetEditorState, slideAnim])

  const closeNote = useCallback(() => {
    editorRef.current?.blur()
    Keyboard.dismiss()
    editorRef.current?.save()
    animateClose()
  }, [animateClose])

  const openNote = useCallback((id: string) => {
    Keyboard.dismiss()
    setIsEditing(false)
    editorRef.current?.blur()
    loadedNoteRef.current = null
    setNoteId(id)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setKeyboardHeight(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onBackPress = () => {
      closeNote()
      return true
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => sub.remove()
  }, [isOpen, closeNote])

  const TOOLBAR_HEIGHT = 72

  useEffect(() => {
    const defaultBottom = TOOLBAR_HEIGHT + 16
    const inset = keyboardHeight > 0 ? keyboardHeight + 12 + TOOLBAR_HEIGHT + 16 : defaultBottom
    editorRef.current?.setKeyboardInset(inset, keyboardHeight > 0 && isEditorFocusedRef.current)
  }, [keyboardHeight])

  const handleUpdate = useCallback(
    (html: string) => {
      if (!noteId || noteId === 'new') return
      let finalHtml = html
      if (hyperdriveServerAddress) {
        finalHtml = finalHtml.replaceAll(
          hyperdriveServerAddress.replace(/\/$/, ''),
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
    [dispatch, noteId, hyperdriveServerAddress],
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
  }, [])

  const processMediaAsset = useCallback(
    async (asset: ImagePickerAsset) => {
      if (asset.type === 'video') {
        const displayName = asset.fileName || `video-${Date.now()}.mp4`
        setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.preparing') })
        try {
          const ext = displayName.split('.').pop() || 'mp4'
          const cachePath = `${FileSystem.cacheDirectory}upload-${Date.now()}.${ext}`
          await FileSystem.copyAsync({ from: asset.uri, to: cachePath })
          const info = await FileSystem.getInfoAsync(cachePath)
          const fileSize = (info as any).size || 0
          const sizeStr = fileSize
            ? fileSize < 1048576
              ? `${(fileSize / 1024).toFixed(0)} KB`
              : `${(fileSize / 1048576).toFixed(1)} MB`
            : ''
          setUploadInfo({
            fileName: displayName,
            status: sizeStr
              ? t('noteEditor.upload.readingWithSize', { size: sizeStr })
              : t('noteEditor.upload.reading'),
          })
          const { link } = await backendApi.insertFile({
            key: noteId!,
            fileName: displayName,
            path: decodeURIComponent(cachePath.replace('file://', '')),
          } as any)
          if (link) {
            const resolvedLink = resolveHyperdriveUrl(link)
            editorRef.current?.insertFileAttachment(
              resolvedLink,
              displayName,
              fileSize,
              asset.mimeType || 'video/mp4',
            )
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          }
          await FileSystem.deleteAsync(cachePath, { idempotent: true })
        } catch {
          setDialogInfo({
            title: t('noteEditor.upload.failedTitle'),
            message: t('noteEditor.upload.failedVideo'),
          })
        } finally {
          setUploadInfo(null)
        }
        return
      }

      const { uri, width, height, fileName } = asset
      const displayName = fileName || t('noteEditor.upload.photo')
      setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.processing') })
      const screenW = Dimensions.get('window').width
      const maxWidth = screenW - 40
      const maxHeight = 400
      let finalWidth = width
      let finalHeight = height
      if (width > maxWidth) {
        const ratio = maxWidth / width
        finalWidth = maxWidth
        finalHeight = height * ratio
      }
      if (finalHeight > maxHeight) {
        const ratio = maxHeight / finalHeight
        finalHeight = maxHeight
        finalWidth = finalWidth * ratio
      }
      try {
        setUploadInfo({ fileName: displayName, status: t('noteEditor.upload.uploading') })
        const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
        const buffer = Buffer.from(base64Data, 'base64')
        const { link } = await backendApi.insertFile({
          key: noteId!,
          fileName: fileName || `image-${Date.now()}.jpg`,
          buffer,
        } as any)
        if (link) {
          const resolvedLink = resolveHyperdriveUrl(link)
          editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      } catch {
        // silently skip on upload error
      } finally {
        setUploadInfo(null)
      }
    },
    [noteId, hyperdriveServerAddress, t],
  )

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const ImagePicker = await import('expo-image-picker')
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return
    await processMediaAsset(result.assets[0])
  }, [processMediaAsset])

  const handleTakePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const ImagePicker = await import('expo-image-picker')
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return
    await processMediaAsset(result.assets[0])
  }, [processMediaAsset])

  const handleTakeVideo = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const ImagePicker = await import('expo-image-picker')
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return
    await processMediaAsset(result.assets[0])
  }, [processMediaAsset])

  const handleScanDocument = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const { default: DocumentScanner, ScanDocumentResponseStatus } =
        await import('react-native-document-scanner-plugin')
      const { scannedImages, status } = await DocumentScanner.scanDocument()
      if (status !== ScanDocumentResponseStatus.Success || !scannedImages?.length) return
      const screenW = Dimensions.get('window').width
      const maxWidth = screenW - 40
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
          const { width, height } = await getImageSize(uri)
          let finalWidth = width
          let finalHeight = height
          if (width > maxWidth) {
            const ratio = maxWidth / width
            finalWidth = maxWidth
            finalHeight = height * ratio
          }
          if (finalHeight > maxHeight) {
            const ratio = maxHeight / finalHeight
            finalHeight = maxHeight
            finalWidth = finalWidth * ratio
          }
          setUploadInfo({ fileName: pageLabel, status: t('noteEditor.upload.uploading') })
          const { link } = await backendApi.insertFile({
            key: noteId!,
            fileName: displayName,
            path: decodeURIComponent(uri.replace('file://', '')),
          } as any)
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
  }, [noteId, hyperdriveServerAddress, t])

  const handlePickFile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const DocumentPicker = await import('expo-document-picker')
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled || !result.assets?.[0]) return
    const { uri, name, size, mimeType } = result.assets[0]
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
        const { link } = await backendApi.insertFile({
          key: noteId!,
          fileName: name || `file-${Date.now()}`,
          path: decodeURIComponent(uri.replace('file://', '')),
        } as any)
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
  }, [noteId, hyperdriveServerAddress, processMediaAsset, t])

  const handleDeleteAttachment = useCallback(async (url: string) => {
    if (!url) return
    try {
      if (url.startsWith(HYPERDRIVE_URL_PREFIX)) {
        const key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
        await backendApi.deleteFile(key)
      }
    } catch {}
  }, [])

  const downloadToCache = useCallback(
    async (url: string, fileName: string): Promise<string | null> => {
      try {
        const ext = fileName.split('.').pop() || 'bin'
        const dest = `${FileSystem.cacheDirectory}share-${Date.now()}.${ext}`
        const { uri } = await FileSystem.downloadAsync(url, dest)
        return uri
      } catch {
        return null
      }
    },
    [],
  )

  const resolveHyperdriveUrl = useCallback(
    (url: string) => {
      if (hyperdriveServerAddress && url.includes(HYPERDRIVE_URL_PREFIX)) {
        return url.replace(HYPERDRIVE_URL_PREFIX, hyperdriveServerAddress.replace(/\/$/, ''))
      }
      return url
    },
    [hyperdriveServerAddress],
  )

  const executeShare = useCallback(
    async (src: string, fileName: string) => {
      try {
        const cleanUrl = resolveHyperdriveUrl(src)
        const localPath = await downloadToCache(cleanUrl, fileName)
        if (localPath) {
          await ExpoNativeShareModule.share({ message: '', urls: [localPath] })
        } else {
          await ExpoNativeShareModule.share({ message: cleanUrl, urls: [] })
        }
      } catch {}
    },
    [resolveHyperdriveUrl, downloadToCache],
  )

  const executeDownload = useCallback(
    async (src: string, fileName: string) => {
      try {
        const cleanUrl = resolveHyperdriveUrl(src)
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

            await ExpoNativeShareModule.copyFile({ sourceUri: localPath, destUri: uri })

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setDialogInfo({
              title: t('common.success', 'Success'),
              message: t('noteCard.downloadComplete', 'File downloaded successfully.'),
            })
          } else {
            setDialogInfo({
              title: t('common.error', 'Error'),
              message: t('noteEditor.upload.failedDownload', 'Could not download the file.'),
            })
          }
        }
      } catch (e) {
        setDialogInfo({ title: t('common.error', 'Error'), message: String(e) })
      } finally {
        setUploadInfo(null)
      }
    },
    [resolveHyperdriveUrl, downloadToCache, t],
  )

  const handleImageLongPress = useCallback(
    (src: string, _rect?: { x: number; y: number; width: number; height: number }) => {
      if (!src) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectedImageSrc(src)
      setImageSheetVisible(true)
    },
    [],
  )

  const handleImageMenuDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
    setSelectedImageSrc(null)
  }, [selectedImageSrc, handleDeleteAttachment])

  const handleImageMenuShare = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeShare(src, src.split('/').pop() || 'image.jpg')
  }, [selectedImageSrc, executeShare])

  const handleImageMenuDownload = useCallback(async () => {
    if (!selectedImageSrc) return
    setImageSheetVisible(false)
    const src = selectedImageSrc
    setSelectedImageSrc(null)
    await executeDownload(src, src.split('/').pop() || 'image.jpg')
  }, [selectedImageSrc, executeDownload])

  const handleAttachmentLongPress = useCallback(
    (
      url: string,
      fileName: string,
      _rect?: { x: number; y: number; width: number; height: number },
    ) => {
      if (!url) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectedAttachmentSrc(url)
      setSelectedAttachmentFileName(fileName)
      setAttachmentSheetVisible2(true)
    },
    [],
  )

  const handleAttachmentMenuShare = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || src.split('/').pop() || 'file'
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    await executeShare(src, fileName)
  }, [selectedAttachmentSrc, selectedAttachmentFileName, executeShare])

  const handleAttachmentMenuDelete = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const url = selectedAttachmentSrc
    await handleDeleteAttachment(url)
    editorRef.current?.deleteAttachment(url)
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
  }, [selectedAttachmentSrc, handleDeleteAttachment])

  const handleAttachmentMenuDownload = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setAttachmentSheetVisible2(false)
    const src = selectedAttachmentSrc
    const fileName = selectedAttachmentFileName || src.split('/').pop() || 'file'
    setSelectedAttachmentSrc(null)
    setSelectedAttachmentFileName(null)
    await executeDownload(src, fileName)
  }, [selectedAttachmentSrc, selectedAttachmentFileName, executeDownload])

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!url) return
      try {
        const cleanUrl = resolveHyperdriveUrl(url)
        const name = fileName || cleanUrl.split('/').pop() || 'file'
        const localPath = await downloadToCache(cleanUrl, name)
        if (localPath) {
          await ExpoNativeShareModule.preview({ url: localPath })
        } else {
          await ExpoNativeShareModule.preview({ url: cleanUrl })
        }
      } catch {}
    },
    [resolveHyperdriveUrl, downloadToCache],
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
          await ExpoNativeShareModule.preview({ url: localPath })
        }
      } catch {}
    },
    [handleOpenAttachment, resolveHyperdriveUrl, downloadToCache],
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
    [handleMoveNote],
  )

  const handleRecordAudio = useCallback(() => {
    Keyboard.dismiss()
    setRecorderEverOpened(true)
    setIsRecorderVisible(true)
  }, [])

  const handleRecordingDone = useCallback(
    async (uri: string, _durationMs: number) => {
      setIsRecorderVisible(false)
      const fileName = `voice-note-${Date.now()}.m4a`
      setUploadInfo({ fileName, status: t('noteEditor.upload.uploading') })
      try {
        const { link } = await backendApi.insertFile({
          key: noteId!,
          fileName,
          path: decodeURIComponent(uri.replace('file://', '')),
        } as any)
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
    [noteId, hyperdriveServerAddress, t],
  )

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    setMoreMenuVisible(false)
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
          setIsOpen(false)
          setNoteId(null)
          loadedNoteRef.current = null
        })
      },
    })
  }, [noteId, dispatch, slideAnim, t])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSharing(true)
    const title = titleRef.current || t('noteCard.untitled')
    const html = noteContentRef.current || ''
    const plainText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    const message = title ? `${title}\n\n${plainText}` : plainText
    try {
      await ExpoNativeShareModule.share({ message })
    } catch {}
    setIsSharing(false)
  }, [isSharing, t])

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  const handleStyleStateChange = useCallback((state: TiptapStyleState) => {
    styleStateRef.current = state
    setStyleStateVersion((v) => v + 1)
  }, [])

  const isActive = useCallback(
    (key: keyof TiptapStyleState) => styleStateRef.current?.[key]?.isActive ?? false,
    [styleStateVersion],
  )

  const handleEditorFocus = useCallback(() => {
    isEditorFocusedRef.current = true
    setIsEditing(true)
  }, [])

  const handleEditorBlur = useCallback(() => {
    isEditorFocusedRef.current = false
  }, [])

  const animatedViewStyle = useMemo(
    () => [
      StyleSheet.absoluteFill,
      { backgroundColor: c.background, transform: [{ translateX: slideAnim }] },
    ],
    [c.background, slideAnim],
  )

  const floatingHeaderHeight = useMemo(() => insets.top + 52, [insets.top])

  const floatingBtnBg = useMemo(
    () => hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, theme.dark ? 0.82 : 0.92),
    [c.surfaceContainerHighest, c.surfaceVariant, theme.dark],
  )

  const floatingBtnBorderStyle = useMemo(
    () => (theme.dark ? undefined : { borderWidth: 1, borderColor: hexWithAlpha(c.outline, 0.5) }),
    [theme.dark, c.outline],
  )

  const saveBtnStyle = useMemo(
    () => [staticStyles.saveBtn, { backgroundColor: c.primaryContainer }],
    [c.primaryContainer],
  )

  const floatingLeftStyle = useMemo(
    () => [staticStyles.floatingLeft, { top: insets.top + 8 }],
    [insets.top],
  )

  const floatingRightStyle = useMemo(
    () => [staticStyles.floatingRight, { top: insets.top + 8 }],
    [insets.top],
  )

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        menuItemDelete: { color: c.error },
        moveDialog: {
          backgroundColor: c.surfaceContainerHighest ?? c.surface,
          borderRadius: 28,
          padding: 24,
          width: Math.min(width - 48, 400),
          elevation: 6,
        },
        moveDialogTitle: { color: c.onSurface },
        moveFolderText: { color: c.onSurface },
        dialogBtnText: { color: c.onSurfaceVariant },
        infoDialog: {
          backgroundColor: c.surfaceContainerHigh,
          borderRadius: 28,
          padding: 24,
          width: Math.min(width - 48, 400),
          elevation: 6,
        },
        infoDialogTitle: { color: c.onSurface },
        infoDialogMessage: { color: c.onSurfaceVariant, fontSize: 16 },
        infoDialogCancelText: { color: c.onSurfaceVariant, fontWeight: '600' },
        infoDialogConfirmTextInfo: { color: c.primary, fontWeight: '600' },
        infoDialogConfirmTextDestructive: { color: c.error, fontWeight: '600' },
        infoDialogOkayText: { color: c.primary, fontWeight: '600' },
        moveFolderItemPressed: {
          backgroundColor: hexWithAlpha(c.surfaceContainerHigh ?? c.surfaceVariant, 0.5),
        },
      }),
    [c, width, height],
  )

  const uploadBannerStyle = useMemo(
    () => ({
      bottom: (keyboardHeight > 0 ? keyboardHeight + 42 : insets.bottom + 12) + TOOLBAR_HEIGHT,
    }),
    [keyboardHeight, insets.bottom],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <Animated.View style={animatedViewStyle} pointerEvents={isOpen ? 'auto' : 'none'}>
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <TiptapEditor
          ref={editorRef}
          initialContent=""
          initialTitle=""
          safeAreaTop={floatingHeaderHeight}
          safeAreaBottom={
            keyboardHeight > 0 ? 42 + 24 + TOOLBAR_HEIGHT : insets.bottom + 12 + TOOLBAR_HEIGHT
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

        <View style={floatingLeftStyle} pointerEvents="box-none">
          <Pressable
            onPress={closeNote}
            style={({ pressed }) => [
              staticStyles.floatingIconBtn,
              { backgroundColor: floatingBtnBg },
              floatingBtnBorderStyle,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={c.primary} />
          </Pressable>
        </View>

        <View style={floatingRightStyle} pointerEvents="box-none">
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              staticStyles.floatingIconBtn,
              { backgroundColor: floatingBtnBg },
              floatingBtnBorderStyle,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="export-variant" size={20} color={c.primary} />
          </Pressable>

          <Menu
            visible={moreMenuVisible}
            onDismiss={() => setMoreMenuVisible(false)}
            contentStyle={{ borderRadius: 12, overflow: 'hidden' }}
            anchor={
              <Pressable
                onPress={() => setMoreMenuVisible(true)}
                style={({ pressed }) => [
                  staticStyles.floatingIconBtn,
                  { backgroundColor: floatingBtnBg },
                  floatingBtnBorderStyle,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="dots-vertical" size={22} color={c.primary} />
              </Pressable>
            }
          >
            {moveFolders.length > 0 && (
              <Menu.Item
                leadingIcon="folder-move-outline"
                title={t('noteCard.actions.moveTo')}
                onPress={() => {
                  setMoreMenuVisible(false)
                  setMoveDialogVisible(true)
                }}
              />
            )}
            {moveFolders.length > 0 && <Divider />}
            <Menu.Item
              leadingIcon="delete-outline"
              title={t('noteCard.actions.delete')}
              onPress={handleDeleteNote}
              titleStyle={dynamicStyles.menuItemDelete}
            />
          </Menu>

          <Pressable
            onPress={() => {
              if (isEditing) {
                handleDone()
              } else {
                setTimeout(() => editorRef.current?.focus(), 100)
              }
            }}
            style={({ pressed }) => [saveBtnStyle, pressed && { opacity: 0.8 }]}
          >
            <MaterialCommunityIcons
              name={isEditing ? 'check' : 'pencil-outline'}
              size={20}
              color={c.onPrimaryContainer}
            />
          </Pressable>
        </View>

        <EditorToolbar
          isActive={isActive}
          editorRef={editorRef}
          toolbarBottom={keyboardHeight > 0 ? keyboardHeight + 42 : insets.bottom + 12}
          onAttachPress={() => {
            console.log('onAttachPress called')
            Keyboard.dismiss()
            editorRef.current?.blur()
            setAttachSheetVisible(true)
          }}
          c={c}
          isDark={theme.dark}
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
            c={c}
            style={uploadBannerStyle}
          />
        )}

        <Modal
          visible={moveDialogVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMoveDialogVisible(false)}
          statusBarTranslucent
        >
          <Pressable style={staticStyles.modalOverlay} onPress={() => setMoveDialogVisible(false)}>
            <Pressable style={dynamicStyles.moveDialog} onPress={() => {}}>
              <Text style={[staticStyles.dialogTitle, dynamicStyles.moveDialogTitle]}>
                {t('noteCard.actions.moveTo')}
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={staticStyles.moveDialogContent}
              >
                {moveFolders.map((f: any) => (
                  <Pressable
                    key={f.id}
                    onPress={() => handleConfirmMove(f.id)}
                    style={({ pressed }) => [
                      staticStyles.moveFolderItem,
                      pressed && dynamicStyles.moveFolderItemPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="folder-outline"
                      size={20}
                      color={c.primary}
                      style={staticStyles.moveFolderIcon}
                    />
                    <Text style={[staticStyles.moveFolderText, dynamicStyles.moveFolderText]}>
                      {f.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={staticStyles.dialogActions}>
                <Pressable onPress={() => setMoveDialogVisible(false)} style={staticStyles.dialogBtn}>
                  <Text style={[staticStyles.dialogBtnText, dynamicStyles.dialogBtnText]}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={!!dialogInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setDialogInfo(null)}
          statusBarTranslucent
        >
          <Pressable style={staticStyles.modalOverlay} onPress={() => setDialogInfo(null)}>
            <Pressable style={dynamicStyles.infoDialog} onPress={() => {}}>
              <Text style={[staticStyles.dialogTitle, dynamicStyles.infoDialogTitle]}>
                {dialogInfo?.title}
              </Text>
              <Text style={dynamicStyles.infoDialogMessage}>{dialogInfo?.message}</Text>
              <View style={staticStyles.dialogActions}>
                <Pressable onPress={() => setDialogInfo(null)} style={staticStyles.dialogBtn}>
                  <Text
                    style={
                      dialogInfo?.onConfirm
                        ? dynamicStyles.infoDialogCancelText
                        : dynamicStyles.infoDialogOkayText
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
                    style={staticStyles.dialogBtn}
                  >
                    <Text
                      style={
                        dialogInfo.isDestructive
                          ? dynamicStyles.infoDialogConfirmTextDestructive
                          : dynamicStyles.infoDialogConfirmTextInfo
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

const staticStyles = StyleSheet.create({
  floatingLeft: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
  },
  floatingRight: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  floatingIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBanner: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
  },
  uploadSpinner: {
    marginRight: 12,
  },
  uploadText: {
    flex: 1,
  },
  uploadName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  uploadStatus: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 1,
  },
  moveDialogContent: {
    maxHeight: 320,
  },
  moveFolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  moveFolderIcon: {
    marginRight: 12,
  },
  moveFolderText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 4,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
})

const toolbarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
    flexShrink: 0,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexShrink: 0,
  },
})
