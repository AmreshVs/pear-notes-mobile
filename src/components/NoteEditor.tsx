import React, { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
  type OnChangeStateEvent,
} from 'react-native-enriched'

import { sanitizeTipTapHtml } from '../utils/sanitize-html'

import { Theme, useColors, useThemedStyles } from './Themed'

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

const NoteEditorComponent = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ initialContent, onContentChange, onStyleStateChange }, ref) => {
    const { t } = useTranslation()
    const styles = useThemedStyles(createStyles)
    const colors = useColors()
    const inputRef = useRef<EnrichedTextInputInstance>(null)
    const onContentChangeRef = useRef(onContentChange)
    onContentChangeRef.current = onContentChange

    const sanitizedContent = useMemo(() => sanitizeTipTapHtml(initialContent), [initialContent])

    const doSave = useCallback(async () => {
      const html = await inputRef.current?.getHTML()
      if (html !== undefined) {
        onContentChangeRef.current(html)
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
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
      }),
      [doSave],
    )

    const handleStyleStateChange = useCallback(
      (e: any) => {
        onStyleStateChange?.(e.nativeEvent)
      },
      [onStyleStateChange],
    )

    return (
      <EnrichedTextInput
        ref={inputRef}
        defaultValue={sanitizedContent}
        style={styles.input}
        autoCapitalize="sentences"
        placeholder={t('noteEditor.placeholder')}
        placeholderTextColor={colors.separator}
        onBlur={doSave}
        onChangeState={handleStyleStateChange}
        htmlStyle={styles.htmlStyle as any}
      />
    )
  },
)

const createStyles = (theme: Theme) => ({
  input: {
    flex: 1,
    fontSize: 18,
    lineHeight: 30,
    paddingHorizontal: 20,
    paddingBottom: 150,
    color: theme.colors.text,
  },
  htmlStyle: {
    h1: { fontSize: 26, bold: true },
    h2: { fontSize: 22, bold: true },
    h3: { fontSize: 19, bold: true },
    blockquote: {
      borderColor: theme.colors.primary,
      borderWidth: 3,
      gapWidth: 12,
      color: theme.colors.textSecondary,
    },
    codeblock: {
      color: theme.isDark ? '#A8FF78' : '#333',
      backgroundColor: theme.isDark ? '#1C1C1E' : '#F4F4F5',
      borderRadius: 10,
    },
    code: {
      color: theme.isDark ? '#A8FF78' : '#333',
      backgroundColor: theme.isDark ? '#2C2C2E' : '#F4F4F5',
    },
    a: {
      color: theme.colors.primary,
      textDecorationLine: 'underline' as const,
    },
    ul: {
      bulletColor: theme.colors.primary,
      bulletSize: 6,
      marginLeft: 20,
      gapWidth: 6,
    },
    ol: {
      markerColor: theme.colors.primary,
      marginLeft: 20,
      gapWidth: 6,
    },
    ulCheckbox: {
      boxColor: theme.colors.primary,
      boxSize: 18,
      marginLeft: 4,
      gapWidth: 10,
    },
  },
})

NoteEditorComponent.displayName = 'NoteEditor'

export const NoteEditor = memo(NoteEditorComponent)
