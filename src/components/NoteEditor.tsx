import React, { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
  type OnChangeStateEvent,
} from 'react-native-enriched'

import {
  commonStyles,
  FontSize,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_30,
  UI_SIZE_150,
} from '@/constants/commonStyles'

import { sanitizeTipTapHtml } from '../utils/sanitize-html'

import { createThemedStylesheet, useColors } from './Themed'

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
    const styles = useStyles()
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
        placeholderTextColor={colors.textMuted}
        onBlur={doSave}
        onChangeState={handleStyleStateChange}
        htmlStyle={styles.htmlStyle as any}
      />
    )
  },
)

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    input: {
      ...commonStyles.flex1,
      fontSize: FontSize.title,
      lineHeight: UI_SIZE_30,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_150,
      color: theme.colors.text,
    },
  })

  const htmlStyle = {
    h1: { fontSize: FontSize.heading, bold: true },
    h2: { fontSize: FontSize.title, bold: true },
    h3: { fontSize: FontSize.subtitle, bold: true },
    blockquote: {
      borderColor: theme.colors.primary,
      gapWidth: UI_SIZE_12,
      color: theme.colors.textSecondary,
    },
    codeblock: {
      color: theme.colors.codeBlockText,
      backgroundColor: theme.colors.codeBlockBg,
      borderRadius: UI_SIZE_10,
    },
    code: {
      color: theme.colors.codeText,
      backgroundColor: theme.colors.codeBg,
    },
    a: {
      color: theme.colors.primary,
      textDecorationLine: 'underline' as const,
    },
    ul: {
      bulletColor: theme.colors.primary,
      bulletSize: UI_SIZE_6,
      marginLeft: UI_SIZE_20,
      gapWidth: UI_SIZE_6,
    },
    ol: {
      markerColor: theme.colors.primary,
      marginLeft: UI_SIZE_20,
      gapWidth: UI_SIZE_6,
    },
    ulCheckbox: {
      boxColor: theme.colors.primary,
      boxSize: UI_SIZE_18,
      marginLeft: UI_SIZE_4,
      gapWidth: UI_SIZE_10,
    },
  }

  return {
    ...styles,
    htmlStyle,
  }
})

NoteEditorComponent.displayName = 'NoteEditor'

export const NoteEditor = memo(NoteEditorComponent)
