import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
  type OnChangeStateEvent,
} from 'react-native-enriched'

import { useTheme } from './Themed'

interface NoteEditorProps {
  initialContent: string
  onContentChange: (html: string) => void
  onStyleStateChange?: (state: OnChangeStateEvent) => void
}

export interface NoteEditorHandle {
  toggleBold: () => void
  toggleItalic: () => void
  toggleH1: () => void
  toggleH2: () => void
  toggleUnorderedList: () => void
  toggleOrderedList: () => void
  toggleCheckboxList: () => void
  toggleBlockQuote: () => void
  toggleCodeBlock: () => void
  insertImage: (url: string, width: number, height: number) => void
  focus: () => void
  save: () => Promise<void>
  getHTML: () => Promise<string | undefined>
  setHTML: (html: string) => void
}

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ initialContent, onContentChange, onStyleStateChange }, ref) => {
    const { colors, isDark } = useTheme()
    const inputRef = useRef<EnrichedTextInputInstance>(null)
    const onContentChangeRef = useRef(onContentChange)
    onContentChangeRef.current = onContentChange

    const doSave = async () => {
      const html = await inputRef.current?.getHTML()
      if (html !== undefined) {
        onContentChangeRef.current(html)
      }
    }

    useImperativeHandle(ref, () => ({
      toggleBold: () => inputRef.current?.toggleBold(),
      toggleItalic: () => inputRef.current?.toggleItalic(),
      toggleH1: () => inputRef.current?.toggleH1(),
      toggleH2: () => inputRef.current?.toggleH2(),
      toggleUnorderedList: () => inputRef.current?.toggleUnorderedList(),
      toggleOrderedList: () => inputRef.current?.toggleOrderedList(),
      toggleCheckboxList: () => inputRef.current?.toggleCheckboxList(false),
      toggleBlockQuote: () => inputRef.current?.toggleBlockQuote(),
      toggleCodeBlock: () => inputRef.current?.toggleCodeBlock(),
      insertImage: (url: string, width: number, height: number) =>
        inputRef.current?.setImage(url, width, height),
      focus: () => inputRef.current?.focus(),
      save: doSave,
      getHTML: async () => {
        const html = await inputRef.current?.getHTML()
        return html
      },
      setHTML: (html: string) => inputRef.current?.setValue(html),
    }))

    return (
      <EnrichedTextInput
        ref={inputRef}
        defaultValue={initialContent}
        style={{
          flex: 1,
          fontSize: 18,
          lineHeight: 30,
          paddingHorizontal: 20,
          paddingBottom: 150,
          color: colors.text,
        }}
        autoCapitalize="sentences"
        placeholder="Start writing..."
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
        onBlur={doSave}
        onChangeState={(e) => onStyleStateChange?.(e.nativeEvent)}
        htmlStyle={{
          h1: { fontSize: 26, bold: true },
          h2: { fontSize: 22, bold: true },
          h3: { fontSize: 19, bold: true },
          blockquote: {
            borderColor: colors.primary,
            borderWidth: 3,
            gapWidth: 12,
            color: colors.textSecondary,
          },
          codeblock: {
            color: isDark ? '#A8FF78' : '#333',
            backgroundColor: isDark ? '#1C1C1E' : '#F4F4F5',
            borderRadius: 10,
          },
          code: {
            color: isDark ? '#A8FF78' : '#333',
            backgroundColor: isDark ? '#2C2C2E' : '#F4F4F5',
          },
          a: {
            color: colors.primary,
            textDecorationLine: 'underline',
          },
          ul: {
            bulletColor: colors.primary,
            bulletSize: 6,
            marginLeft: 20,
            gapWidth: 6,
          },
          ol: {
            markerColor: colors.primary,
            marginLeft: 20,
            gapWidth: 6,
          },
          ulCheckbox: {
            boxColor: colors.primary,
            boxSize: 18,
            marginLeft: 4,
            gapWidth: 10,
          },
        }}
      />
    )
  },
)

NoteEditor.displayName = 'NoteEditor'

export { NoteEditor }
