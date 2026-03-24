/* @refresh reset */

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
import { AudioModule } from 'expo-audio'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { SymbolView } from 'expo-symbols'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  InteractionManager,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import ExpoNativeShareModule from '../../modules/expo-native-share'

import { AudioRecorderModal } from '@/components/AudioRecorderModal'
import { GlassView } from '@/components/GlassView'
import { useTheme } from '@/components/Themed'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'
import { Radii, Space } from '@/constants/commonStyles'
import { NoteEditorContext } from '@/providers/NoteEditorContext'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject),
  )

const ToolbarBtn = memo(function ToolbarBtn({
  sf,
  onPress,
  active,
  tintActive,
  tintDefault,
  primaryColor,
}: {
  sf: string
  onPress: () => void
  active?: boolean
  tintActive: string
  tintDefault: string
  primaryColor: string
}) {
  const btnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.toolbarBtn,
      active && { backgroundColor: primaryColor + '33' },
      { opacity: pressed ? 0.5 : 1 },
    ],
    [active, primaryColor],
  )

  return (
    <Pressable onPress={onPress} style={btnStyle}>
      <SymbolView
        name={sf as any}
        size={22}
        tintColor={active ? tintActive : tintDefault}
        weight="regular"
        fallback={<View style={styles.fallbackIcon} />}
      />
    </Pressable>
  )
})

type AttachMenuProps = {
  colors: any
  onPickImage: () => void
  onPickFile: () => void
  onRecordAudio: () => void
  onScanDocument: () => void
  onTakePhoto: () => void
  onTakeVideo: () => void
}

const AttachMenu = memo(function AttachMenu({
  colors,
  onPickImage,
  onPickFile,
  onRecordAudio,
  onScanDocument,
  onTakePhoto,
  onTakeVideo,
}: AttachMenuProps) {
  return ExpoUI ? (
    <ExpoUI.Host matchContents style={{ width: 44, height: 52 }}>
      <ExpoUI.Menu
        label={
          <View style={styles.toolbarBtn}>
            <SymbolView
              name="paperclip"
              size={22}
              tintColor={colors.text}
              weight="regular"
              fallback={<View style={styles.fallbackIcon} />}
            />
          </View>
        }
      >
        <ExpoUI.Button label="Record Audio" systemImage="mic" onPress={onRecordAudio} />
        <ExpoUI.Button
          label="Scan Document"
          systemImage="doc.viewfinder"
          onPress={onScanDocument}
        />
        <ExpoUI.Button label="Choose File" systemImage="folder" onPress={onPickFile} />
        <ExpoUI.Button label="Take Video" systemImage="video" onPress={onTakeVideo} />
        <ExpoUI.Button label="Take Photo" systemImage="camera" onPress={onTakePhoto} />
        <ExpoUI.Button
          label="Photo & Video"
          systemImage="photo.on.rectangle"
          onPress={onPickImage}
        />
      </ExpoUI.Menu>
    </ExpoUI.Host>
  ) : (
    <ToolbarBtn
      sf="paperclip"
      tintActive={colors.primary}
      tintDefault={colors.text}
      primaryColor={colors.primary}
      onPress={onPickFile}
    />
  )
})

