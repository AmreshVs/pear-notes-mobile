import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { StyleSheet } from 'react-native'
import WebView from 'react-native-webview'

import { useTheme } from './Themed'

interface NoteEditorProps {
  initialContent: string
  onContentChange: (html: string, text: string) => void
  onReady?: () => void
}

export interface NoteEditorHandle {
  runCommand: (commandStr: string) => void
}

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ initialContent, onContentChange, onReady }, ref) => {
    const { colors, isDark } = useTheme()
    const webViewRef = useRef<WebView>(null)
    const onContentChangeRef = useRef(onContentChange)
    const onReadyRef = useRef(onReady)
    onContentChangeRef.current = onContentChange
    onReadyRef.current = onReady

    useImperativeHandle(ref, () => ({
      runCommand: (commandStr: string) => {
        webViewRef.current?.injectJavaScript(`
          if (window.editor) { 
            window.editor.chain().focus().${commandStr}.run(); 
          }
          true;
        `)
      },
    }))

    const html = useMemo(
      () => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { background-color: ${colors.background}; margin: 0; padding: 0; overflow-x: hidden; }
      body { padding: 0 20px 180px 20px; font-size: 17px; line-height: 1.65; color: ${colors.text}; }
      .ProseMirror { min-height: 60vh; outline: none; word-break: break-word; }
      .ProseMirror p.is-editor-empty:first-child::before {
        color: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'};
        content: attr(data-placeholder); float: left; height: 0; pointer-events: none;
      }
      h1 { font-size: 24px; font-weight: 800; margin: 1.4rem 0 0.4rem; letter-spacing: -0.5px; color: ${colors.text}; }
      h2 { font-size: 20px; font-weight: 700; margin: 1.2rem 0 0.4rem; letter-spacing: -0.3px; color: ${colors.text}; }
      p { margin: 0.3rem 0; }
      ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
      li { margin: 0.2rem 0; }
      ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
      ul[data-type="taskList"] li > label { flex: 0 0 auto; padding-top: 2px; }
      ul[data-type="taskList"] li > label input[type="checkbox"] {
        width: 18px; height: 18px; border-radius: 4px; cursor: pointer; accent-color: ${colors.primary};
      }
      ul[data-type="taskList"] li > div { flex: 1; }
      blockquote { border-left: 3px solid ${colors.primary}; color: ${colors.textSecondary}; margin: 0.5rem 0 0.5rem 0; padding-left: 1rem; }
      pre { background: ${isDark ? '#2C2C2E' : '#f4f4f5'}; border-radius: 10px; padding: 1rem; overflow-x: auto; margin: 0.5rem 0; }
      code { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; background: ${isDark ? '#2C2C2E' : '#f4f4f5'}; padding: 0.15em 0.35em; border-radius: 4px; font-size: 85%; }
      pre code { background: none; padding: 0; font-size: 14px; }
      a { color: ${colors.primary}; }
      strong { font-weight: 700; color: ${colors.text}; }
      em { color: ${colors.text}; }
    </style>
    <script type="module">
      import { Editor } from 'https://esm.sh/@tiptap/core@2.11.5';
      import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.11.5';
      import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.11.5';
      import TaskList from 'https://esm.sh/@tiptap/extension-task-list@2.11.5';
      import TaskItem from 'https://esm.sh/@tiptap/extension-task-item@2.11.5';
      
      const editor = new Editor({
        element: document.querySelector('#editor'),
        extensions: [
          StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
          Placeholder.configure({ placeholder: 'Start writing...' }),
          TaskList,
          TaskItem.configure({ nested: true })
        ],
        content: ${JSON.stringify(initialContent || '')},
        onUpdate: ({ editor }) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'update',
            html: editor.getHTML(),
            text: editor.getText()
          }));
        },
        onCreate: ({ editor }) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      });
      window.editor = editor;
    </script>
  </head>
  <body><div id="editor"></div></body>
</html>`,
      // Only recreate when theme changes, not on every parent re-render
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [colors.background, colors.text, colors.primary, colors.textSecondary, isDark],
    )

    return (
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { backgroundColor: colors.background }]}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data)
          if (data.type === 'ready') {
            onReadyRef.current?.()
          } else if (data.type === 'update') {
            onContentChangeRef.current(data.html, data.text)
          }
        }}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        allowsInlineMediaPlayback
        dataDetectorTypes="none"
        mixedContentMode="always"
      />
    )
  },
)

NoteEditor.displayName = 'NoteEditor'

export { NoteEditor }

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
})
