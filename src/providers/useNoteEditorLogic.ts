import {
  ALL_NOTES_KEY,
  HYPERDRIVE_URL_PREFIX,
  RECENTLY_DELETED_KEY,
} from '@pear-notes/core/constant.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, InteractionManager, Keyboard } from 'react-native'
import { useSelector } from 'react-redux'

import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'

export function useNoteEditorLogic() {
  const editorRef = useRef<TiptapEditorHandle>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isSharing, setIsSharing] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<{ fileName: string; status: string } | null>(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [selectedAttachmentSrc, setSelectedAttachmentSrc] = useState<string | null>(null)
  const [selectedAttachmentFileName, setSelectedAttachmentFileName] = useState<string | null>(null)

  const [moveDialogVisible, setMoveDialogVisible] = useState(false)
  const [moreSheetVisible, setMoreSheetVisible] = useState(false)
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
    const isIos = process.env.EXPO_OS === 'ios'
    const showEvent = isIos ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = isIos ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, (e) => {
      if (!isOpen) return
      setKeyboardHeight(e.endCoordinates.height)
      setIsEditing(true)
      if (!isIos) {
        setTimeout(() => {
          editorRef.current?.setKeyboardInset(50, true)
        }, 50)
      }
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      if (!isOpen) return
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
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
  }
}
