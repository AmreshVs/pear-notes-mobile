import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  InteractionManager,
  Keyboard,
  type LayoutChangeEvent,
  TextInput,
} from 'react-native'
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { router } from 'expo-router'

import {
  ALL_NOTES_KEY,
  HYPERDRIVE_URL_PREFIX,
  RECENTLY_DELETED_KEY,
} from '@pear-notes/core/constant.js'
import {
  getEditorBaseKey,
  getEditorContent,
  getEditorSyncToken,
  getEditorTitle,
} from '@pear-notes/core/store/slices/editorSlice.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  flushNoteSaves,
  getNoteData,
  getSelectedNote,
  selectNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getHyperdriveServerAddress,
  getSearchQuery,
} from '@pear-notes/core/store/slices/uiSlice.js'
import { getVaultEnteredAt, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { useReduceMotion } from '@/components/Themed'
import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'
import { dismissKeyboard, subscribeKeyboardHidden } from '@/lib/keyboard'

const FOCUS_TITLE_DELAY = 250
const NOTE_LOADED_FALLBACK_MS = 3000
const EDITOR_RESET_FALLBACK_MS = 10000
const STRAY_FOCUS_WINDOW_MS = 2000
const IOS_TOOLBAR_INSET_TYPING = 76
const IOS_TOOLBAR_INSET_IDLE = 96
const ANDROID_TOOLBAR_INSET_TYPING = 72
const ANDROID_TOOLBAR_INSET_IDLE = 96

const PANE_OPEN = { duration: 300, easing: Easing.out(Easing.cubic) }
const PANE_CLOSE = { duration: 300, easing: Easing.inOut(Easing.cubic) }
const PANE_FLING_MIN_VELOCITY = 0.3
const PANE_FLING_MIN_DURATION = 120
const EASE_OUT_CUBIC_START_SLOPE = 3

function paneTiming(distance: number, toValue: number, releaseVelocity?: number) {
  if (!releaseVelocity || releaseVelocity < PANE_FLING_MIN_VELOCITY) {
    return toValue === 0 ? PANE_OPEN : PANE_CLOSE
  }
  const matchedDuration = (EASE_OUT_CUBIC_START_SLOPE * Math.abs(distance)) / releaseVelocity
  return {
    duration: Math.min(PANE_OPEN.duration, Math.max(PANE_FLING_MIN_DURATION, matchedDuration)),
    easing: PANE_OPEN.easing,
  }
}

export function useNoteEditor() {
  const reduceMotion = useReduceMotion()
  const editorRef = useRef<TiptapEditorHandle>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [editorOwnsKeyboard, setEditorOwnsKeyboard] = useState(false)
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
  const slideX = useSharedValue(Dimensions.get('window').width)
  const paneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }))

  const animatePane = useCallback(
    (toValue: number, onDone?: () => void, releaseVelocity?: number) => {
      if (reduceMotion) {
        cancelAnimation(slideX)
        slideX.value = toValue
        onDone?.()
        return
      }
      const callback = onDone
        ? () => {
            'worklet'
            scheduleOnRN(onDone)
          }
        : undefined
      const timing = paneTiming(toValue - slideX.value, toValue, releaseVelocity)
      slideX.value = withTiming(toValue, timing, callback)
    },
    [reduceMotion, slideX],
  )
  const paneWidthRef = useRef(Dimensions.get('window').width)
  const isClosingRef = useRef(false)
  const isOpenRef = useRef(false)
  const closeStartedAtRef = useRef(0)
  const titleRef = useRef<string>('')
  const noteContentRef = useRef<string>('')
  const loadedNoteRef = useRef<string | null>(null)
  const openedNoteRef = useRef<string | null>(null)
  const isLoadingNoteRef = useRef(false)
  const isEditorFocusedRef = useRef(false)
  const lastSyncTokenRef = useRef(-1)
  const shouldFocusTitleRef = useRef(false)
  const appliedHyperdriveAddressRef = useRef<string>('')
  const [placeholderNoteId, setPlaceholderNoteId] = useState<string | null>(null)

  const dispatch = useDispatch()
  const selectedNote = useSelector(getSelectedNote) as string | null
  const selectedNoteRef = useRef(selectedNote)
  selectedNoteRef.current = selectedNote
  const noteSelector = useMemo(() => getNoteData(noteId ?? ''), [noteId])
  const rawNoteData = useSelector(noteSelector)
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const noteDataRef = useRef(noteData)
  noteDataRef.current = noteData
  const markNoteLoaded = useCallback((id: string) => {
    if (id === openedNoteRef.current) setPlaceholderNoteId(null)
  }, [])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  const searchQuery = useSelector(getSearchQuery) as string
  const searchQueryRef = useRef(searchQuery)
  const store = useStore()
  const syncToken = useSelector(getEditorSyncToken) as number
  const editorBaseKey = useSelector(getEditorBaseKey) as string | null
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
      if (!isIos && (!isOpen || isClosingRef.current)) {
        const sinceClose = Date.now() - closeStartedAtRef.current
        if (sinceClose < STRAY_FOCUS_WINDOW_MS && !TextInput.State.currentlyFocusedInput()) {
          editorRef.current?.blur()
          dismissKeyboard()
        }
        return
      }
      if (!isOpen) return
      setKeyboardHeight(e.endCoordinates.height)
      setIsEditing(true)
      if (isIos) {
        editorRef.current?.setBottomInset(e.endCoordinates.height, IOS_TOOLBAR_INSET_TYPING)
      } else {
        editorRef.current?.setBottomInset(0, ANDROID_TOOLBAR_INSET_TYPING)
      }
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      if (!isOpen) return
      setKeyboardHeight(0)
      if (isIos) {
        editorRef.current?.setBottomInset(0, IOS_TOOLBAR_INSET_IDLE)
      } else {
        editorRef.current?.setBottomInset(0, ANDROID_TOOLBAR_INSET_IDLE)
        editorRef.current?.blur()
        setIsEditing(false)
        setEditorOwnsKeyboard(false)
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
      setEditorOwnsKeyboard(false)
      isEditorFocusedRef.current = false
      editorRef.current?.blur()
      if (isIos) editorRef.current?.setBottomInset(0, IOS_TOOLBAR_INSET_IDLE)
      else editorRef.current?.setBottomInset(0, ANDROID_TOOLBAR_INSET_IDLE)
    }

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') {
        Promise.resolve(editorRef.current?.save())
          .catch(() => {})
          .finally(() => dispatch(flushNoteSaves()))
        dismissKeyboard()
        if (!isIos) resetKeyboardLayout()
        return
      }
      if (next !== 'active') return
      if (isIos) {
        if (Keyboard.isVisible()) return
        resetKeyboardLayout()
        return
      }
      dismissKeyboard()
      resetKeyboardLayout()
    })

    return () => subscription.remove()
  }, [isOpen, dispatch])

  useEffect(
    () =>
      subscribeKeyboardHidden(() => {
        setKeyboardHeight(0)
        setEditorOwnsKeyboard(false)
      }),
    [],
  )

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setIsEdgeSwipeActive(false)
      setKeyboardHeight(0)
      setEditorOwnsKeyboard(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!noteId || noteId === openedNoteRef.current) return
    openedNoteRef.current = noteId
    setPlaceholderNoteId(noteDataRef.current?.bodyOmitted ? noteId : null)
    editorRef.current?.scrollToTop()
    animatePane(0)
  }, [noteId, animatePane])

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  useEffect(() => {
    if (!noteId || noteId === loadedNoteRef.current) return
    if (noteData?.bodyOmitted) return
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

    editorRef.current?.setTitle(noteData?.title || '')

    isLoadingNoteRef.current = true
    let sent = false
    const load = () => {
      if (sent || !editorRef.current) return
      sent = true
      editorRef.current.loadNote(noteId, content, (searchQueryRef.current || '').trim())
      setTimeout(() => markNoteLoaded(noteId), NOTE_LOADED_FALLBACK_MS)
    }
    load()
    InteractionManager.runAfterInteractions(() => {
      if (loadedNoteRef.current !== noteId) return
      load()
      if (shouldFocusTitleRef.current) {
        shouldFocusTitleRef.current = false
        setTimeout(() => editorRef.current?.focusTitle(), FOCUS_TITLE_DELAY)
      }
    })
  }, [noteId, noteData, hyperdriveServerAddress])

  useEffect(() => {
    if (!noteId || noteId === 'new' || noteId !== loadedNoteRef.current) return
    if (editorBaseKey !== noteId) return
    if (syncToken === lastSyncTokenRef.current) return
    lastSyncTokenRef.current = syncToken
    const state = store.getState()
    const editorContent = getEditorContent(state) as string
    const editorTitle = getEditorTitle(state) as string
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
  }, [noteId, editorBaseKey, syncToken, hyperdriveServerAddress, store])

  useEffect(() => {
    const previous = appliedHyperdriveAddressRef.current
    appliedHyperdriveAddressRef.current = hyperdriveServerAddress
    if (!previous || !hyperdriveServerAddress || previous === hyperdriveServerAddress) return
    if (!noteId || noteId !== loadedNoteRef.current) return

    const previousHost = previous.replace(/\/$/, '')
    const nextHost = hyperdriveServerAddress.replace(/\/$/, '')

    editorRef.current?.getHTML().then((html) => {
      if (!html || !html.includes(previousHost)) return
      editorRef.current?.setHTML(html.replaceAll(previousHost, nextHost))
    })
  }, [noteId, hyperdriveServerAddress])

  const getPaneWidth = useCallback(() => paneWidthRef.current, [])

  const handlePaneLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout
      if (!width || width === paneWidthRef.current) return
      paneWidthRef.current = width
      if (!isOpen) slideX.value = width
    },
    [isOpen, slideX],
  )

  const resetEditorState = useCallback(() => {
    editorRef.current?.clearNote()
    isOpenRef.current = false
    setIsOpen(false)
    setNoteId(null)
    setIsEdgeSwipeActive(false)
    loadedNoteRef.current = null
    openedNoteRef.current = null
    isClosingRef.current = false
  }, [])

  const animateClose = useCallback(
    (releaseVelocity?: number) => {
      if (isClosingRef.current) return
      isClosingRef.current = true
      closeStartedAtRef.current = Date.now()
      animatePane(
        paneWidthRef.current,
        () => {
          resetEditorState()
          if (process.env.EXPO_OS === 'android' && router.canGoBack()) router.back()
        },
        releaseVelocity,
      )
    },
    [resetEditorState, animatePane],
  )

  const closeNoteWithVelocity = useCallback(
    (releaseVelocity?: number) => {
      editorRef.current?.blur()
      dismissKeyboard()
      Promise.resolve(editorRef.current?.save())
        .catch(() => {})
        .finally(() => dispatch(flushNoteSaves()))
      animateClose(releaseVelocity)
    },
    [animateClose, dispatch],
  )

  const closeNote = useCallback(() => closeNoteWithVelocity(), [closeNoteWithVelocity])

  const vaultPending = useSelector(getVaultPending)
  const vaultEnteredAt = useSelector(getVaultEnteredAt)

  useEffect(() => {
    if (!vaultPending || vaultPending === 'rename' || !isOpenRef.current) return
    closeNote()
  }, [vaultPending, closeNote])

  useEffect(() => {
    if (vaultEnteredAt && isOpenRef.current) resetEditorState()
  }, [vaultEnteredAt, resetEditorState])

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

  const handleNoteLoaded = useCallback((id: string) => markNoteLoaded(id), [markNoteLoaded])

  // While a dead editor page is rebuilt, show the note's placeholder rather than a blank page.
  const handleEditorReset = useCallback(() => {
    const id = openedNoteRef.current
    if (!id) return
    setPlaceholderNoteId(id)
    setTimeout(() => markNoteLoaded(id), EDITOR_RESET_FALLBACK_MS)
  }, [markNoteLoaded])

  const openNote = useCallback(
    (id: string, options?: { focusTitle?: boolean }) => {
      if (selectedNoteRef.current !== id) dispatch(selectNote(id as any))
      dismissKeyboard()
      setIsEditing(false)
      setEditorOwnsKeyboard(false)
      editorRef.current?.blur()
      loadedNoteRef.current = null
      openedNoteRef.current = null
      shouldFocusTitleRef.current = options?.focusTitle === true
      setNoteId(id)
      isOpenRef.current = true
      setIsOpen(true)
    },
    [dispatch],
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
    if (!isOpenRef.current || isClosingRef.current) {
      editorRef.current?.blur()
      dismissKeyboard()
      return
    }
    isEditorFocusedRef.current = true
    setEditorOwnsKeyboard(true)
  }, [])

  const handleEditorBlur = useCallback(() => {
    isEditorFocusedRef.current = false
    setEditorOwnsKeyboard(false)
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

  return {
    editorRef,
    noteId,
    showBodyPlaceholder: !!noteId && placeholderNoteId === noteId,
    handleNoteLoaded,
    handleEditorReset,
    setNoteId,
    isOpen,
    setIsOpen,
    isEditing,
    setIsEditing,
    keyboardHeight,
    setKeyboardHeight,
    editorOwnsKeyboard,
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
    slideX,
    paneStyle,
    animatePane,
    handlePaneLayout,
    getPaneWidth,
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
    closeNoteWithVelocity,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
  }
}
