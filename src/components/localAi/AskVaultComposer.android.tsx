import { memo, type RefObject, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { VoiceTypingBar } from '@/components/VoiceTypingBar'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_20,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_48,
  UI_SIZE_400,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useKeyboardAnchoredBottom } from '@/hooks/useKeyboardAnchoredBottom'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { ASK_QUESTION_MAX_CHARS } from '@/lib/localAi/askNote'

const INPUT_MAX_LINES_HEIGHT = 120
const IDLE_FILL_ALPHA = 0.12

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHighest?: string
  onSurfaceVariant?: string
}

interface AskVaultComposerProps {
  question: string
  isEmpty: boolean
  busy: boolean
  ready: boolean
  canSend: boolean
  voiceReady: boolean
  dictating: boolean
  onChangeQuestion: (text: string) => void
  onSend: () => void
  onStartDictation: () => void
  onDictationText: (text: string) => void
  onDictationCommit: (text: string) => void
  onDictationCancel: () => void
  onLayout: (event: LayoutChangeEvent) => void
  inputRef: RefObject<TextInput | null>
}

export const AskVaultComposer = memo(function AskVaultComposer({
  question,
  isEmpty,
  busy,
  ready,
  canSend,
  voiceReady,
  dictating,
  onChangeQuestion,
  onSend,
  onStartDictation,
  onDictationText,
  onDictationCommit,
  onDictationCancel,
  onLayout,
  inputRef,
}: AskVaultComposerProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const position = useKeyboardAnchoredBottom({ gap: UI_SIZE_8 })
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const micDisabled = busy || !ready
  return (
    <Animated.View style={[styles.composer, position]} onLayout={onLayout}>
      <View style={styles.underlay} />
      {dictating && (
        <VoiceTypingBar
          visible={dictating}
          inline
          onLiveText={onDictationText}
          onCommit={onDictationCommit}
          onCancel={onDictationCancel}
        />
      )}
      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={question}
            onChangeText={onChangeQuestion}
            multiline
            maxLength={ASK_QUESTION_MAX_CHARS}
            editable={!busy && ready && !dictating}
            style={styles.input}
            accessibilityLabel={t('localAi.askVault.inputLabel')}
          />
          {question.length === 0 && (
            <Text
              numberOfLines={1}
              pointerEvents="none"
              importantForAccessibility="no"
              style={[styles.input, styles.placeholder]}
            >
              {t(isEmpty ? 'localAi.askVault.placeholder' : 'localAi.askVault.followUpPlaceholder')}
            </Text>
          )}
        </View>
        {voiceReady && !dictating && (
          <Pressable
            onPress={onStartDictation}
            disabled={micDisabled}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.askVault.dictate')}
            accessibilityState={{ disabled: micDisabled }}
            style={[styles.micButton, micDisabled && commonStyles.disabled]}
          >
            <MaterialCommunityIcons
              name="microphone-outline"
              size={UI_ICON_SIZE_20}
              color={mutedColor}
            />
          </Pressable>
        )}
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.askVault.send')}
          accessibilityState={{ disabled: !canSend }}
          style={[styles.sendButton, !canSend && styles.sendButtonIdle]}
        >
          <MaterialCommunityIcons
            name="send"
            size={UI_ICON_SIZE_20}
            color={canSend ? c.onPrimary : mutedColor}
          />
        </Pressable>
      </View>
    </Animated.View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    composer: {
      position: 'absolute',
      left: 0,
      right: 0,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingTop: UI_SIZE_8,
      backgroundColor: c.background,
    },
    underlay: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      height: UI_SIZE_400,
      backgroundColor: c.background,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    inputWrap: {
      ...commonStyles.flex1,
    },
    input: {
      maxHeight: INPUT_MAX_LINES_HEIGHT,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHighest ?? hexWithAlpha(c.onSurface, 0.06),
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    placeholder: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      backgroundColor: 'transparent',
      color: c.onSurfaceVariant ?? c.onSurface,
    },
    micButton: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    sendButton: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: c.primary,
    },
    sendButtonIdle: {
      backgroundColor: hexWithAlpha(c.onSurface, IDLE_FILL_ALPHA),
    },
  })
  return styles
}, useMD3Theme)
