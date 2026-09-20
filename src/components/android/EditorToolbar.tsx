import React, { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  type PressableAndroidRippleConfig,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { ScrollEdgeFade } from '@/components/ScrollEdgeFade'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'
import { useAiEditButtonMotion } from '@/components/useAiEditButtonMotion'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_24,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useKeyboardAnchoredBottom } from '@/hooks/useKeyboardAnchoredBottom'
import { useScrollEdgeFade } from '@/hooks/useScrollEdgeFade'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticLight } from '@/lib/haptics'

type ToolbarBtnProps = {
  icon: string
  onPress: () => void
  active?: boolean
  disabled?: boolean
  a11yLabel: string
  ripple: PressableAndroidRippleConfig | undefined
  c: any
  styles: any
}

const ToolbarBtn = memo(function ToolbarBtn({
  icon,
  onPress,
  active,
  disabled,
  a11yLabel,
  ripple,
  c,
  styles,
}: ToolbarBtnProps) {
  const style = useMemo(
    () => [styles.btn, active && styles.btnActive, disabled && commonStyles.disabled],
    [active, disabled, styles.btn, styles.btnActive],
  )
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={ripple}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={UI_ICON_SIZE_22}
        color={active ? c.primary : c.onSurface}
      />
    </Pressable>
  )
})

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerLow?: string
}

/**
 * The editor page is white in light mode, so the bar has to sit a step *below*
 * it rather than above it. Dark mode keeps its original container tone.
 */
const toolbarSurfaceFor = (c: ExtendedColors, isDark: boolean) =>
  (isDark ? c.surfaceContainerHigh : c.surfaceContainerLow) ?? c.surface

type EditorToolbarProps = {
  isActive: (key: keyof TiptapStyleState) => boolean
  editorRef: React.RefObject<TiptapEditorHandle | null>
  onAttachPress: () => void
  onVoiceTyping?: () => void
  onAiTools?: () => void
  keyboardAnchored?: boolean
}

