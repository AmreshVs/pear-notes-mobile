import { getEditorFontSize, getFontFamily } from '@pear-notes/core/store/slices/settingsSlice.js'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import WebView, { WebViewErrorEvent, WebViewMessageEvent } from 'react-native-webview'
import { useSelector } from 'react-redux'

import { TIPTAP_EDITOR_BUNDLE } from '../utils/tiptap-editor-bundle'

import { useTheme } from './Themed'

// ── Public types ──────────────────────────────────────────────────────────────

/** Style state broadcast on every cursor move / selection change. */
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
}

/** Imperative handle — superset of the old NoteEditorHandle. */
export interface TiptapEditorHandle {
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
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
  insertImage: (url: string, width: number, height: number) => void
  updateImageSrc: (oldSrc: string, newSrc: string) => void
  focus: () => void
  save: () => Promise<void>
  getHTML: () => Promise<string | undefined>
  setHTML: (html: string) => void
  setTitle: (title: string) => void
}

export interface TiptapEditorProps {
  initialContent: string
  initialTitle?: string
  /** Top padding (pts) for the title input so it clears a floating header overlay. */
  safeAreaTop?: number
  onContentChange: (html: string) => void
  onTitleChange?: (title: string) => void
  onStyleStateChange?: (state: TiptapStyleState) => void
  /** Called when the editor gains focus (keyboard about to appear). */
  onEditorFocus?: () => void
  /** Called when the editor loses focus (immediate save has been flushed). */
  onEditorBlur?: () => void
  /** Called when an attachment is tapped in the editor. */
  onOpenAttachment?: (url: string, fileName: string) => void
  /** Called when the delete button on an attachment is tapped. */
  onDeleteAttachment?: (url: string) => void
}

// ── Internal ──────────────────────────────────────────────────────────────────

type WebViewMsg =
  | { type: 'ready' }
  | { type: 'initialized' }
  | { type: 'contentChange'; html: string; text: string }
  | { type: 'titleChange'; title: string }
  | { type: 'styleState'; state: TiptapStyleState }
  | { type: 'htmlResponse'; requestId: string; html: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'openAttachment'; url: string; fileName: string }
  | { type: 'deleteAttachment'; url: string }

type EditorState = 'loading' | 'ready' | 'error'

