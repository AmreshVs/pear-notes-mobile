import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import WebView, { WebViewMessageEvent } from 'react-native-webview'
import { useSelector } from 'react-redux'

import * as log from '@pear-notes/core/log.js'
import { getEditorFontSize, getFontFamily } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { FontSize, FontWeight, UI_SIZE_8, UI_SIZE_12, UI_SIZE_20 } from '@/constants/commonStyles'
import type { SharedParagraph } from '@/lib/shareIntake.types'
import { EDITOR_ORIGIN_WHITELIST, shouldStartEditorLoad } from '@/lib/webViewNavigation'

import { TIPTAP_EDITOR_BUNDLE } from '../utils/tiptap-editor-bundle'

import { createThemedStylesheet, useFontScale, useTheme } from './Themed'

export interface TranscriptSummaryBlock {
  summaryTitle?: string
  summary?: string
  actionItemsTitle?: string
  actionItems?: string[]
  bullets?: string[]
}

export interface NoteTextEdit {
  find: string
  replace: string
  all?: boolean
}

export interface EditorSelection {
  from: number
  to: number
  text: string
}

export interface TiptapStyleState {
  bold: { isActive: boolean }
  italic: { isActive: boolean }
  underline: { isActive: boolean }
  strike: { isActive: boolean }
  h1: { isActive: boolean }
  h2: { isActive: boolean }
  h3: { isActive: boolean }
  unorderedList: { isActive: boolean }
  orderedList: { isActive: boolean }
  checkboxList: { isActive: boolean }
  blockQuote: { isActive: boolean }
  codeBlock: { isActive: boolean }
  link: { isActive: boolean }
  highlight: { isActive: boolean }
  subscript: { isActive: boolean }
  superscript: { isActive: boolean }
  alignLeft: { isActive: boolean }
  alignCenter: { isActive: boolean }
  alignRight: { isActive: boolean }
  alignJustify: { isActive: boolean }
  undo: { isActive: boolean }
  redo: { isActive: boolean }
  hasSelection: { isActive: boolean }
}

export interface TiptapEditorHandle {
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  toggleSubscript: () => void
  toggleSuperscript: () => void
  setHorizontalRule: () => void
  toggleH1: () => void
  toggleH2: () => void
  toggleH3: () => void
  toggleUnorderedList: () => void
  toggleOrderedList: () => void
  toggleCheckboxList: () => void
  toggleBlockQuote: () => void
  toggleCodeBlock: () => void
  toggleHighlight: () => void
  setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => void
  undo: () => void
  redo: () => void
  insertImage: (url: string, width: number, height: number) => void
  insertFileAttachment: (url: string, fileName: string, fileSize: number, fileType: string) => void
  insertAudioAttachment: (url: string, fileName: string, duration?: number) => void
  moveCursorToEnd: () => void
  appendParagraphs: (paragraphs: SharedParagraph[]) => void
  insertTranscript: (
    url: string | null,
    title: string,
    paragraphs: SharedParagraph[],
    summary?: TranscriptSummaryBlock,
    afterPos?: number,
  ) => void
  getSelection: (allowRemembered?: boolean) => Promise<EditorSelection | null>
  replaceRange: (
    from: number,
    to: number,
    expected: string,
    text: string,
    mode?: 'rewrite' | 'ask' | 'plain',
  ) => void
  applyEdits: (edits: NoteTextEdit[], range?: { from: number; to: number } | null) => void
  insertParagraphsAfter: (pos: number, text: string) => void
  startDictation: () => void
  updateDictation: (text: string) => void
  endDictation: (commit: boolean) => void
  insertCaption: (src: string | null, text: string) => void
  updateImageSrc: (oldSrc: string, newSrc: string) => void
  focus: () => void
  focusTitle: () => void
  blur: () => void
  collapseSelection: () => void
  keepSelection: () => void
  clearKeptSelection: () => void
  save: () => Promise<void>
  getHTML: () => Promise<string | undefined>
  setHTML: (html: string) => void
  loadNote: (noteId: string, html: string) => void
  setTitle: (title: string) => void
  scrollToTop: () => void
  revealLastInsert: (url?: string) => void
  setKeyboardInset: (height: number, scrollToCursor?: boolean) => void
  setBottomInset: (keyboardHeight: number, toolbarHeight: number) => void
  setAttachmentLoading: (
    url: string,
    loading: boolean,
    attachmentId?: string,
    progress?: number,
  ) => void
  setAttachmentThumbnail: (
    url: string,
    thumbnail: string,
    pageCount?: number,
    pageCountLabel?: string,
    attachmentId?: string,
  ) => void
  deleteImage: (src: string) => void
  deleteAttachment: (url: string) => void
}

