import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet } from '@/components/Themed'
import type { TiptapEditorHandle, TiptapStyleState } from '@/components/TiptapEditor'
import {
  Radii,
  Space,
  UI_ICON_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_42,
  UI_SIZE_44,
  UI_SIZE_6,
} from '@/constants/commonStyles'

const ExpoUI: any = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

type ToolbarBtnProps = {
  sf: string
  onPress: () => void
  active?: boolean
  tintActive: string
  tintDefault: string
  styles: any
}

const ToolbarBtn = memo(function ToolbarBtn({
  sf,
  onPress,
  active,
  tintActive,
  tintDefault,
  styles,
}: ToolbarBtnProps) {
  const btnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.toolbarBtn,
      active && styles.toolbarBtnActive,
      pressed && styles.pressed,
    ],
    [active, styles.toolbarBtn, styles.toolbarBtnActive, styles.pressed],
  )

  return (
    <Pressable onPress={onPress} style={btnStyle}>
      <SymbolView
        name={sf as any}
        size={UI_ICON_SIZE_22}
        tintColor={active ? tintActive : tintDefault}
        weight="regular"
        fallback={<View style={styles.fallbackIcon} />}
      />
    </Pressable>
  )
})

type AttachMenuProps = {
  colors: any
  onPickImage: () => void
  onPickFile: () => void
  onRecordAudio: () => void
  onScanDocument: () => void
  onTakePhoto: () => void
  onTakeVideo: () => void
  styles: any
}

const AttachMenu = memo(function AttachMenu({
  colors,
  onPickImage,
  onPickFile,
  onRecordAudio,
  onScanDocument,
  onTakePhoto,
  onTakeVideo,
  styles,
}: AttachMenuProps) {
  const { t } = useTranslation()
  return ExpoUI ? (
    <ExpoUI.Host matchContents style={{ width: UI_SIZE_44, height: 52 }}>
      <ExpoUI.Menu
        label={
          <ExpoUI.RNHostView matchContents>
            <View style={styles.toolbarBtn}>
              <SymbolView
                name="paperclip"
                size={UI_ICON_SIZE_22}
                tintColor={colors.text}
                weight="regular"
                fallback={<View style={styles.fallbackIcon} />}
              />
            </View>
          </ExpoUI.RNHostView>
        }
      >
        <ExpoUI.Button label={t('attachments.recordAudio')} systemImage="mic" onPress={onRecordAudio} />
        <ExpoUI.Button
          label={t('attachments.scanDocument')}
          systemImage="doc.viewfinder"
          onPress={onScanDocument}
        />
        <ExpoUI.Button label={t('attachments.chooseFile')} systemImage="folder" onPress={onPickFile} />
        <ExpoUI.Button label={t('attachments.takeVideo')} systemImage="video" onPress={onTakeVideo} />
        <ExpoUI.Button label={t('attachments.takePhoto')} systemImage="camera" onPress={onTakePhoto} />
        <ExpoUI.Button
          label={t('attachments.photoVideo')}
          systemImage="photo.on.rectangle"
          onPress={onPickImage}
        />
      </ExpoUI.Menu>
    </ExpoUI.Host>
  ) : (
    <ToolbarBtn
      sf="paperclip"
      tintActive={colors.primary}
      tintDefault={colors.text}
      onPress={onPickFile}
      styles={styles}
    />
  )
})

type EditorToolbarProps = {
  isEditing: boolean
  isActive: (key: keyof TiptapStyleState) => boolean
  colors: any
  editorRef: React.RefObject<TiptapEditorHandle | null>
  toolbarBottom: number
  onPickImage: () => void
  onPickFile: () => void
  onRecordAudio: () => void
  onScanDocument: () => void
  onTakePhoto: () => void
  onTakeVideo: () => void
}