// ── Component ─────────────────────────────────────────────────────────────────

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  (
    {
      initialContent,
      initialTitle,
      safeAreaTop,
      onContentChange,
      onTitleChange,
      onStyleStateChange,
      onEditorFocus,
      onEditorBlur,
      onOpenAttachment,
      onDeleteAttachment,
    },
    ref,
  ) => {
    const { colors, isDark } = useTheme()
    const fontSize = useSelector(getEditorFontSize)
    const fontFamily = useSelector(getFontFamily)
    const webViewRef = useRef<WebView>(null)

    // ── Stable refs so all closures see the latest values ───────────────
    const onContentChangeRef = useRef(onContentChange)
    const onTitleChangeRef = useRef(onTitleChange)
    const onStyleStateChangeRef = useRef(onStyleStateChange)
    const onEditorFocusRef = useRef(onEditorFocus)
    const onEditorBlurRef = useRef(onEditorBlur)
    const onOpenAttachmentRef = useRef(onOpenAttachment)
    const onDeleteAttachmentRef = useRef(onDeleteAttachment)

    onContentChangeRef.current = onContentChange
    onTitleChangeRef.current = onTitleChange
    onStyleStateChangeRef.current = onStyleStateChange
    onEditorFocusRef.current = onEditorFocus
    onEditorBlurRef.current = onEditorBlur
    onOpenAttachmentRef.current = onOpenAttachment
    onDeleteAttachmentRef.current = onDeleteAttachment

    const colorsRef = useRef(colors)
    const isDarkRef = useRef(isDark)
    const fontSizeRef = useRef(fontSize)
    const fontFamilyRef = useRef(fontFamily)
    const safeAreaTopRef = useRef(safeAreaTop ?? 100)
    colorsRef.current = colors
    isDarkRef.current = isDark
    fontSizeRef.current = fontSize
    fontFamilyRef.current = fontFamily
    safeAreaTopRef.current = safeAreaTop ?? 100

    const editorReadyRef = useRef(false)

    // Track initial title/content — updated until ready, then set explicitly
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

    // ── Pending getHTML promises ─────────────────────────────────────────
    const pendingRequests = useRef<Map<string, (html: string) => void>>(new Map())

    // ── UI state ─────────────────────────────────────────────────────────
    const [editorState, setEditorState] = useState<EditorState>('loading')

    const revealEditor = useCallback(() => {
      setEditorState('ready')
    }, [])

    // ── Send a command to the WebView ────────────────────────────────────
    const sendCommand = useCallback((command: object) => {
      const js = `(function(){if(window.editorBridge){window.editorBridge.handleMessage(${JSON.stringify(JSON.stringify(command))})}})();true;`
      webViewRef.current?.injectJavaScript(js)
    }, [])

    // ── Async getHTML with 3-second fallback ────────────────────────────
    const getHTMLAsync = useCallback((): Promise<string | undefined> => {
      return new Promise((resolve) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
        const timer = setTimeout(() => {
          pendingRequests.current.delete(id)
          resolve(undefined)
        }, 3000)
        pendingRequests.current.set(id, (html) => {
          clearTimeout(timer)
          resolve(html)
        })
        sendCommand({ type: 'getHTML', requestId: id })
      })
    }, [sendCommand])

    // ── Handle messages from WebView ─────────────────────────────────────
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
            // Send theme + font settings + title + initial content before revealing
            editorReadyRef.current = true
            sendCommand({
              type: 'init',
              colors: colorsRef.current,
              isDark: isDarkRef.current,
              fontSize: fontSizeRef.current,
              fontFamily: fontFamilyRef.current,
              title: initialTitleRef.current,
              html: initialContentRef.current,
              safeAreaTop: safeAreaTopRef.current,
            })
            break

          case 'initialized':
            // Theme and content are applied — fade in
            revealEditor()
            break

          case 'contentChange':
            onContentChangeRef.current(msg.html)
            break

          case 'titleChange':
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

          case 'openAttachment':
            onOpenAttachmentRef.current?.(msg.url, msg.fileName)
            break

          case 'deleteAttachment':
            onDeleteAttachmentRef.current?.(msg.url)
            break
        }
      },
      // sendCommand and revealEditor are stable; refs never change identity
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    )

    // ── Live theme propagation — no reload required ──────────────────────
    const prevIsDarkRef = useRef(isDark)
    useEffect(() => {
      if (prevIsDarkRef.current === isDark) return
      prevIsDarkRef.current = isDark
      if (editorReadyRef.current) {
        sendCommand({ type: 'setTheme', colors, isDark })
      }
    }, [isDark, colors, sendCommand])

    // ── Live font settings propagation ───────────────────────────────────
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

    // ── WebView error ─────────────────────────────────────────────────────
    const handleError = useCallback((_e: WebViewErrorEvent) => {
      setEditorState('error')
    }, [])

    const handleRetry = useCallback(() => {
      editorReadyRef.current = false
      setEditorState('loading')
      webViewRef.current?.reload()
    }, [])

    // ── Imperative handle ────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      toggleBold: () => sendCommand({ type: 'toggleBold' }),
      toggleItalic: () => sendCommand({ type: 'toggleItalic' }),
      toggleUnderline: () => sendCommand({ type: 'toggleUnderline' }),
      toggleStrike: () => sendCommand({ type: 'toggleStrike' }),
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
      insertImage: (url, width, height) => sendCommand({ type: 'insertImage', url, width, height }),
      updateImageSrc: (oldSrc, newSrc) => sendCommand({ type: 'updateImageSrc', oldSrc, newSrc }),
      focus: () => sendCommand({ type: 'focus' }),
      save: async () => {
        const html = await getHTMLAsync()
        if (html !== undefined) onContentChangeRef.current(html)
      },
      getHTML: getHTMLAsync,
      setHTML: (html) => sendCommand({ type: 'setContent', html }),
      setTitle: (title) => sendCommand({ type: 'setTitle', title }),
    }))

    // ── Render ────────────────────────────────────────────────────────────
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Error state with retry */}
        {editorState === 'error' && (
          <View style={styles.overlay}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Editor failed to load
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* WebView — shown at full opacity immediately; backgroundColor matches
            the screen so there is no visible flash while JS parses (~300ms,
            hidden behind the iOS push-navigation animation). */}
        <View style={styles.flex}>
          <WebView
            ref={webViewRef}
            source={{ html: TIPTAP_EDITOR_BUNDLE, baseUrl: 'https://localhost/' }}
            onMessage={handleMessage}
            onError={handleError}
            style={[styles.webView, { backgroundColor: colors.background }]}
            scrollEnabled
            keyboardDisplayRequiresUserAction={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            contentMode="mobile"
            setSupportMultipleWindows={false}
          />
        </View>
      </View>
    )
  },
)

TiptapEditor.displayName = 'TiptapEditor'

export { TiptapEditor }

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  webView: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    fontSize: 15,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