export interface TiptapEditorProps {
  noteId: string
  initialContent: string
  initialTitle?: string
  safeAreaTop?: number
  safeAreaBottom?: number
  scrollEnabled?: boolean
  backgroundColor?: string
  onContentChange: (html: string) => void
  onTitleChange?: (title: string) => void
  onStyleStateChange?: (state: TiptapStyleState) => void
  onEditorFocus?: () => void
  onEditorBlur?: () => void
  onKeptSelectionCleared?: () => void
  onOpenAttachment?: (url: string, fileName: string) => void
  onPreviewAttachment?: (url: string, fileName: string, attachmentId: string) => void
  onRequestPdfThumbnail?: (url: string, fileName: string, attachmentId: string) => void
  onDeleteAttachment?: (url: string) => void
  onImageLongPress?: (
    src: string,
    rect?: { x: number; y: number; width: number; height: number },
  ) => void
  onAttachmentLongPress?: (
    url: string,
    fileName: string,
    rect?: { x: number; y: number; width: number; height: number },
    attachmentId?: string,
  ) => void
}

type WebViewMsg =
  | { type: 'ready' }
  | { type: 'initialized' }
  | { type: 'contentChange'; html: string; text: string }
  | { type: 'titleChange'; title: string }
  | { type: 'styleState'; state: TiptapStyleState }
  | { type: 'htmlResponse'; requestId: string; html: string }
  | { type: 'focus' }
  | { type: 'focusTitle' }
  | { type: 'blur' }
  | { type: 'collapseSelection' }
  | { type: 'keptSelectionCleared' }
  | { type: 'openAttachment'; url: string; fileName: string }
  | { type: 'previewAttachment'; url: string; fileName: string; attachmentId: string }
  | { type: 'requestPdfThumbnail'; url: string; fileName: string; attachmentId: string }
  | { type: 'deleteAttachment'; url: string }
  | {
      type: 'imageLongPress'
      src: string
      rect?: { x: number; y: number; width: number; height: number }
    }
  | {
      type: 'attachmentLongPress'
      url: string
      fileName: string
      rect?: { x: number; y: number; width: number; height: number }
      attachmentId?: string
    }
  | { type: 'selectionResponse'; requestId: string; from: number; to: number; text: string }

type EditorState = 'loading' | 'ready' | 'error'

const revealLastInsertJs = (url?: string) => `(function () {
  var pm = document.querySelector('.ProseMirror')
  if (!pm) return
  var url = ${JSON.stringify(url || '')}
  var nodes = pm.querySelectorAll('img, [data-file-attachment], [data-audio-attachment]')
  var target = null
  for (var i = nodes.length - 1; url && i >= 0; i--) {
    if (nodes[i].getAttribute('src') === url || nodes[i].getAttribute('data-url') === url) {
      target = nodes[i]
      break
    }
  }
  if (!target) target = nodes.length ? nodes[nodes.length - 1] : pm.lastElementChild
  if (!target) return
  while (target.parentElement && target.parentElement !== pm) target = target.parentElement
  var seq = (window.__pearRevealSeq || 0) + 1
  window.__pearRevealSeq = seq
  var done = false
  function reveal() {
    if (done) return
    done = true
    if (seq !== window.__pearRevealSeq || !target.isConnected) return
    var inset = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--bottom-inset')
    ) || 0
    var visibleBottom = window.innerHeight - inset
    var rect = target.getBoundingClientRect()
    if (rect.top >= 0 && rect.top < visibleBottom) return
    var margin = 16
    var delta = rect.height > visibleBottom - 2 * margin
      ? rect.top - margin
      : rect.bottom - visibleBottom + margin
    window.scrollBy(0, delta)
  }
  var img = target.tagName === 'IMG' ? target : target.querySelector('img')
  if (img && !img.complete) {
    img.addEventListener('load', reveal, { once: true })
    img.addEventListener('error', reveal, { once: true })
    setTimeout(reveal, 800)
  } else {
    reveal()
  }
})();
true;`

