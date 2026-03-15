import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import * as Haptics from 'expo-haptics'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { useTheme } from '@/components/Themed'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'

function ToolbarBtn({
  sf,
  onPress,
  active,
  colors,
}: {
  sf: string
  onPress: () => void
  active?: boolean
  colors: any
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarBtn,
        active && { backgroundColor: colors.primary + '33' },
        { opacity: pressed ? 0.5 : 1 },
      ]}
    >
      <SymbolView
        name={sf as any}
        size={22}
        tintColor={active ? colors.primary : colors.text}
        weight="regular"
        fallback={<View style={{ width: 22, height: 22 }} />}
      />
    </Pressable>
  )
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const floatingHeaderHeight = insets.top + 52
  const dispatch = useDispatch()
  const editorRef = useRef<TiptapEditorHandle>(null)

  const rawNoteData = useSelector(getNoteData(id))
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)

  // Title as ref — never causes a re-render (eliminates WebView flicker on keystrokes)
  const titleRef = useRef<string>(noteData?.title || '')

  const initialContent = useMemo(() => {
    let content = noteData?.note || ''
    if (hyperdriveServerAddress && content.includes(HYPERDRIVE_URL_PREFIX)) {
      content = content.replaceAll(
        HYPERDRIVE_URL_PREFIX,
        hyperdriveServerAddress.replace(/\/$/, ''),
      )
    }
    return content
  }, [noteData?.note, hyperdriveServerAddress])

  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [styleState, setStyleState] = useState<TiptapStyleState | null>(null)

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height)
        setIsEditing(true)
      },
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const handleUpdate = useCallback(
    (html: string) => {
      if (!id || id === 'new') return
      let finalHtml = html
      if (hyperdriveServerAddress) {
        finalHtml = finalHtml.replaceAll(
          hyperdriveServerAddress.replace(/\/$/, ''),
          HYPERDRIVE_URL_PREFIX,
        )
      }
      dispatch(updateNote({ key: id, title: titleRef.current, note: finalHtml } as any))
    },
    [dispatch, id, hyperdriveServerAddress],
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      titleRef.current = newTitle
      if (!id || id === 'new') return
      dispatch(updateNote({ key: id, title: newTitle, note: noteData?.note || '' } as any))
    },
    [dispatch, id, noteData],
  )

  const handleDone = useCallback(async () => {
    await editorRef.current?.save()
    Keyboard.dismiss()
    setIsEditing(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const run = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }, [])

  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    const { uri, width, height, fileName } = result.assets[0]
    const maxWidth = windowWidth - 40
    const maxHeight = 400
    let finalWidth = width
    let finalHeight = height
    if (width > maxWidth) {
      const ratio = maxWidth / width
      finalWidth = maxWidth
      finalHeight = height * ratio
    }
    if (finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight
      finalHeight = maxHeight
      finalWidth = finalWidth * ratio
    }

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: finalWidth, height: finalHeight } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manipulated.base64) return

      const buffer = Buffer.from(manipulated.base64, 'base64')
      const { link } = await backendApi.insertFile({
        key: id,
        fileName: fileName || `image-${Date.now()}.jpg`,
        buffer,
      })
      if (link) {
        let resolvedLink = link
        if (hyperdriveServerAddress && link.includes(HYPERDRIVE_URL_PREFIX)) {
          resolvedLink = link.replace(
            HYPERDRIVE_URL_PREFIX,
            hyperdriveServerAddress.replace(/\/$/, ''),
          )
        }
        editorRef.current?.insertImage(resolvedLink, finalWidth, finalHeight)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }, [id, windowWidth, hyperdriveServerAddress])

  const isActive = (key: keyof TiptapStyleState) => styleState?.[key]?.isActive ?? false
  const toolbarBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Platform.OS === 'ios' ? 32 : 16

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'none',
          headerTitle: '',
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: 'transparent' },
          headerLeft: () => (
            <Pressable
              onPress={async () => {
                await editorRef.current?.save()
                router.back()
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
            >
              <SymbolView
                name="chevron.left"
                size={22}
                tintColor={colors.text}
                weight="semibold"
                fallback={<View />}
              />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              {isEditing ? (
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
                >
                  <SymbolView
                    name="checkmark"
                    size={22}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
                  >
                    <SymbolView
                      name="square.and.arrow.up"
                      size={22}
                      tintColor={colors.text}
                      weight="medium"
                      fallback={<View />}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
                  >
                    <SymbolView
                      name="ellipsis.circle"
                      size={22}
                      tintColor={colors.text}
                      weight="medium"
                      fallback={<View />}
                    />
                  </Pressable>
                </>
              )}
            </View>
          ),
        }}
      />

      <TiptapEditor
        ref={editorRef}
        initialContent={initialContent}
        initialTitle={noteData?.title || ''}
        safeAreaTop={floatingHeaderHeight}
        onContentChange={handleUpdate}
        onTitleChange={handleTitleChange}
        onStyleStateChange={setStyleState}
        onEditorFocus={() => setIsEditing(true)}
        onOpenAttachment={(url) => {
          if (url) Linking.openURL(url).catch(console.error)
        }}
        onDeleteAttachment={async (url) => {
          if (!url) return
          try {
            if (url.startsWith(HYPERDRIVE_URL_PREFIX)) {
              const key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
              await backendApi.deleteFile(key)
            }
          } catch (error) {
            console.error('Error deleting attachment:', error)
          }
        }}
      />

      <View style={[styles.floatingToolbar, { bottom: toolbarBottom }]}>
        <GlassView intensity={60} borderRadius={28} style={styles.glassBar}>
          {isEditing ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolbarRow}
            >
              <ToolbarBtn
                sf="checkmark.square"
                colors={colors}
                active={isActive('checkboxList')}
                onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              />
              <ToolbarBtn sf="paperclip" colors={colors} onPress={handlePickImage} />
              <ToolbarBtn sf="square.and.pencil" colors={colors} onPress={() => {}} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToolbarBtn
                sf="textformat.size.larger"
                colors={colors}
                active={isActive('h1')}
                onPress={() => run(() => editorRef.current?.toggleH1())}
              />
              <ToolbarBtn
                sf="textformat.size"
                colors={colors}
                active={isActive('h2')}
                onPress={() => run(() => editorRef.current?.toggleH2())}
              />
              <ToolbarBtn
                sf="bold"
                colors={colors}
                active={isActive('bold')}
                onPress={() => run(() => editorRef.current?.toggleBold())}
              />
              <ToolbarBtn
                sf="italic"
                colors={colors}
                active={isActive('italic')}
                onPress={() => run(() => editorRef.current?.toggleItalic())}
              />
              <ToolbarBtn
                sf="list.bullet"
                colors={colors}
                active={isActive('unorderedList')}
                onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
              />
              <ToolbarBtn
                sf="list.number"
                colors={colors}
                active={isActive('orderedList')}
                onPress={() => run(() => editorRef.current?.toggleOrderedList())}
              />
              <ToolbarBtn
                sf="checklist"
                colors={colors}
                active={isActive('checkboxList')}
                onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              />
              <ToolbarBtn
                sf="text.quote"
                colors={colors}
                active={isActive('blockQuote')}
                onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
              />
              <ToolbarBtn
                sf="chevron.left.forwardslash.chevron.right"
                colors={colors}
                active={isActive('codeBlock')}
                onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
              />
            </ScrollView>
          ) : (
            <View
              style={[
                styles.toolbarRow,
                { justifyContent: 'flex-start', gap: 24, paddingHorizontal: 8 },
              ]}
            >
              <ToolbarBtn
                sf="paperclip"
                colors={colors}
                onPress={() => {
                  setIsEditing(true)
                  setTimeout(() => handlePickImage(), 100)
                }}
              />
              <ToolbarBtn
                sf="square.and.pencil"
                colors={colors}
                onPress={() => {
                  setIsEditing(true)
                  setTimeout(() => editorRef.current?.focus(), 100)
                }}
              />
            </View>
          )}
        </GlassView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  floatingToolbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  glassBar: {
    minHeight: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 0,
  },
  toolbarBtn: {
    width: 44,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
    opacity: 0.4,
  },
})
