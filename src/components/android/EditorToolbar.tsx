import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import * as Haptics from 'expo-haptics'
import React, { memo, useCallback, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'
import {
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_44,
  UI_SIZE_8,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ToolbarBtnProps = {
  icon: string
  onPress: () => void
  active?: boolean
  c: any
  styles: any
}

const ToolbarBtn = memo(function ToolbarBtn({ icon, onPress, active, c, styles }: ToolbarBtnProps) {
  const style = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.btn,
      active && styles.btnActive,
      pressed && styles.btnPressed,
    ],
    [active, styles],
  )
  return (
    <Pressable onPress={onPress} style={style}>
      <MaterialCommunityIcons
        name={icon as any}
        size={UI_ICON_SIZE_22}
        color={active ? c.primary : c.onSurface}
      />
    </Pressable>
  )
})

type EditorToolbarProps = {
  isActive: (key: keyof TiptapStyleState) => boolean
  editorRef: React.RefObject<TiptapEditorHandle | null>
  toolbarBottom: number
  onAttachPress: () => void
}

export const EditorToolbar = memo(function EditorToolbar({
  isActive,
  editorRef,
  toolbarBottom,
  onAttachPress,
}: EditorToolbarProps) {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  const run = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }, [])

  const containerStyle = useMemo(
    () => [styles.container, { bottom: toolbarBottom }],
    [styles.container, toolbarBottom],
  )

  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        <ToolbarBtn
          icon="checkbox-marked-outline"
          active={isActive('checkboxList')}
          onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
          c={c}
          styles={styles}
        />
        <View style={styles.divider} />
        <ToolbarBtn
          icon="format-header-1"
          active={isActive('h1')}
          onPress={() => run(() => editorRef.current?.toggleH1())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-header-2"
          active={isActive('h2')}
          onPress={() => run(() => editorRef.current?.toggleH2())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-bold"
          active={isActive('bold')}
          onPress={() => run(() => editorRef.current?.toggleBold())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-italic"
          active={isActive('italic')}
          onPress={() => run(() => editorRef.current?.toggleItalic())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-list-bulleted"
          active={isActive('unorderedList')}
          onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-list-numbered"
          active={isActive('orderedList')}
          onPress={() => run(() => editorRef.current?.toggleOrderedList())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="format-quote-close"
          active={isActive('blockQuote')}
          onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
          c={c}
          styles={styles}
        />
        <ToolbarBtn
          icon="code-tags"
          active={isActive('codeBlock')}
          onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
          c={c}
          styles={styles}
        />
      </ScrollView>

      <View style={styles.divider} />

      <Pressable
        onPress={() => run(onAttachPress)}
        style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
      >
        <MaterialCommunityIcons name="plus" size={UI_ICON_SIZE_24} color={c.onPrimaryContainer} />
      </Pressable>
    </View>
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
    container: {
      position: 'absolute',
      left: UI_SIZE_12,
      right: UI_SIZE_12,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: UI_SIZE_9999,
      paddingVertical: UI_SIZE_8,
      paddingLeft: UI_SIZE_8,
      paddingRight: UI_SIZE_8,
      borderWidth: StyleSheet.hairlineWidth,
      zIndex: 10,
      backgroundColor: hexWithAlpha(c.surfaceContainerHigh ?? c.surface, 0.98),
      borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.3),
      elevation: 6,
      shadowColor: theme.colors.black,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_2,
      paddingHorizontal: UI_SIZE_2,
    },
    btn: {
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