export const EditorToolbar = memo(function EditorToolbar({
  isActive,
  editorRef,
  onAttachPress,
  onVoiceTyping,
  onAiTools,
  keyboardAnchored = true,
}: EditorToolbarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { showEndFade, handleScrollLayout, handleContentSizeChange, handleScroll } =
    useScrollEdgeFade()

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleAttach = useMemo(() => androidRipple(c.onPrimaryContainer), [c.onPrimaryContainer])

  const run = useCallback((action: () => void) => {
    hapticLight()
    action()
  }, [])
  const hasSelection = !!onAiTools && isActive('hasSelection')
  const aiMotion = useAiEditButtonMotion(hasSelection)

  const containerStyle = useKeyboardAnchoredBottom({
    gap: UI_SIZE_12,
    enabled: keyboardAnchored,
  })

  return (
    <MotionView style={[styles.row, containerStyle]}>
      <View style={styles.container}>
      <View style={styles.scrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          onLayout={handleScrollLayout}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <ToolbarBtn
            icon="undo"
            a11yLabel={t('formatting.undo')}
            disabled={!isActive('undo')}
            onPress={() => run(() => editorRef.current?.undo())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="redo"
            a11yLabel={t('formatting.redo')}
            disabled={!isActive('redo')}
            onPress={() => run(() => editorRef.current?.redo())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <View style={styles.divider} />
          <ToolbarBtn
            icon="format-header-1"
            a11yLabel={t('formatting.types.title')}
            active={isActive('h1')}
            onPress={() => run(() => editorRef.current?.toggleH1())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-header-2"
            a11yLabel={t('formatting.types.heading')}
            active={isActive('h2')}
            onPress={() => run(() => editorRef.current?.toggleH2())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-header-3"
            a11yLabel={t('formatting.types.subheading')}
            active={isActive('h3')}
            onPress={() => run(() => editorRef.current?.toggleH3())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-bold"
            a11yLabel={t('formatting.bold')}
            active={isActive('bold')}
            onPress={() => run(() => editorRef.current?.toggleBold())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-italic"
            a11yLabel={t('formatting.italic')}
            active={isActive('italic')}
            onPress={() => run(() => editorRef.current?.toggleItalic())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-underline"
            a11yLabel={t('formatting.underline')}
            active={isActive('underline')}
            onPress={() => run(() => editorRef.current?.toggleUnderline())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-strikethrough-variant"
            a11yLabel={t('formatting.strikethrough')}
            active={isActive('strike')}
            onPress={() => run(() => editorRef.current?.toggleStrike())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-color-highlight"
            a11yLabel={t('formatting.highlight')}
            active={isActive('highlight')}
            onPress={() => run(() => editorRef.current?.toggleHighlight())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-subscript"
            a11yLabel={t('formatting.subscript')}
            active={isActive('subscript')}
            onPress={() => run(() => editorRef.current?.toggleSubscript())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-superscript"
            a11yLabel={t('formatting.superscript')}
            active={isActive('superscript')}
            onPress={() => run(() => editorRef.current?.toggleSuperscript())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-list-bulleted"
            a11yLabel={t('formatting.types.bulletedList')}
            active={isActive('unorderedList')}
            onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-list-numbered"
            a11yLabel={t('formatting.types.numberedList')}
            active={isActive('orderedList')}
            onPress={() => run(() => editorRef.current?.toggleOrderedList())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="checkbox-marked-outline"
            a11yLabel={t('formatting.checklist')}
            active={isActive('checkboxList')}
            onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-quote-close"
            a11yLabel={t('formatting.types.quoteBlock')}
            active={isActive('blockQuote')}
            onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="code-tags"
            a11yLabel={t('formatting.codeBlock')}
            active={isActive('codeBlock')}
            onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="minus"
            a11yLabel={t('formatting.horizontalRule')}
            onPress={() => run(() => editorRef.current?.setHorizontalRule())}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <View style={styles.divider} />
          <ToolbarBtn
            icon="format-align-left"
            a11yLabel={t('formatting.alignLeft')}
            active={isActive('alignLeft')}
            onPress={() => run(() => editorRef.current?.setTextAlign('left'))}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-align-center"
            a11yLabel={t('formatting.alignCenter')}
            active={isActive('alignCenter')}
            onPress={() => run(() => editorRef.current?.setTextAlign('center'))}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-align-right"
            a11yLabel={t('formatting.alignRight')}
            active={isActive('alignRight')}
            onPress={() => run(() => editorRef.current?.setTextAlign('right'))}
            ripple={ripple}
            c={c}
            styles={styles}
          />
          <ToolbarBtn
            icon="format-align-justify"
            a11yLabel={t('formatting.alignJustify')}
            active={isActive('alignJustify')}
            onPress={() => run(() => editorRef.current?.setTextAlign('justify'))}
            ripple={ripple}
            c={c}
            styles={styles}
          />
        </ScrollView>
        <ScrollEdgeFade color={toolbarSurfaceFor(c, md3.dark)} visible={showEndFade} />
      </View>

      <View style={styles.divider} />

      {onVoiceTyping && (
        <ToolbarBtn
          icon="microphone-outline"
          a11yLabel={t('localAi.voiceTyping.toolbarLabel')}
          onPress={() => run(onVoiceTyping)}
          ripple={ripple}
          c={c}
          styles={styles}
        />
      )}

      <Pressable
        onPress={() => run(onAttachPress)}
        android_ripple={rippleAttach}
        accessibilityRole="button"
        accessibilityLabel={t('formatting.attachments')}
        style={styles.addBtn}
      >
        <MaterialCommunityIcons name="plus" size={UI_ICON_SIZE_24} color={c.onPrimaryContainer} />
      </Pressable>
      </View>

      {onAiTools && (
        <Pressable
          onPress={() => run(onAiTools)}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t(
            hasSelection
              ? 'localAi.writingTools.selectionToolbarLabel'
              : 'localAi.writingTools.toolbarLabel',
          )}
          style={styles.aiButton}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.aiButtonHighlight, aiMotion.highlightStyle]}
          />
          <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_22} color={c.primary} />
          <Animated.View style={[styles.aiButtonLabelClip, aiMotion.labelStyle]}>
            <Text numberOfLines={1} ellipsizeMode="clip" style={styles.aiButtonLabel}>
              {t('localAi.writingTools.editLabel')}
            </Text>
          </Animated.View>
        </Pressable>
      )}
    </MotionView>
  )
})

const useToolbarHooks = () => {
  const md3 = useMD3Theme()
  const isDark = md3.dark
  return { md3, isDark }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, isDark }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    row: {
      position: 'absolute',
      left: UI_SIZE_12,
      right: UI_SIZE_12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      zIndex: 10,
    },
    aiButton: {
      minWidth: UI_SIZE_44 + UI_SIZE_8 * 2,
      height: UI_SIZE_44 + UI_SIZE_8 * 2,
      paddingHorizontal: UI_SIZE_8 * 2,
      flexDirection: 'row',
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(toolbarSurfaceFor(c, isDark), 0.98),
      borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.5),
      elevation: 6,
      shadowColor: theme.colors.black,
    },
    aiButtonHighlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: hexWithAlpha(c.primary, 0.16),
    },
    aiButtonLabelClip: {
      overflow: 'hidden',
    },
    aiButtonLabel: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      color: c.primary,
    },
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: UI_SIZE_9999,
      paddingVertical: UI_SIZE_8,
      paddingLeft: UI_SIZE_8,
      paddingRight: UI_SIZE_8,
      zIndex: 10,
      backgroundColor: hexWithAlpha(toolbarSurfaceFor(c, isDark), 0.98),
      borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.5),
      elevation: 6,
      shadowColor: theme.colors.black,
    },
    scrollWrap: {
      flex: 1,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_2,
      paddingHorizontal: UI_SIZE_2,
    },
    btn: {
      overflow: 'hidden',
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      width: 1,
      height: UI_SIZE_24,
      marginHorizontal: UI_SIZE_4,
      flexShrink: 0,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.25),
    },
    addBtn: {
      overflow: 'hidden',
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: UI_SIZE_4,
      flexShrink: 0,
      backgroundColor: c.primaryContainer,
    },
    btnPressed: {
      opacity: 0.5,
    },
    btnActive: {
      backgroundColor: hexWithAlpha(c.primaryContainer, 0.35),
    },
  })
  return styles
}, useToolbarHooks)
