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
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { SymbolView } from 'expo-symbols'
import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import ExpoNativeShareModule from '../../modules/expo-native-share'

import { GlassView } from '@/components/GlassView'
import { useTheme } from '@/components/Themed'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'
import { Radii, Space } from '@/constants/commonStyles'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

interface NoteEditorContextType {
  openNote: (id: string) => void
  closeNote: () => void
  isOpen: boolean
}

const NoteEditorContext = createContext<NoteEditorContextType>({
  openNote: () => {},
  closeNote: () => {},
  isOpen: false,
})

export const useNoteEditor = () => useContext(NoteEditorContext)

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

const EditorToolbar = memo(function EditorToolbar({
  isEditing,
  isActive,
  colors,
  editorRef,
  toolbarBottom,
  onAttach,
}: {
  isEditing: boolean
  isActive: (key: keyof TiptapStyleState) => boolean
  colors: any
  editorRef: React.RefObject<TiptapEditorHandle | null>
  toolbarBottom: number
  onAttach: () => void
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

  const handleAttachEdit = useCallback(() => {
    setTimeout(() => onAttach(), 100)
  }, [onAttach])

  return (
    <View style={toolbarStyle}>
      <GlassView intensity={5} borderRadius={28} style={styles.glassBar}>
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
            <ToolbarBtn
              sf="paperclip"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              onPress={onAttach}
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
            <ToolbarBtn
              sf="paperclip"
              tintActive={colors.primary}
              tintDefault={colors.text}
              primaryColor={colors.primary}
              onPress={handleAttachEdit}
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
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const styleStateRef = useRef<TiptapStyleState | null>(null)
  const [styleStateVersion, setStyleStateVersion] = useState(0)

  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current
  const titleRef = useRef<string>('')
  const noteContentRef = useRef<string>('')
  const loadedNoteRef = useRef<string | null>(null)

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

    InteractionManager.runAfterInteractions(() => {
      editorRef.current?.setHTML(content)
    })
  }, [noteId, noteData, hyperdriveServerAddress, slideAnim])

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setKeyboardHeight(0)
    }
  }, [isOpen])

  const TOOLBAR_HEIGHT = 52
  const editorBottomInset = useMemo(() => {
    if (keyboardHeight > 0) {
      return keyboardHeight + 12 + TOOLBAR_HEIGHT + 8
    }
    return (Platform.OS === 'ios' ? 32 : 16) + TOOLBAR_HEIGHT + 8
  }, [keyboardHeight])

  useEffect(() => {
    const inset = keyboardHeight > 0 ? keyboardHeight + 12 + TOOLBAR_HEIGHT + 16 : 0
    editorRef.current?.setKeyboardInset(inset)
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

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    const { uri, width, height, fileName } = result.assets[0]
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
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: finalWidth, height: finalHeight } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manipulated.base64) return

      const buffer = Buffer.from(manipulated.base64, 'base64')
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
      }
    } catch (error) {
      console.error('Error uploading image:', error)
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
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })
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
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }, [noteId, hyperdriveServerAddress])

  const handleAttach = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo Library', 'Choose File'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) handlePickImage()
          else if (index === 2) handlePickFile()
        },
      )
    } else {
      handlePickFile()
    }
  }, [handlePickImage, handlePickFile])

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const title = titleRef.current || 'Untitled'
    const html = noteContentRef.current || ''

    const urls: string[] = []

    const processLink = async (link: string, defaultExt: string, tagContent: string) => {
      let cleanLink = link.replace(/&amp;/g, '&')
      if (hyperdriveServerAddress && cleanLink.includes(HYPERDRIVE_URL_PREFIX)) {
        cleanLink = cleanLink.replace(HYPERDRIVE_URL_PREFIX, hyperdriveServerAddress.replace(/\/$/, ''))
      }
      
      try {
        let filename = `file_${Date.now()}`
        
        const nameMatch = tagContent.match(/fileName="([^">]+)"/)
        if (nameMatch && nameMatch[1]) {
          filename = nameMatch[1].replace(/&amp;/g, '&')
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
    
    // Remove local server links from plain text as they won't work for the recipient
    if (hyperdriveServerAddress) {
      const serverBase = hyperdriveServerAddress.replace(/\/$/, '')
      const serverRegex = new RegExp(`${serverBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`, 'gi')
      plainText = plainText.replace(serverRegex, '')
    }
    plainText = plainText.replace(new RegExp(`${HYPERDRIVE_URL_PREFIX}[^\\s]*`, 'gi'), '')
    
    plainText = plainText
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const message = title ? `${title}\n\n${plainText}` : plainText
    try {
      if (ExpoNativeShareModule && typeof ExpoNativeShareModule.share === 'function') {
        await ExpoNativeShareModule.share({ message, urls })
      } else {
        await Share.share({ title, message })
      }
    } catch (e) {
      console.error('Error sharing node:', e)
    }
  }, [hyperdriveServerAddress])

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

  const closeNote = useCallback(async () => {
    editorRef.current?.blur()
    Keyboard.dismiss()
    await editorRef.current?.save()
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
  }, [slideAnim])

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

  const headerStyle = useMemo(() => [styles.header, { paddingTop: insets.top }], [insets.top])
  const pillDividerStyle = useMemo(
    () => [
      styles.pillDivider,
      {
        backgroundColor: themeIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      },
    ],
    [themeIsDark],
  )

  const handleEditorFocus = useCallback(() => setIsEditing(true), [])

  const handleOpenAttachment = useCallback((url: string) => {
    if (url) Linking.openURL(url).catch(console.error)
  }, [])

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

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <>
        <Animated.View style={animatedViewStyle} pointerEvents={isOpen ? 'auto' : 'none'}>
          <View style={headerStyle}>
            <View style={styles.headerRow}>
              <GlassView intensity={5} borderRadius={24} style={styles.headerBtn}>
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
                <GlassView intensity={5} borderRadius={22} style={styles.headerBtn}>
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
                <GlassView intensity={5} borderRadius={24} style={styles.headerPill}>
                  <Pressable
                    onPress={handleShare}
                    style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <SymbolView
                      name="square.and.arrow.up"
                      size={24}
                      tintColor={colors.text}
                      weight="medium"
                      fallback={<View />}
                    />
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
            onContentChange={handleUpdate}
            onTitleChange={handleTitleChange}
            onStyleStateChange={handleStyleStateChange}
            onEditorFocus={handleEditorFocus}
            onOpenAttachment={handleOpenAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />

          {isOpen && (
            <EditorToolbar
              isEditing={isEditing}
              isActive={isActive}
              colors={colors}
              editorRef={editorRef}
              toolbarBottom={toolbarBottom}
              onAttach={handleAttach}
            />
          )}
        </Animated.View>
      </>
    </NoteEditorContext.Provider>
  )
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