const iosWebViewProps =
  Platform.OS === 'ios'
    ? {
        keyboardDisplayRequiresUserAction: false as const,
        bounces: false,
        contentMode: 'mobile' as const,
        hideKeyboardAccessoryView: true,
        allowsInlineMediaPlayback: true,
        mediaPlaybackRequiresUserAction: false,
        decelerationRate: 'normal' as const,
        allowsBackForwardNavigationGestures: false,
        textInteractionEnabled: true,
      }
    : {}

const TiptapEditorComponent = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  (
    {
      noteId,
      initialContent,
      initialTitle,
      safeAreaTop,
      safeAreaBottom,
      scrollEnabled = true,
      backgroundColor,
      onContentChange,
      onTitleChange,
      onStyleStateChange,
      onEditorFocus,
      onEditorBlur,
      onKeptSelectionCleared,
      onOpenAttachment,
      onPreviewAttachment,
      onRequestPdfThumbnail,
      onDeleteAttachment,
      onImageLongPress,
      onAttachmentLongPress,
    },
    ref,
  ) => {
    const styles = useStyles()
    const { t } = useTranslation()
    const theme = useTheme()
    const { colors } = theme
    const editorFontSize = useSelector(getEditorFontSize)
    const systemFontScale = useFontScale()
    const fontSize = useMemo(
      () => Math.round(editorFontSize * systemFontScale),
      [editorFontSize, systemFontScale],
    )
    const fontFamily = useSelector(getFontFamily)
    const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
    const webViewRef = useRef<WebView>(null)

    const onContentChangeRef = useRef(onContentChange)
    const onTitleChangeRef = useRef(onTitleChange)
    const onStyleStateChangeRef = useRef(onStyleStateChange)
    const onEditorFocusRef = useRef(onEditorFocus)
    const onEditorBlurRef = useRef(onEditorBlur)
    const onKeptSelectionClearedRef = useRef(onKeptSelectionCleared)
    const onOpenAttachmentRef = useRef(onOpenAttachment)
    const onPreviewAttachmentRef = useRef(onPreviewAttachment)
    const onRequestPdfThumbnailRef = useRef(onRequestPdfThumbnail)
    const onDeleteAttachmentRef = useRef(onDeleteAttachment)
    const onImageLongPressRef = useRef(onImageLongPress)
    const onAttachmentLongPressRef = useRef(onAttachmentLongPress)

    onContentChangeRef.current = onContentChange
    onTitleChangeRef.current = onTitleChange
    onStyleStateChangeRef.current = onStyleStateChange
    onEditorFocusRef.current = onEditorFocus
    onEditorBlurRef.current = onEditorBlur
    onKeptSelectionClearedRef.current = onKeptSelectionCleared
    onOpenAttachmentRef.current = onOpenAttachment
    onPreviewAttachmentRef.current = onPreviewAttachment
    onRequestPdfThumbnailRef.current = onRequestPdfThumbnail
    onDeleteAttachmentRef.current = onDeleteAttachment
    onImageLongPressRef.current = onImageLongPress
    onAttachmentLongPressRef.current = onAttachmentLongPress

    const colorsRef = useRef(colors)
    const isDarkRef = useRef(theme.isDark)
    const fontSizeRef = useRef(fontSize)
    const fontFamilyRef = useRef(fontFamily)
    const hyperdriveServerAddressRef = useRef(hyperdriveServerAddress)
    const safeAreaTopRef = useRef(safeAreaTop ?? 100)
    const backgroundColorRef = useRef(backgroundColor)
    colorsRef.current = colors
    isDarkRef.current = theme.isDark
    fontSizeRef.current = fontSize
    fontFamilyRef.current = fontFamily
    hyperdriveServerAddressRef.current = hyperdriveServerAddress
    safeAreaTopRef.current = safeAreaTop ?? 100
    backgroundColorRef.current = backgroundColor

    const editorReadyRef = useRef(false)
    const editorInitializedRef = useRef(false)
    const pendingContentRef = useRef<string | null>(null)
    const pendingLoadNoteRef = useRef<{ noteId: string; html: string } | null>(null)
    const pendingTitleRef = useRef<string | null>(null)
    const currentNoteRef = useRef<{ noteId: string | null; html: string } | null>(null)
    const currentTitleRef = useRef<string | null>(null)

    const initialTitleRef = useRef(initialTitle ?? '')
    const initialContentRef = useRef(initialContent)
    useEffect(() => {
      if (!editorReadyRef.current) {
        initialTitleRef.current = initialTitle ?? ''
      }
    }, [initialTitle])
    useEffect(() => {
      if (!editorReadyRef.current) {
        initialContentRef.current = initialContent
      }
    }, [initialContent])

    const pendingRequests = useRef<Map<string, (html: string) => void>>(new Map())
    const pendingSelectionRequests = useRef<Map<string, (selection: EditorSelection) => void>>(
      new Map(),
    )

    const [editorState, setEditorState] = useState<EditorState>('loading')

    const revealEditor = useCallback(() => {
      setEditorState('ready')
    }, [])

    const sendCommand = useCallback((command: object) => {
      const payload = JSON.stringify(command)
      webViewRef.current?.injectJavaScript(
        `(function(){if(window.editorBridge){window.editorBridge.handleMessage(${JSON.stringify(payload)})}})();true;`,
      )
    }, [])

    const requestNativeWebViewFocus = useCallback(() => {
      if (Platform.OS !== 'android') return
      webViewRef.current?.requestFocus?.()
    }, [])

    const injectBackgroundColor = useCallback((color: string) => {
      const c = JSON.stringify(color)
      webViewRef.current?.injectJavaScript(
        `(function(){` +
          `var c=${c};` +
          `document.documentElement.style.backgroundColor=c;` +
          `document.body.style.backgroundColor=c;` +
          `var pm=document.querySelector('.ProseMirror');if(pm)pm.style.backgroundColor=c;` +
          `var s=document.getElementById('__pear_bg');` +
          `if(!s){s=document.createElement('style');s.id='__pear_bg';document.head.appendChild(s);}` +
          `s.textContent='html,body,.ProseMirror,.tiptap,#root,#app{background-color:'+c+' !important}';` +
          `})();true;`,
      )
    }, [])

    const getHTMLAsync = useCallback((): Promise<string | undefined> => {
      return new Promise((resolve) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
        const timer = setTimeout(() => {
          pendingRequests.current.delete(id)
          resolve(undefined)
        }, 3000)
        pendingRequests.current.set(id, (html: string) => {
          clearTimeout(timer)
          resolve(html)
        })
        sendCommand({ type: 'getHTML', requestId: id })
      })
    }, [sendCommand])

    const getSelectionAsync = useCallback(
      (allowRemembered = false): Promise<EditorSelection | null> => {
        return new Promise((resolve) => {
          const id = `sel_${Date.now()}_${Math.random().toString(36).slice(2)}`
          const timer = setTimeout(() => {
            pendingSelectionRequests.current.delete(id)
            resolve(null)
          }, 3000)
          pendingSelectionRequests.current.set(id, (selection) => {
            clearTimeout(timer)
            resolve(selection)
          })
          sendCommand({ type: 'getSelection', requestId: id, allowRemembered })
        })
      },
      [sendCommand],
    )

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        let msg: WebViewMsg
        try {
          msg = JSON.parse(event.nativeEvent.data)
        } catch {
          return
        }

        switch (msg.type) {
          case 'ready':
            editorReadyRef.current = true
            sendCommand({
              type: 'init',
              noteId,
              colors: backgroundColorRef.current
                ? { ...colorsRef.current, background: backgroundColorRef.current }
                : colorsRef.current,
              isDark: isDarkRef.current,
              fontSize: fontSizeRef.current,
              fontFamily: fontFamilyRef.current,
              title: initialTitleRef.current,
              html: initialContentRef.current,
              safeAreaTop: safeAreaTopRef.current,
              hyperdriveAddress: hyperdriveServerAddressRef.current,
            })
            break

          case 'initialized':
            editorInitializedRef.current = true
            revealEditor()
            if (backgroundColorRef.current) {
              injectBackgroundColor(backgroundColorRef.current)
            }
            if (pendingTitleRef.current !== null) {
              sendCommand({ type: 'setTitle', title: pendingTitleRef.current })
              pendingTitleRef.current = null
            }
            if (pendingContentRef.current !== null) {
              sendCommand({ type: 'setContent', html: pendingContentRef.current })
              pendingContentRef.current = null
            }
            if (pendingLoadNoteRef.current !== null) {
              sendCommand({ type: 'loadNote', ...pendingLoadNoteRef.current })
              pendingLoadNoteRef.current = null
            }
            break

          case 'contentChange':
            if (currentNoteRef.current) currentNoteRef.current.html = msg.html
            else currentNoteRef.current = { noteId: null, html: msg.html }
            onContentChangeRef.current(msg.html)
            break

          case 'titleChange':
            currentTitleRef.current = msg.title
            onTitleChangeRef.current?.(msg.title)
            break

          case 'styleState':
            onStyleStateChangeRef.current?.(msg.state)
            break

          case 'htmlResponse': {
            const resolve = pendingRequests.current.get(msg.requestId)
            if (resolve) {
              resolve(msg.html)
              pendingRequests.current.delete(msg.requestId)
            }
            break
          }

          case 'focus':
            onEditorFocusRef.current?.()
            break

          case 'blur':
            onEditorBlurRef.current?.()
            break

          case 'keptSelectionCleared':
            onKeptSelectionClearedRef.current?.()
            break

          case 'openAttachment':
            onOpenAttachmentRef.current?.(msg.url, msg.fileName)
            break

          case 'previewAttachment':
            onPreviewAttachmentRef.current?.(msg.url, msg.fileName, msg.attachmentId)
            break

          case 'requestPdfThumbnail':
            onRequestPdfThumbnailRef.current?.(msg.url, msg.fileName, msg.attachmentId)
            break

          case 'deleteAttachment':
            onDeleteAttachmentRef.current?.(msg.url)
            break

          case 'imageLongPress':
            onImageLongPressRef.current?.(msg.src, msg.rect)
            break

          case 'attachmentLongPress':
            onAttachmentLongPressRef.current?.(msg.url, msg.fileName, msg.rect, msg.attachmentId)
            break

          case 'selectionResponse': {
            const resolve = pendingSelectionRequests.current.get(msg.requestId)
            if (resolve) {
              pendingSelectionRequests.current.delete(msg.requestId)
              resolve({ from: msg.from, to: msg.to, text: msg.text })
            }
            break
          }
        }
      },
      [revealEditor, sendCommand, injectBackgroundColor, noteId],
    )

    useEffect(() => {
      if (backgroundColor && editorInitializedRef.current) {
        injectBackgroundColor(backgroundColor)
      }
    }, [backgroundColor, injectBackgroundColor])

    const prevIsDarkRef = useRef(theme.isDark)

    useEffect(() => {
      if (prevIsDarkRef.current === theme.isDark) return
      prevIsDarkRef.current = theme.isDark
      if (editorReadyRef.current) {
        sendCommand({ type: 'setTheme', colors, isDark: theme.isDark })
      }
    }, [theme.isDark, colors, sendCommand])

    const prevFontSizeRef = useRef(fontSize)
    const prevFontFamilyRef = useRef(fontFamily)

    useEffect(() => {
      if (prevFontSizeRef.current === fontSize && prevFontFamilyRef.current === fontFamily) return
      prevFontSizeRef.current = fontSize
      prevFontFamilyRef.current = fontFamily
      if (editorReadyRef.current) {
        sendCommand({ type: 'setFontSettings', fontSize, fontFamily })
      }
    }, [fontSize, fontFamily, sendCommand])

    const prevHyperdriveAddressRef = useRef(hyperdriveServerAddress)

    useEffect(() => {
      if (prevHyperdriveAddressRef.current === hyperdriveServerAddress) return
      prevHyperdriveAddressRef.current = hyperdriveServerAddress
      if (editorReadyRef.current) {
        sendCommand({ type: 'setHyperdriveAddress', address: hyperdriveServerAddress })
      }
    }, [hyperdriveServerAddress, sendCommand])

    const handleError = useCallback((_e: any) => {
      setEditorState('error')
    }, [])

    const handleRetry = useCallback(() => {
      editorReadyRef.current = false
      editorInitializedRef.current = false
      pendingContentRef.current = null
      pendingTitleRef.current = null
      setEditorState('loading')
      webViewRef.current?.reload()
    }, [])

    const handleProcessGone = useCallback(() => {
      log.warn('[editor] web content process ended, reloading the editor')
      const current = currentNoteRef.current
      editorReadyRef.current = false
      editorInitializedRef.current = false
      pendingContentRef.current = null
      pendingLoadNoteRef.current = null
      if (current?.noteId)
        pendingLoadNoteRef.current = { noteId: current.noteId, html: current.html }
      else if (current) pendingContentRef.current = current.html
      pendingTitleRef.current = currentTitleRef.current
      setEditorState('loading')
      webViewRef.current?.reload()
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        toggleBold: () => sendCommand({ type: 'toggleBold' }),
        toggleItalic: () => sendCommand({ type: 'toggleItalic' }),
        toggleUnderline: () => sendCommand({ type: 'toggleUnderline' }),
        toggleStrike: () => sendCommand({ type: 'toggleStrike' }),
        toggleSubscript: () => sendCommand({ type: 'toggleSubscript' }),
        toggleSuperscript: () => sendCommand({ type: 'toggleSuperscript' }),
        setHorizontalRule: () => sendCommand({ type: 'setHorizontalRule' }),
        toggleH1: () => sendCommand({ type: 'toggleH1' }),
        toggleH2: () => sendCommand({ type: 'toggleH2' }),
        toggleH3: () => sendCommand({ type: 'toggleH3' }),
        toggleUnorderedList: () => sendCommand({ type: 'toggleUnorderedList' }),
        toggleOrderedList: () => sendCommand({ type: 'toggleOrderedList' }),
        toggleCheckboxList: () => sendCommand({ type: 'toggleCheckboxList' }),
        toggleBlockQuote: () => sendCommand({ type: 'toggleBlockQuote' }),
        toggleCodeBlock: () => sendCommand({ type: 'toggleCodeBlock' }),
        toggleHighlight: () => sendCommand({ type: 'toggleHighlight' }),
        setTextAlign: (align) => sendCommand({ type: 'setTextAlign', align }),
        undo: () => sendCommand({ type: 'undo' }),
        redo: () => sendCommand({ type: 'redo' }),
        insertImage: (url, width, height) =>
          sendCommand({ type: 'insertImage', url, width, height }),
        insertFileAttachment: (url, fileName, fileSize, fileType) =>
          sendCommand({ type: 'insertFileAttachment', url, fileName, fileSize, fileType }),
        insertAudioAttachment: (url, fileName, duration) =>
          sendCommand({ type: 'insertAudioAttachment', url, fileName, duration }),
        moveCursorToEnd: () => sendCommand({ type: 'moveCursorToEnd' }),
        appendParagraphs: (paragraphs) => sendCommand({ type: 'appendParagraphs', paragraphs }),
        insertTranscript: (url, title, paragraphs, summary, afterPos) =>
          sendCommand({
            type: 'insertTranscript',
            url,
            title,
            paragraphs,
            afterPos,
            ...(summary ?? {}),
          }),
        getSelection: getSelectionAsync,
        replaceRange: (from, to, expected, text, mode = 'plain') =>
          sendCommand({ type: 'replaceRange', from, to, expected, text, mode }),
        applyEdits: (edits, range) =>
          sendCommand({ type: 'applyEdits', edits, from: range?.from, to: range?.to }),
        insertParagraphsAfter: (pos, text) =>
          sendCommand({ type: 'insertParagraphsAfter', pos, text }),
        startDictation: () => sendCommand({ type: 'dictationStart' }),
        updateDictation: (text) => sendCommand({ type: 'dictationUpdate', text }),
        endDictation: (commit) => sendCommand({ type: 'dictationEnd', commit }),
        insertCaption: (src, text) => sendCommand({ type: 'insertCaption', src, text }),
        updateImageSrc: (oldSrc, newSrc) => sendCommand({ type: 'updateImageSrc', oldSrc, newSrc }),
        focus: () => {
          requestNativeWebViewFocus()
          sendCommand({ type: 'focus' })
        },
        focusTitle: () => {
          requestNativeWebViewFocus()
          sendCommand({ type: 'focusTitle' })
        },
        collapseSelection: () => sendCommand({ type: 'collapseSelection' }),
        keepSelection: () => sendCommand({ type: 'keepSelection' }),
        clearKeptSelection: () => sendCommand({ type: 'clearKeptSelection' }),
        blur: () => {
          sendCommand({ type: 'blur' })
          webViewRef.current?.injectJavaScript(
            `(function(){try{document.activeElement&&document.activeElement.blur()}catch(e){}})();true;`,
          )
        },
        save: async () => {
          const html = await getHTMLAsync()
          if (html !== undefined) onContentChangeRef.current(html)
        },
        getHTML: getHTMLAsync,
        setHTML: (html) => {
          if (currentNoteRef.current) currentNoteRef.current.html = html
          else currentNoteRef.current = { noteId: null, html }
          if (!editorInitializedRef.current) {
            pendingContentRef.current = html
          } else {
            sendCommand({ type: 'setContent', html })
          }
        },
        loadNote: (noteId, html) => {
          currentNoteRef.current = { noteId, html }
          if (!editorInitializedRef.current) {
            pendingLoadNoteRef.current = { noteId, html }
          } else {
            sendCommand({ type: 'loadNote', noteId, html })
          }
        },
        setTitle: (title) => {
          currentTitleRef.current = title
          if (!editorInitializedRef.current) {
            pendingTitleRef.current = title
          } else {
            sendCommand({ type: 'setTitle', title })
          }
        },
        scrollToTop: () => sendCommand({ type: 'scrollToTop' }),
        setBottomInset: (keyboardHeight, toolbarHeight) =>
          sendCommand({ type: 'setBottomInset', keyboardHeight, toolbarHeight }),
        setAttachmentLoading: (url, loading, attachmentId, progress) =>
          sendCommand({ type: 'setAttachmentLoading', url, loading, attachmentId, progress }),
        setAttachmentThumbnail: (url, thumbnail, pageCount, pageCountLabel, attachmentId) =>
          sendCommand({
            type: 'setAttachmentThumbnail',
            url,
            thumbnail,
            pageCount,
            pageCountLabel,
            attachmentId,
          }),
        deleteImage: (src) => sendCommand({ type: 'deleteImage', src }),
        deleteAttachment: (url) => sendCommand({ type: 'deleteAttachment', url }),
        revealLastInsert: (url?: string) =>
          webViewRef.current?.injectJavaScript(revealLastInsertJs(url)),
        setKeyboardInset: (height: number, scrollToCursor?: boolean) =>
          webViewRef.current?.injectJavaScript(
            scrollToCursor
              ? `(function(){var h='${height}px';document.body.style.paddingBottom=h;var pm=document.querySelector('.ProseMirror');if(pm)pm.style.paddingBottom=h;if(document.activeElement&&document.activeElement.id==='note-title')return;setTimeout(function(){var s=window.getSelection();if(s&&s.rangeCount){var el=s.getRangeAt(0).startContainer;if(el.nodeType===3)el=el.parentElement;if(el&&el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'smooth'})}},50)})();true;`
              : `(function(){var h='${height}px';document.body.style.paddingBottom=h;var pm=document.querySelector('.ProseMirror');if(pm)pm.style.paddingBottom=h})();true;`,
          ),
      }),
      [sendCommand, getHTMLAsync, getSelectionAsync],
    )

    return (
      <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
        {editorState === 'error' && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{t('noteEditor.loadFailed')}</Text>
            <Pressable onPress={handleRetry} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('error.retry')}</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.flex, { paddingBottom: safeAreaBottom || 0 }]}>
          <WebView
            ref={webViewRef}
            source={{ html: TIPTAP_EDITOR_BUNDLE, baseUrl: 'https://localhost/' }}
            onMessage={handleMessage}
            onError={handleError}
            onContentProcessDidTerminate={handleProcessGone}
            onRenderProcessGone={handleProcessGone}
            style={[styles.webView, backgroundColor ? { backgroundColor } : null]}
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            originWhitelist={EDITOR_ORIGIN_WHITELIST}
            onShouldStartLoadWithRequest={shouldStartEditorLoad}
            javaScriptEnabled
            domStorageEnabled
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            setSupportMultipleWindows={false}
            cacheEnabled
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            startInLoadingState={false}
            {...iosWebViewProps}
          />
        </View>
      </View>
    )
  },
)

TiptapEditorComponent.displayName = 'TiptapEditor'

export const TiptapEditor = memo(TiptapEditorComponent)

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.editorBackground,
    },
    flex: {
      flex: 1,
    },
    webView: {
      flex: 1,
      backgroundColor: theme.colors.editorBackground,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    errorText: {
      fontSize: FontSize.subtitle,
      marginBottom: UI_SIZE_12,
      color: theme.colors.textSecondary,
    },
    retryBtn: {
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      borderColor: theme.colors.primary,
    },
    retryText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
  })
  return styles
})
