import { getEditorFontSize, getFontFamily } from '@pear-notes/core/store/slices/settingsSlice.js'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import WebView, { WebViewMessageEvent } from 'react-native-webview'
import { useSelector } from 'react-redux'

import { TIPTAP_EDITOR_BUNDLE } from '../utils/tiptap-editor-bundle'

import { Theme, useTheme, useThemedStyles } from './Themed'

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
  insertFileAttachment: (url: string, fileName: string, fileSize: number, fileType: string) => void
  insertAudioAttachment: (url: string, fileName: string, duration?: number) => void
  updateImageSrc: (oldSrc: string, newSrc: string) => void
  focus: () => void
  blur: () => void
  save: () => Promise<void>
  getHTML: () => Promise<string | undefined>
  setHTML: (html: string) => void
  setTitle: (title: string) => void
  scrollToTop: () => void
  scrollToEnd: () => void
  setKeyboardInset: (height: number, scrollToCursor?: boolean) => void
}

export interface TiptapEditorProps {
  initialContent: string
  initialTitle?: string
  safeAreaTop?: number
  safeAreaBottom?: number
  onContentChange: (html: string) => void
  onTitleChange?: (title: string) => void
  onStyleStateChange?: (state: TiptapStyleState) => void
  onEditorFocus?: () => void
  onEditorBlur?: () => void
  onOpenAttachment?: (url: string, fileName: string) => void
  onDeleteAttachment?: (url: string) => void
}

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

const TiptapEditorComponent = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  (
    {
      initialContent,
      initialTitle,
      safeAreaTop,
      safeAreaBottom,
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
    const styles = useThemedStyles(createStyles)
    const theme = useTheme()
    const { colors } = theme
    const fontSize = useSelector(getEditorFontSize)
    const fontFamily = useSelector(getFontFamily)
    const webViewRef = useRef<WebView>(null)

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
    const isDarkRef = useRef(theme.isDark)
    const fontSizeRef = useRef(fontSize)
    const fontFamilyRef = useRef(fontFamily)
    const safeAreaTopRef = useRef(safeAreaTop ?? 100)
    colorsRef.current = colors
    isDarkRef.current = theme.isDark
    fontSizeRef.current = fontSize
    fontFamilyRef.current = fontFamily
    safeAreaTopRef.current = safeAreaTop ?? 100

    const editorReadyRef = useRef(false)

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
      [revealEditor, sendCommand],
    )

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

    const handleError = useCallback((_e: any) => {
      setEditorState('error')
    }, [])

    const handleRetry = useCallback(() => {
      editorReadyRef.current = false
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
        insertImage: (url, width, height) =>
          sendCommand({ type: 'insertImage', url, width, height }),
        insertFileAttachment: (url, fileName, fileSize, fileType) =>
          sendCommand({ type: 'insertFileAttachment', url, fileName, fileSize, fileType }),
        insertAudioAttachment: (url, fileName, duration) =>
          sendCommand({ type: 'insertAudioAttachment', url, fileName, duration }),
        updateImageSrc: (oldSrc, newSrc) => sendCommand({ type: 'updateImageSrc', oldSrc, newSrc }),
        focus: () => sendCommand({ type: 'focus' }),
        blur: () => sendCommand({ type: 'blur' }),
        save: async () => {
          const html = await getHTMLAsync()
          if (html !== undefined) onContentChangeRef.current(html)
        },
        getHTML: getHTMLAsync,
        setHTML: (html) => sendCommand({ type: 'setContent', html }),
        setTitle: (title) => sendCommand({ type: 'setTitle', title }),
        scrollToTop: () => sendCommand({ type: 'scrollToTop' }),
        scrollToEnd: () =>
          webViewRef.current?.injectJavaScript(
            `(function(){var pm=document.querySelector('.ProseMirror');if(pm&&pm.lastElementChild){pm.lastElementChild.scrollIntoView({block:'end',behavior:'smooth'})}else{window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}})();true;`,
          ),
        setKeyboardInset: (height: number, scrollToCursor?: boolean) =>
          webViewRef.current?.injectJavaScript(
            scrollToCursor
              ? `(function(){var h='${height}px';document.body.style.paddingBottom=h;var pm=document.querySelector('.ProseMirror');if(pm)pm.style.paddingBottom=h;setTimeout(function(){var s=window.getSelection();if(s&&s.rangeCount){var el=s.getRangeAt(0).startContainer;if(el.nodeType===3)el=el.parentElement;if(el&&el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'smooth'})}},50)})();true;`
              : `(function(){var h='${height}px';document.body.style.paddingBottom=h;var pm=document.querySelector('.ProseMirror');if(pm)pm.style.paddingBottom=h})();true;`,
          ),
      }),
      [sendCommand, getHTMLAsync],
    )

    return (
      <View style={styles.container}>
        {editorState === 'error' && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>Editor failed to load</Text>
            <Pressable onPress={handleRetry} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.flex, { paddingBottom: safeAreaBottom || 0 }]}>
          <WebView
            ref={webViewRef}
            source={{ html: TIPTAP_EDITOR_BUNDLE, baseUrl: 'https://localhost/' }}
            onMessage={handleMessage}
            onError={handleError}
            style={styles.webView}
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
            hideKeyboardAccessoryView
            cacheEnabled
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            startInLoadingState={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            decelerationRate="normal"
            allowsBackForwardNavigationGestures={false}
            textInteractionEnabled
          />
        </View>
      </View>
    )
  },
)

TiptapEditorComponent.displayName = 'TiptapEditor'

export const TiptapEditor = memo(TiptapEditorComponent)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    webView: { flex: 1, backgroundColor: theme.colors.background },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    errorText: {
      fontSize: 15,
      marginBottom: 12,
      color: theme.colors.textSecondary,
    },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    retryText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  })
