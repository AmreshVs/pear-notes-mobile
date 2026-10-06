import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
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

type Props = {
  noteValue: object | null | undefined
  topInset: number
}

const useStyles = createThemedStylesheetWithHooks((theme, fontSize: number) => {
  const titleSize = fontSize * PLACEHOLDER_TITLE_SCALE
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      paddingHorizontal: UI_SIZE_20,
      backgroundColor: theme.colors.editorBackground,
    },
    title: {
      fontFamily: FontFamily.extraBold,
      fontSize: titleSize,
      lineHeight: titleSize * PLACEHOLDER_TITLE_LINE_HEIGHT,
      letterSpacing: LetterSpacing.tight,
      paddingTop: UI_SIZE_4,
      paddingBottom: UI_SIZE_12,
      color: theme.colors.text,
    },
    titleEmpty: {
      color: theme.colors.textSecondary,
    },
    preview: {
      fontFamily: FontFamily.regular,
      fontSize,
      lineHeight: fontSize * PLACEHOLDER_BODY_LINE_HEIGHT,
      marginBottom: UI_SIZE_12,
      color: theme.colors.text,
    },
  })
  return styles
}, useEditorFontSize)

export const NoteBodyPlaceholder = memo(function NoteBodyPlaceholder({
  noteValue,
  topInset,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { title, preview, showShimmer } = useNoteBodyPlaceholder(noteValue)
  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: topInset }],
    [styles.container, topInset],
  )

  return (
    <View style={containerStyle} pointerEvents="none" accessibilityState={{ busy: true }}>
      <Text style={[styles.title, !title && styles.titleEmpty]}>
        {title || t('noteEditor.titlePlaceholder')}
      </Text>
      {preview ? <Text style={styles.preview}>{preview}</Text> : null}
      {showShimmer ? (
        <LocalAiProcessing color={colors.primary} captionColor={colors.textSecondary} />
      ) : null}
    </View>
  )
})