export const EditorToolbar = memo(function EditorToolbar({
  isEditing,
  isActive,
  colors,
  editorRef,
  toolbarBottom,
  onPickImage,
  onPickFile,
  onRecordAudio,
  onScanDocument,
  onTakePhoto,
  onTakeVideo,
}: EditorToolbarProps) {
  const styles = useStyles()
  const run = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }, [])

  const handleFocusEdit = useCallback(() => {
    setTimeout(() => editorRef.current?.focus(), 100)
  }, [editorRef])

  const handlePickImageEdit = useCallback(() => {
    setTimeout(() => onPickImage(), 100)
  }, [onPickImage])

  const handlePickFileEdit = useCallback(() => {
    setTimeout(() => onPickFile(), 100)
  }, [onPickFile])

  const handleRecordAudioEdit = useCallback(() => {
    setTimeout(() => onRecordAudio(), 100)
  }, [onRecordAudio])

  const handleScanDocumentEdit = useCallback(() => {
    setTimeout(() => onScanDocument(), 100)
  }, [onScanDocument])

  const handleTakePhotoEdit = useCallback(() => {
    setTimeout(() => onTakePhoto(), 100)
  }, [onTakePhoto])

  const handleTakeVideoEdit = useCallback(() => {
    setTimeout(() => onTakeVideo(), 100)
  }, [onTakeVideo])

  return (
    <View style={[styles.floatingToolbar, { bottom: toolbarBottom }]}>
      <GlassView intensity={40} borderRadius={28} style={styles.glassBar} isInteractive>
        {isEditing ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarRow}
          >
            <AttachMenu
              colors={colors}
              onPickImage={handlePickImageEdit}
              onPickFile={handlePickFileEdit}
              onRecordAudio={handleRecordAudioEdit}
              onScanDocument={handleScanDocumentEdit}
              onTakePhoto={handleTakePhotoEdit}
              onTakeVideo={handleTakeVideoEdit}
              styles={styles}
            />
            <View style={styles.divider} />
            <ToolbarBtn
              sf="checkmark.square"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('checkboxList')}
              onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              styles={styles}
            />
            <ToolbarBtn
              sf="textformat.size.larger"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('h1')}
              onPress={() => run(() => editorRef.current?.toggleH1())}
              styles={styles}
            />
            <ToolbarBtn
              sf="textformat.size"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('h2')}
              onPress={() => run(() => editorRef.current?.toggleH2())}
              styles={styles}
            />
            <ToolbarBtn
              sf="bold"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('bold')}
              onPress={() => run(() => editorRef.current?.toggleBold())}
              styles={styles}
            />
            <ToolbarBtn
              sf="italic"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('italic')}
              onPress={() => run(() => editorRef.current?.toggleItalic())}
              styles={styles}
            />
            <ToolbarBtn
              sf="list.bullet"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('unorderedList')}
              onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
              styles={styles}
            />
            <ToolbarBtn
              sf="list.number"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('orderedList')}
              onPress={() => run(() => editorRef.current?.toggleOrderedList())}
              styles={styles}
            />
            <ToolbarBtn
              sf="checklist"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('checkboxList')}
              onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              styles={styles}
            />
            <ToolbarBtn
              sf="text.quote"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('blockQuote')}
              onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
              styles={styles}
            />
            <ToolbarBtn
              sf="chevron.left.forwardslash.chevron.right"
              tintActive={colors.primary}
              tintDefault={colors.text}
              active={isActive('codeBlock')}
              onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
              styles={styles}
            />
          </ScrollView>
        ) : (
          <View style={styles.toolbarRowCompact}>
            <AttachMenu
              colors={colors}
              onPickImage={handlePickImageEdit}
              onPickFile={handlePickFileEdit}
              onRecordAudio={handleRecordAudioEdit}
              onScanDocument={handleScanDocumentEdit}
              onTakePhoto={handleTakePhotoEdit}
              onTakeVideo={handleTakeVideoEdit}
              styles={styles}
            />
            <ToolbarBtn
              sf="square.and.pencil"
              tintActive={colors.primary}
              tintDefault={colors.text}
              onPress={handleFocusEdit}
              styles={styles}
            />
          </View>
        )}
      </GlassView>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    floatingToolbar: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: Space.md,
    },
    glassBar: {
      minHeight: 52,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_6,
      gap: 0,
    },
    toolbarRowCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      gap: UI_SIZE_24,
      justifyContent: 'flex-start',
    },
    toolbarBtn: {
      width: UI_SIZE_42,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: Radii.md,
    },
    toolbarBtnActive: {
      backgroundColor: theme.colors.primary + '33',
    },
    divider: {
      width: 1,
      height: UI_SIZE_24,
      marginHorizontal: Space.xs,
      opacity: 0.4,
      backgroundColor: theme.colors.separator,
    },
    fallbackIcon: {
      width: 22,
      height: 22,
    },
    pressed: {
      opacity: 0.5,
    },
  })
  return styles
})
