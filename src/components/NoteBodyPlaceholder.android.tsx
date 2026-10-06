import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import {
  PLACEHOLDER_BODY_LINE_HEIGHT,
  PLACEHOLDER_TITLE_LINE_HEIGHT,
  PLACEHOLDER_TITLE_SCALE,
  useEditorFontSize,
  useNoteBodyPlaceholder,
} from '@/components/useNoteBodyPlaceholder'
import {
  FontFamily,
  LetterSpacing,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_20,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  editorBackground?: string
}

type Props = {
  noteValue: object | null | undefined
  topInset: number
}

export const NoteBodyPlaceholder = memo(function NoteBodyPlaceholder({
  noteValue,
  topInset,
}: Props) {
  const { t } = useTranslation()
  const c = useMD3Theme().colors as ExtendedColors
  const fontSize = useEditorFontSize()
  const { title, preview, showShimmer } = useNoteBodyPlaceholder(noteValue)

  const styles = useMemo(() => {
    const titleSize = fontSize * PLACEHOLDER_TITLE_SCALE
    return StyleSheet.create({
      container: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        paddingTop: topInset,
        paddingHorizontal: UI_SIZE_20,
        backgroundColor: c.editorBackground ?? c.background,
      },
      title: {
        fontFamily: FontFamily.extraBold,
        fontSize: titleSize,
        lineHeight: titleSize * PLACEHOLDER_TITLE_LINE_HEIGHT,
        letterSpacing: LetterSpacing.tight,
        paddingTop: UI_SIZE_4,
        paddingBottom: UI_SIZE_12,
        color: c.onSurface,
      },
      titleEmpty: {
        color: c.onSurfaceVariant,
      },
      preview: {
        fontFamily: FontFamily.regular,
        fontSize,
        lineHeight: fontSize * PLACEHOLDER_BODY_LINE_HEIGHT,
        marginBottom: UI_SIZE_12,
        color: c.onSurface,
      },
    })
  }, [c.background, c.editorBackground, c.onSurface, c.onSurfaceVariant, fontSize, topInset])

  return (
    <View style={styles.container} pointerEvents="none" accessibilityState={{ busy: true }}>
      <Text style={[styles.title, !title && styles.titleEmpty]}>
        {title || t('noteEditor.titlePlaceholder')}
      </Text>
      {preview ? <Text style={styles.preview}>{preview}</Text> : null}
      {showShimmer ? (
        <LocalAiProcessing color={c.primary} captionColor={c.onSurfaceVariant} />
      ) : null}
    </View>
  )
})
