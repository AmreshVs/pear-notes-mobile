import { memo, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { VoiceTypingBar } from '@/components/VoiceTypingBar'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Radii,
  UI_ICON_SIZE_16,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_36,
  UI_SIZE_52,
  UI_SIZE_400,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useKeyboardAnchoredBottom } from '@/hooks/useKeyboardAnchoredBottom'
import { ASK_QUESTION_MAX_CHARS } from '@/lib/localAi/askNote'

const INPUT_MAX_LINES_HEIGHT = 110

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
  const { colors } = useTheme()
  const styles = useStyles()
  const position = useKeyboardAnchoredBottom({ gap: UI_SIZE_8 })
  const micDisabled = busy || !ready
  return (
    <Animated.View style={[styles.composer, position]} onLayout={onLayout}>
      <View style={styles.underlay} />
      {dictating && (
        <View style={styles.dictationSlot}>
          <VoiceTypingBar
            visible={dictating}
            onLiveText={onDictationText}
            onCommit={onDictationCommit}
            onCancel={onDictationCancel}
          />
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={question}
          onChangeText={onChangeQuestion}
          placeholder={t(
            isEmpty ? 'localAi.askVault.placeholder' : 'localAi.askVault.followUpPlaceholder',
          )}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={ASK_QUESTION_MAX_CHARS}
          editable={!busy && ready && !dictating}
          style={styles.input}
          accessibilityLabel={t('localAi.askVault.inputLabel')}
        />
        {voiceReady && !dictating && (
          <Pressable
            onPress={onStartDictation}
            disabled={micDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.askVault.dictate')}
            style={({ pressed }) => [
              styles.micButton,
              micDisabled && commonStyles.disabled,
              pressed && commonStyles.pressed,
            ]}
          >
            <SymbolView
              name="mic"
              size={UI_ICON_SIZE_16}
              tintColor={colors.textSecondary}
              weight="semibold"
            />
          </Pressable>
        )}
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.askVault.send')}
          accessibilityState={{ disabled: !canSend }}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonIdle,
            pressed && commonStyles.pressed,
          ]}
        >
          <SymbolView
            name="arrow.up"
            size={UI_ICON_SIZE_16}
            tintColor={canSend ? colors.onPrimary : colors.textMuted}
            weight="bold"
          />
        </Pressable>
      </View>
    </Animated.View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    composer: {
      position: 'absolute',
      left: 0,
      right: 0,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingTop: UI_SIZE_8,
      backgroundColor: theme.colors.background,
    },
    dictationSlot: {
      height: UI_SIZE_52,
    },
    micButton: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    underlay: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      height: UI_SIZE_400,
      backgroundColor: theme.colors.background,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    input: {
      ...commonStyles.flex1,
      maxHeight: INPUT_MAX_LINES_HEIGHT,
      paddingHorizontal: UI_SIZE_14,
      paddingTop: UI_SIZE_10,
      paddingBottom: UI_SIZE_10,
      borderRadius: Radii.xl,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    sendButton: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.primary,
    },
    sendButtonIdle: {
      backgroundColor: theme.colors.controlBackground,
    },
  })
  return styles
})