const EditorToolbar = memo(function EditorToolbar({
  isEditing,
  isActive,
  colors,
  editorRef,
  toolbarBottom,
  onPickImage,
  onPickFile,
  onRecordAudio,
  onScanDocument,
  onTakePhoto,
  onTakeVideo,
}: {
  isEditing: boolean
  isActive: (key: keyof TiptapStyleState) => boolean
  colors: any
  editorRef: React.RefObject<TiptapEditorHandle | null>
  toolbarBottom: number
  onPickImage: () => void
  onPickFile: () => void
  onRecordAudio: () => void
  onScanDocument: () => void
  onTakePhoto: () => void
  onTakeVideo: () => void
}) {
  const run = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }, [])

  const toolbarStyle = useMemo(
    () => [styles.floatingToolbar, { bottom: toolbarBottom }],
    [toolbarBottom],
  )

  const toolbarRowStyle = useMemo(
    () => [
      styles.toolbarRow,
      { justifyContent: 'flex-start' as const, gap: 24, paddingHorizontal: 8 },
    ],
    [],
  )

  const handleFocusEdit = useCallback(() => {
    setTimeout(() => editorRef.current?.focus(), 100)
  }, [editorRef])

  const handlePickImageEdit = useCallback(() => {
    setTimeout(() => onPickImage(), 100)
  }, [onPickImage])

  const handlePickFileEdit = useCallback(() => {
    setTimeout(() => onPickFile(), 100)
  }, [onPickFile])

  const handleRecordAudioEdit = useCallback(() => {
    setTimeout(() => onRecordAudio(), 100)
  }, [onRecordAudio])

  const handleScanDocumentEdit = useCallback(() => {
    setTimeout(() => onScanDocument(), 100)
  }, [onScanDocument])

  const handleTakePhotoEdit = useCallback(() => {
    setTimeout(() => onTakePhoto(), 100)
  }, [onTakePhoto])

  const handleTakeVideoEdit = useCallback(() => {
    setTimeout(() => onTakeVideo(), 100)
  }, [onTakeVideo])

  return (
    <View style={toolbarStyle}>
      <GlassView intensity={40} borderRadius={28} style={styles.glassBar} isInteractive>
        {isEditing ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarRow}
          >
            <ToolbarBtn
              sf="checkmark.square"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('checkboxList')}
              onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
            />
            <AttachMenu
              colors={colors}
              onPickImage={handlePickImageEdit}
              onPickFile={handlePickFileEdit}
              onRecordAudio={handleRecordAudioEdit}
              onScanDocument={handleScanDocumentEdit}
              onTakePhoto={handleTakePhotoEdit}
              onTakeVideo={handleTakeVideoEdit}
            />
            <ToolbarBtn
              sf="square.and.pencil"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ToolbarBtn
              sf="textformat.size.larger"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('h1')}
              onPress={() => run(() => editorRef.current?.toggleH1())}
            />
            <ToolbarBtn
              sf="textformat.size"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('h2')}
              onPress={() => run(() => editorRef.current?.toggleH2())}
            />
            <ToolbarBtn
              sf="bold"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('bold')}
              onPress={() => run(() => editorRef.current?.toggleBold())}
            />
            <ToolbarBtn
              sf="italic"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('italic')}
              onPress={() => run(() => editorRef.current?.toggleItalic())}
            />
            <ToolbarBtn
              sf="list.bullet"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('unorderedList')}
              onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
            />
            <ToolbarBtn
              sf="list.number"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('orderedList')}
              onPress={() => run(() => editorRef.current?.toggleOrderedList())}
            />
            <ToolbarBtn
              sf="checklist"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('checkboxList')}
              onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
            />
            <ToolbarBtn
              sf="text.quote"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('blockQuote')}
              onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
            />
            <ToolbarBtn
              sf="chevron.left.forwardslash.chevron.right"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              active={isActive('codeBlock')}
              onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
            />
          </ScrollView>
        ) : (
          <View style={toolbarRowStyle}>
            <AttachMenu
              colors={colors}
              onPickImage={handlePickImageEdit}
              onPickFile={handlePickFileEdit}
              onRecordAudio={handleRecordAudioEdit}
              onScanDocument={handleScanDocumentEdit}
              onTakePhoto={handleTakePhotoEdit}
              onTakeVideo={handleTakeVideoEdit}
            />
            <ToolbarBtn
              sf="square.and.pencil"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              onPress={handleFocusEdit}
            />
          </View>
        )}
      </GlassView>
    </View>
  )
})

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark: themeIsDark } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const editorRef = useRef<TiptapEditorHandle>(null)
  const floatingHeaderHeight = useMemo(() => insets.top + 52, [insets.top])

  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isEdgeSwipeActive, setIsEdgeSwipeActive] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isSharing, setIsSharing] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isRecorderVisible, setIsRecorderVisible] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<{ fileName: string; status: string } | null>(null)
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
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (!isOpen) return
        setKeyboardHeight(e.endCoordinates.height)
        setIsEditing(true)
      },
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!isOpen) return
        setKeyboardHeight(0)
      },
    )
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

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setIsEdgeSwipeActive(false)
      setKeyboardHeight(0)
    }
  }, [isOpen])

  const TOOLBAR_HEIGHT = 52
  const editorBottomInset = 0

  useEffect(() => {
    const defaultBottom = TOOLBAR_HEIGHT + (Platform.OS === 'ios' ? insets.bottom : 16)
    const inset = keyboardHeight > 0 ? keyboardHeight + 12 + TOOLBAR_HEIGHT + 16 : defaultBottom
    editorRef.current?.setKeyboardInset(inset, keyboardHeight > 0 && isEditorFocusedRef.current)
  }, [keyboardHeight, insets.bottom])

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
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (asset.type === 'video') {
        const displayName = asset.fileName || `video-${Date.now()}.mp4`
        setUploadInfo({ fileName: displayName, status: 'Preparing...' })
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
            status: sizeStr ? `Reading ${sizeStr}...` : 'Reading...',
          })

          const base64 = await FileSystem.readAsStringAsync(cachePath, { encoding: 'base64' })
          setUploadInfo({ fileName: displayName, status: 'Uploading...' })
          const buffer = Buffer.from(base64, 'base64')
          const { link } = await backendApi.insertFile({
            key: noteId!,
            fileName: displayName,
            buffer,
          })
          if (link) {
            let resolvedLink = link
            if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
              resolvedLink = link.replace(
                HYPERDRIVE_URL_PREFIX,
                hyperdriveServerAddress.replace(/\/$/, ''),
              )
            }
            editorRef.current?.insertFileAttachment(
              resolvedLink,
              displayName,
              fileSize,
              asset.mimeType || 'video/mp4',
            )
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          }
          await FileSystem.deleteAsync(cachePath, { idempotent: true })
        } catch (error) {
          console.error('Error uploading video:', error)
          Alert.alert(
            'Upload Failed',
            'Could not upload the video. Try using "Choose File" instead.',
          )
        } finally {
          setUploadInfo(null)
        }
        return
      }

      const { uri, width, height, fileName } = asset
      const displayName = fileName || 'Photo'
      setUploadInfo({ fileName: displayName, status: 'Processing...' })

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
        setUploadInfo({ fileName: displayName, status: 'Uploading...' })
        const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
        const buffer = Buffer.from(base64Data, 'base64')
        const { link } = await backendApi.insertFile({
          key: noteId!,
          fileName: fileName || `image-${Date.now()}.jpg`,
          buffer,
        })
        if (link) {
          let resolvedLink = link
          if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
            resolvedLink = link.replace(
              HYPERDRIVE_URL_PREFIX,
              hyperdriveServerAddress.replace(/\/$/, ''),
            )
          }
          editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      } finally {
        setUploadInfo(null)
      }
    },
    [noteId, hyperdriveServerAddress],
  )

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
      const { scannedImages, status } = await DocumentScanner.scanDocument()

      if (status !== ScanDocumentResponseStatus.Success || !scannedImages?.length) return

      const screenW = Dimensions.get('window').width
      const maxWidth = screenW - 40
      const maxHeight = 400

      for (let i = 0; i < scannedImages.length; i++) {
        const uri = scannedImages[i]
        const pageLabel =
          scannedImages.length > 1 ? `Page ${i + 1} of ${scannedImages.length}` : 'Scanned document'
        const displayName = `scan-${Date.now()}-page${i + 1}.jpg`

        setUploadInfo({ fileName: pageLabel, status: 'Processing...' })

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

          setUploadInfo({ fileName: pageLabel, status: 'Uploading...' })
          const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
          const buffer = Buffer.from(base64Data, 'base64')
          const { link } = await backendApi.insertFile({
            key: noteId!,
            fileName: displayName,
            buffer,
          })

          if (link) {
            let resolvedLink = link
            if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
              resolvedLink = link.replace(
                HYPERDRIVE_URL_PREFIX,
                hyperdriveServerAddress.replace(/\/$/, ''),
              )
            }
            editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
            setTimeout(() => editorRef.current?.scrollToEnd(), 300)
          }
        } catch (pageError) {
          console.error(`Error uploading scanned page ${i + 1}:`, pageError)
        }
      }
    } catch (error) {
      console.error('Error scanning document:', error)
    } finally {
      setUploadInfo(null)
    }
  }, [noteId, hyperdriveServerAddress])

  const handlePickFile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled || !result.assets?.[0]) return

    const { uri, name, size, mimeType } = result.assets[0]
    const displayName = name || 'File'
    const sizeStr = size
      ? size < 1048576
        ? `${(size / 1024).toFixed(0)} KB`
        : `${(size / 1048576).toFixed(1)} MB`
      : ''
    setUploadInfo({
      fileName: displayName,
      status: sizeStr ? `Reading ${sizeStr}...` : 'Reading...',
    })

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })
      setUploadInfo({ fileName: displayName, status: 'Uploading...' })
      const buffer = Buffer.from(base64, 'base64')
      const { link } = await backendApi.insertFile({
        key: noteId!,
        fileName: name || `file-${Date.now()}`,
        buffer,
      })
      if (link) {
        let resolvedLink = link
        if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
          resolvedLink = link.replace(
            HYPERDRIVE_URL_PREFIX,
            hyperdriveServerAddress.replace(/\/$/, ''),
          )
        }
        const isAudio = mimeType?.startsWith('audio/')
        if (isAudio) {
          editorRef.current?.insertAudioAttachment(resolvedLink, name || 'Audio')
        } else {
          editorRef.current?.insertFileAttachment(
            resolvedLink,
            name || 'File',
            size || 0,
            mimeType || '',
          )
        }
        setTimeout(() => editorRef.current?.scrollToEnd(), 300)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploadInfo(null)
    }
  }, [noteId, hyperdriveServerAddress])

  const handleRecordAudio = useCallback(async () => {
    const { granted, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync()
    if (!granted) {
      if (!canAskAgain) {
        Alert.alert(
          'Permission Required',
          'Please enable microphone access in your device settings to record audio.',
          [{ text: 'OK' }],
        )
      }
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Keyboard.dismiss()
    editorRef.current?.blur()
    setTimeout(() => setIsRecorderVisible(true), 100)
  }, [])

  const handleRecordingDone = useCallback(
    async (uri: string, durationMs: number) => {
      setIsRecorderVisible(false)
      const fileName = `recording-${Date.now()}.m4a`
      setUploadInfo({ fileName, status: 'Uploading...' })
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
        const buffer = Buffer.from(base64, 'base64')
        const { link } = await backendApi.insertFile({ key: noteId!, fileName, buffer })
        if (link) {
          let resolvedLink = link
          if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
            resolvedLink = link.replace(
              HYPERDRIVE_URL_PREFIX,
              hyperdriveServerAddress.replace(/\/$/, ''),
            )
          }
          editorRef.current?.insertAudioAttachment(resolvedLink, fileName)
          setTimeout(() => editorRef.current?.scrollToEnd(), 300)
        }
      } catch (error) {
        console.error('Error uploading recording:', error)
        Alert.alert('Upload Failed', 'Could not upload the recording.')
      } finally {
        setUploadInfo(null)
      }
    },
    [noteId, hyperdriveServerAddress],
  )

  const openNote = useCallback((id: string) => {
    Keyboard.dismiss()
    setIsEditing(false)
    editorRef.current?.blur()

    loadedNoteRef.current = null
    setNoteId(id)
    setIsOpen(true)
  }, [])

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
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
      },
    ])
  }, [noteId, dispatch, slideAnim])

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
    const title = titleRef.current || 'Untitled'
    const html = noteContentRef.current || ''

    const urls: string[] = []

    const processLink = async (link: string, defaultExt: string, tagContent: string) => {
      let cleanLink = link.replace(/&amp;/g, '&')
      if (hyperdriveServerAddress && cleanLink.includes(HYPERDRIVE_URL_PREFIX)) {
        cleanLink = cleanLink.replace(
          HYPERDRIVE_URL_PREFIX,
          hyperdriveServerAddress.replace(/\/$/, ''),
        )
      }

      try {
        let filename = `file_${Date.now()}`

        const nameMatch = tagContent.match(/filename="([^">]+)"/i)
        if (nameMatch && nameMatch[1]) {
          filename = nameMatch[1].replace(/&amp;/g, '&')
          // Optional: replace spaces with '_' if you run into any Swift issues on device later
          // filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        } else {
          const urlFilename = cleanLink.split('/').pop()?.split('?')[0]
          if (urlFilename && urlFilename.length > 0) {
            filename = urlFilename
            const matchType = cleanLink.match(/type=([^&]+)/)
            if (!filename.includes('.') && matchType) {
              const mime = decodeURIComponent(matchType[1])
              if (mime.includes('png')) filename += '.png'
              else if (mime.includes('jpeg') || mime.includes('jpg')) filename += '.jpg'
              else if (mime.includes('video/mp4')) filename += '.mp4'
              else if (mime.includes('audio/x-m4a')) filename += '.m4a'
              else if (mime.includes('audio/mpeg')) filename += '.mp3'
            }
          }
        }

        if (!filename.includes('.')) {
          filename += `.${defaultExt}`
        }

        const localUri = `${FileSystem.cacheDirectory}${filename}`
        const { uri } = await FileSystem.downloadAsync(cleanLink, localUri)
        urls.push(uri)
      } catch (err) {
        console.error('Failed to download attachment for sharing:', err)
      }
    }

    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1]) await processLink(match[1], 'jpg', match[0])
    }

    const attachmentRegex = /<div[^>]+url="([^">]+)"[^>]*>/g
    while ((match = attachmentRegex.exec(html)) !== null) {
      if (match[1]) await processLink(match[1], 'bin', match[0])
    }

    let plainText = html
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

    if (hyperdriveServerAddress) {
      const serverBase = hyperdriveServerAddress.replace(/\/$/, '')
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
      if (ExpoNativeShareModule && typeof ExpoNativeShareModule.share === 'function') {
        await ExpoNativeShareModule.share({ message, urls })
      } else {
        await Share.share({ title, message })
      }
    } catch (e) {
      console.error('Error sharing node:', e)
    } finally {
      setIsSharing(false)
    }
  }, [hyperdriveServerAddress, isSharing])

  const showMoveToSheet = useCallback(() => {
    if (moveFolders.length === 0) return
    const folderNames = moveFolders.map((f: any) => f.name || f.id)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Move to',
        options: ['Cancel', ...folderNames],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 0) return
        const folder = moveFolders[index - 1]
        if (folder) handleMoveNote(folder.id)
      },
    )
  }, [moveFolders, handleMoveNote])

  const handleMoreOptions = useCallback(() => {
    if (!noteId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Move to', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (index) => {
          if (index === 1) showMoveToSheet()
          else if (index === 2) handleDeleteNote()
        },
      )
    } else {
      handleDeleteNote()
    }
  }, [noteId, showMoveToSheet, handleDeleteNote])

  const resetEditorState = useCallback(() => {
    setIsOpen(false)
    setNoteId(null)
    setIsEdgeSwipeActive(false)
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
    void editorRef.current?.save()
    animateClose()
  }, [animateClose])

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
  const toolbarBottom = useMemo(
    () => (keyboardHeight > 0 ? keyboardHeight + 12 : Platform.OS === 'ios' ? 32 : 16),
    [keyboardHeight],
  )

  const animatedViewStyle = useMemo(
    () => [
      StyleSheet.absoluteFill,
      {
        backgroundColor: colors.background,
        transform: [{ translateX: slideAnim }],
      },
    ],
    [colors.background, slideAnim],
  )

  const headerStyle = useMemo(() => [styles.header, { paddingTop: insets.top - 5 }], [insets.top])
  const pillDividerStyle = useMemo(
    () => [
      styles.pillDivider,
      {
        backgroundColor: themeIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      },
    ],
    [themeIsDark],
  )

  const handleEditorFocus = useCallback(() => {
    isEditorFocusedRef.current = true
    setIsEditing(true)
  }, [])

  const handleEditorBlur = useCallback(() => {
    isEditorFocusedRef.current = false
  }, [])

  const downloadAttachmentToCache = useCallback(
    async (url: string, fileName: string): Promise<string> => {
      const safeFileName = fileName || `file_${Date.now()}`
      const localUri = `${FileSystem.cacheDirectory}${safeFileName}`

      if (url.startsWith('data:')) {
        const base64 = url.split(',')[1] || ''
        await FileSystem.writeAsStringAsync(localUri, base64, { encoding: 'base64' })
        return localUri
      }

      let cleanUrl = url
      if (hyperdriveServerAddress && cleanUrl.includes(HYPERDRIVE_URL_PREFIX)) {
        cleanUrl = cleanUrl.replace(
          HYPERDRIVE_URL_PREFIX,
          hyperdriveServerAddress.replace(/\/$/, ''),
        )
      }
      const response = await fetch(cleanUrl)
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] || '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      await FileSystem.writeAsStringAsync(localUri, base64, { encoding: 'base64' })
      return localUri
    },
    [hyperdriveServerAddress],
  )

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!url) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      try {
        const localUri = await downloadAttachmentToCache(url, fileName)
        if (ExpoNativeShareModule && typeof ExpoNativeShareModule.share === 'function') {
          await ExpoNativeShareModule.share({ message: '', urls: [localUri], resolveOnDismiss: true })
        }
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
      } catch (err) {
        console.error('Failed to share attachment:', err)
        Alert.alert('Error', 'Could not prepare the file for sharing.')
      }
    },
    [downloadAttachmentToCache],
  )

  const handlePreviewAttachment = useCallback(
    async (url: string, fileName: string) => {
      if (!url || isPreviewLoading) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setIsPreviewLoading(true)
      try {
        const localUri = await downloadAttachmentToCache(url, fileName)
        setIsPreviewLoading(false)
        if (ExpoNativeShareModule && typeof ExpoNativeShareModule.preview === 'function') {
          await ExpoNativeShareModule.preview({ url: localUri })
        }
        FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
      } catch (err) {
        console.error('Failed to preview attachment:', err)
        setIsPreviewLoading(false)
        Alert.alert('Error', 'Could not open the file for preview.')
      }
    },
    [downloadAttachmentToCache, isPreviewLoading],
  )

  const handleDeleteAttachment = useCallback(async (url: string) => {
    if (!url) return
    try {
      if (url.startsWith(HYPERDRIVE_URL_PREFIX)) {
        const key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
        await backendApi.deleteFile(key)
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
    }
  }, [])

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
    [closeNote, isOpen, slideAnim],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <>
        <Animated.View style={animatedViewStyle} pointerEvents={isOpen ? 'auto' : 'none'}>
          {Platform.OS === 'ios' && isOpen ? (
            <View
              style={styles.edgeSwipeZone}
              pointerEvents="box-only"
              {...edgeSwipeResponder.panHandlers}
            />
          ) : null}

          <View style={headerStyle}>
            <View style={styles.headerRow}>
              <GlassView intensity={40} borderRadius={24} style={styles.headerBtn}>
                <Pressable
                  onPress={closeNote}
                  style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                >
                  <SymbolView
                    name="chevron.left"
                    size={20}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              </GlassView>

              <View style={{ flex: 1 }} />

              {isEditing ? (
                <GlassView intensity={40} borderRadius={22} style={styles.headerBtn}>
                  <Pressable
                    onPress={handleDone}
                    style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <SymbolView
                      name="checkmark"
                      size={22}
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
                      { opacity: pressed || isSharing ? 0.5 : 1 },
                    ]}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <SymbolView
                        name="square.and.arrow.up"
                        size={24}
                        tintColor={colors.text}
                        weight="medium"
                        fallback={<View />}
                      />
                    )}
                  </Pressable>
                  <View style={pillDividerStyle} />
                  {ExpoUI ? (
                    <ExpoUI.Host matchContents style={{ width: 48, height: 48 }}>
                      <ExpoUI.Menu
                        label={
                          <View style={styles.headerBtnInner}>
                            <SymbolView
                              name="ellipsis"
                              size={24}
                              tintColor={colors.text}
                              weight="medium"
                              fallback={<View />}
                            />
                          </View>
                        }
                      >
                        <ExpoUI.Menu label="Move to" systemImage="folder.badge.plus">
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
                              label="No folders available"
                              systemImage="folder.badge.minus"
                              onPress={() => {}}
                            />
                          )}
                        </ExpoUI.Menu>
                        <ExpoUI.Button
                          label="Delete"
                          systemImage="trash"
                          role="destructive"
                          onPress={handleDeleteNote}
                        />
                      </ExpoUI.Menu>
                    </ExpoUI.Host>
                  ) : (
                    <Pressable
                      onPress={handleMoreOptions}
                      style={({ pressed }) => [
                        styles.headerBtnInner,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <SymbolView
                        name="ellipsis"
                        size={24}
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
            initialContent=""
            initialTitle=""
            safeAreaTop={floatingHeaderHeight}
            safeAreaBottom={editorBottomInset}
            scrollEnabled={!isEdgeSwipeActive}
            onContentChange={handleUpdate}
            onTitleChange={handleTitleChange}
            onStyleStateChange={handleStyleStateChange}
            onEditorFocus={handleEditorFocus}
            onEditorBlur={handleEditorBlur}
            onOpenAttachment={handleOpenAttachment}
            onPreviewAttachment={handlePreviewAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />

          {isOpen && (
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

          <AudioRecorderModal
            visible={isRecorderVisible}
            onDone={handleRecordingDone}
            onCancel={() => setIsRecorderVisible(false)}
          />

          {uploadInfo && (
            <View style={[uploadStyles.container, { bottom: toolbarBottom + 64 }]}>
              <GlassView intensity={12} borderRadius={16} style={uploadStyles.toast} isInteractive>
                <ActivityIndicator size="small" color={colors.primary} />
                <View style={uploadStyles.textWrap}>
                  <Text style={[uploadStyles.fileName, { color: colors.text }]} numberOfLines={1}>
                    {uploadInfo.fileName}
                  </Text>
                  <Text style={[uploadStyles.status, { color: colors.textSecondary }]}>
                    {uploadInfo.status}
                  </Text>
                </View>
              </GlassView>
            </View>
          )}
        </Animated.View>
        {isPreviewLoading && (
          <View style={styles.previewLoadingOverlay} pointerEvents="none">
            <View style={styles.previewLoadingBox}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          </View>
        )}
      </>
    </NoteEditorContext.Provider>
  )
}

const styles = StyleSheet.create({
  previewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  previewLoadingBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  edgeSwipeZone: {
    ...StyleSheet.absoluteFillObject,
    width: 32,
    zIndex: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Space.base,
  },
  headerBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerBtnInner: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pillDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
  },
  floatingToolbar: {
    position: 'absolute',
    left: Space.base,
    right: Space.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Space.md,
  },
  glassBar: {
    minHeight: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 0,
  },
  toolbarBtn: {
    width: 44,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: Space.xs,
    opacity: 0.4,
  },
  fallbackIcon: { width: 22, height: 22 },
})

const uploadStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Space.base,
    right: Space.base,
    alignItems: 'center',
    zIndex: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    fontSize: 12,
  },
})
