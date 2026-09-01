import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  InteractionManager,
  Keyboard,
} from 'react-native'
import { useSelector } from 'react-redux'
import { router } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import {
  ALL_NOTES_KEY,
  COLLABORATION_ENABLED,
  HYPERDRIVE_URL_PREFIX,
  RECENTLY_DELETED_KEY,
} from '@pear-notes/core/constant.js'
import {
  getEditorContent,
  getEditorSyncToken,
  getEditorTitle,
} from '@pear-notes/core/store/slices/editorSlice.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { useReduceMotion } from '@/components/Themed'
import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'
import { snapTo } from '@/lib/motion'

const FOCUS_TITLE_DELAY = 250
const IOS_TOOLBAR_INSET_TYPING = 76
const IOS_TOOLBAR_INSET_IDLE = 96

export function useNoteEditor() {
  const reduceMotion = useReduceMotion()
  const editorRef = useRef<TiptapEditorHandle>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isSharing, setIsSharing] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<{
    fileName: string
    status: string
    progress?: number
  } | null>(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [selectedAttachmentSrc, setSelectedAttachmentSrc] = useState<string | null>(null)
  const [selectedAttachmentFileName, setSelectedAttachmentFileName] = useState<string | null>(null)

  const [moveDialogVisible, setMoveDialogVisible] = useState(false)
  const [moreSheetVisible, setMoreSheetVisible] = useState(false)
  const [attachSheetVisible, setAttachSheetVisible] = useState(false)
  const [imageSheetVisible, setImageSheetVisible] = useState(false)
  const [attachmentSheetVisible2, setAttachmentSheetVisible2] = useState(false)
  const [isRecorderVisible, setIsRecorderVisible] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [recorderEverOpened, setRecorderEverOpened] = useState(false)
  const [dialogInfo, setDialogInfo] = useState<{
    title: string
    message: string
    onConfirm?: () => void
    confirmText?: string
    isDestructive?: boolean
  } | null>(null)

  const [isEdgeSwipeActive, setIsEdgeSwipeActive] = useState(false)
  const [imageActionRect, setImageActionRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [isImageActionSheetOpen, setIsImageActionSheetOpen] = useState(false)
  const [attachmentActionRect, setAttachmentActionRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [isAttachmentActionSheetOpen, setIsAttachmentActionSheetOpen] = useState(false)

  const styleStateRef = useRef<TiptapStyleState | null>(null)
  const [styleStateVersion, setStyleStateVersion] = useState(0)
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current
  const isClosingRef = useRef(false)
  const titleRef = useRef<string>('')
  const noteContentRef = useRef<string>('')
  const loadedNoteRef = useRef<string | null>(null)
  const isLoadingNoteRef = useRef(false)
  const isEditorFocusedRef = useRef(false)
  const lastSyncTokenRef = useRef(-1)
  const shouldFocusTitleRef = useRef(false)

  const noteSelector = useMemo(() => getNoteData(noteId ?? ''), [noteId])
  const rawNoteData = useSelector(noteSelector)
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  const editorContent = useSelector(getEditorContent) as string
  const editorTitle = useSelector(getEditorTitle) as string
  const syncToken = useSelector(getEditorSyncToken) as number
  const allFolders = useSelector(getFolders) as any[]
  const moveFolders = useMemo(
    () =>
      allFolders.filter(
        (f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== RECENTLY_DELETED_KEY,
      ),
    [allFolders],
  )

  useEffect(() => {
    const isIos = process.env.EXPO_OS === 'ios'
    const showEvent = isIos ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = isIos ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, (e) => {
      if (!isOpen) return
      setKeyboardHeight(e.endCoordinates.height)
      setIsEditing(true)
      if (isIos) {
        editorRef.current?.setBottomInset(e.endCoordinates.height, IOS_TOOLBAR_INSET_TYPING)
      } else {
        setTimeout(() => {
          editorRef.current?.setKeyboardInset(50, true)
        }, 50)
      }
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      if (!isOpen) return
      setKeyboardHeight(0)
      if (isIos) {
        editorRef.current?.setBottomInset(0, IOS_TOOLBAR_INSET_IDLE)
      } else {
        editorRef.current?.blur()
        setIsEditing(false)
      }
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const isIos = process.env.EXPO_OS === 'ios'

    const resetKeyboardLayout = () => {
      setKeyboardHeight(0)
      setIsEditing(false)
      isEditorFocusedRef.current = false
      editorRef.current?.blur()
      if (isIos) editorRef.current?.setBottomInset(0, IOS_TOOLBAR_INSET_IDLE)
      else editorRef.current?.setKeyboardInset(0)
    }

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') {
        Keyboard.dismiss()
        if (!isIos) resetKeyboardLayout()
        return
      }
      if (next !== 'active') return
      if (isIos) {
        if (Keyboard.isVisible()) return
        resetKeyboardLayout()
        return
      }
      Keyboard.dismiss()
      resetKeyboardLayout()
    })

    return () => subscription.remove()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setIsEdgeSwipeActive(false)
      setKeyboardHeight(0)
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

    if (reduceMotion) {
      snapTo(slideAnim, 0)
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start()
    }

    isLoadingNoteRef.current = true
    InteractionManager.runAfterInteractions(() => {
      editorRef.current?.loadNote(noteId, content)
      if (shouldFocusTitleRef.current) {
        shouldFocusTitleRef.current = false
        setTimeout(() => editorRef.current?.focusTitle(), FOCUS_TITLE_DELAY)
      }
    })
  }, [noteId, noteData, hyperdriveServerAddress, slideAnim])

  useEffect(() => {
    if (!noteId || noteId === 'new' || noteId !== loadedNoteRef.current) return
    if (syncToken === lastSyncTokenRef.current) return
    lastSyncTokenRef.current = syncToken
    if (editorContent === noteContentRef.current && editorTitle === titleRef.current) return
    noteContentRef.current = editorContent
    titleRef.current = editorTitle
    let content = editorContent
    if (hyperdriveServerAddress && content.includes(HYPERDRIVE_URL_PREFIX)) {
      content = content.replaceAll(
        HYPERDRIVE_URL_PREFIX,
        hyperdriveServerAddress.replace(/\/$/, ''),
      )
    }
    editorRef.current?.setTitle(editorTitle)
    editorRef.current?.setHTML(content)
  }, [noteId, syncToken, editorContent, editorTitle, hyperdriveServerAddress])

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
    if (reduceMotion) {
      snapTo(slideAnim, w, resetEditorState)
      return
    }
    Animated.timing(slideAnim, {
      toValue: w,
      duration: 250,
      useNativeDriver: true,
    }).start(resetEditorState)
  }, [resetEditorState, slideAnim, reduceMotion])

  const closeNote = useCallback(() => {
    editorRef.current?.blur()
    Keyboard.dismiss()
    editorRef.current?.save()
    animateClose()
    if (process.env.EXPO_OS === 'android' && router.canGoBack()) {
      router.back()
    }
  }, [animateClose])

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') return
    const handleBackPress = () => {
      if (isOpen) {
        closeNote()
        return true
      }
      return false
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress)
    return () => subscription.remove()
  }, [isOpen, closeNote])

  const openNote = useCallback((id: string, options?: { focusTitle?: boolean }) => {
    Keyboard.dismiss()
    setIsEditing(false)
    editorRef.current?.blur()
    loadedNoteRef.current = null
    shouldFocusTitleRef.current = options?.focusTitle === true
    setNoteId(id)
    setIsOpen(true)
  }, [])

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

  const resolveHyperdriveUrl = useCallback(
    (url: string) => {
      if (hyperdriveServerAddress && url.includes(HYPERDRIVE_URL_PREFIX)) {
        return url.replace(HYPERDRIVE_URL_PREFIX, hyperdriveServerAddress.replace(/\/$/, ''))
      }
      return url
    },
    [hyperdriveServerAddress],
  )

  const handleYjsMessage = useCallback(
    (dataBase64: string) => {
      if (!COLLABORATION_ENABLED || !noteId || noteId === 'new') return
      InteractionManager.runAfterInteractions(() => {
        const binaryString = atob(dataBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        backendApi.broadcastYjsUpdate({ noteId, data: bytes })
      })
    },
    [noteId],
  )

  useEffect(() => {
    if (!COLLABORATION_ENABLED || !noteId || noteId === 'new') return

    let active = true
    let stream: any = null

    const setup = async () => {
      try {
        stream = await backendApi.subscribeYjsUpdate({ noteId })
        for await (const msg of stream) {
          if (!active) break
          const yjsData = msg.data?.data
          if (yjsData && yjsData.byteLength > 0) {
            let binary = ''
            for (let i = 0; i < yjsData.length; i++) {
              binary += String.fromCharCode(yjsData[i])
            }
            editorRef.current?.applyYjsMessage(btoa(binary))
          }
        }
      } catch (e) {
        console.error('subscribeYjsUpdate error', e)
      }
    }

    setup()

    return () => {
      active = false
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy()
      }
    }
  }, [noteId, editorRef])

  return {
    editorRef,
    noteId,
    setNoteId,
    isOpen,
    setIsOpen,
    isEditing,
    setIsEditing,
    keyboardHeight,
    setKeyboardHeight,
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

    isEdgeSwipeActive,
    setIsEdgeSwipeActive,
    imageActionRect,
    setImageActionRect,
    isImageActionSheetOpen,
    setIsImageActionSheetOpen,
    attachmentActionRect,
    setAttachmentActionRect,
    isAttachmentActionSheetOpen,
    setIsAttachmentActionSheetOpen,

    styleStateRef,
    styleStateVersion,
    slideAnim,
    isClosingRef,
    titleRef,
    noteContentRef,
    loadedNoteRef,
    isLoadingNoteRef,
    isEditorFocusedRef,

    noteData,
    hyperdriveServerAddress,
    moveFolders,

    resetEditorState,
    animateClose,
    closeNote,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
    handleYjsMessage,
  }
}
