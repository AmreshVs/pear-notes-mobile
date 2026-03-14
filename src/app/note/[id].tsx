import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import * as Haptics from 'expo-haptics'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import {
  Bold,
  CheckSquare,
  ChevronLeft,
  Code,
  Edit3,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Paperclip,
  Quote,
  RotateCcw,
  Share2,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { useTheme } from '@/components/Themed'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'

function ToolbarBtn({
  icon: Icon,
  onPress,
  active,
  colors,
}: {
  icon: any
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
      <Icon size={20} color={active ? colors.primary : colors.text} strokeWidth={2} />
    </Pressable>
  )
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, isDark } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const dispatch = useDispatch()
  const editorRef = useRef<TiptapEditorHandle>(null)

  const rawNoteData = useSelector(getNoteData(id))
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)

  const [title, setTitle] = useState(noteData?.title || '')
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [styleState, setStyleState] = useState<TiptapStyleState | null>(null)

  useEffect(() => {
    if (noteData?.title !== undefined && title === '') {
      setTitle(noteData.title)
    }
  }, [noteData, title])

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
      dispatch(updateNote({ key: id, title, note: finalHtml } as any))
    },
    [dispatch, id, title, hyperdriveServerAddress],
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
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
  }, [editorRef])

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
      // Manipulate locally for resize and faster upload
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
  }, [id, windowWidth])

  const isActive = (key: keyof TiptapStyleState) => styleState?.[key]?.isActive ?? false

  const bg = colors.background
  const toolbarBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Platform.OS === 'ios' ? 32 : 16

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

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={async () => {
                await editorRef.current?.save()
                router.back()
              }}
              style={({ pressed }) => [
                styles.headerCircleBtn,
                { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ChevronLeft size={18} color={colors.text} strokeWidth={2.5} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {isEditing && (
                <Pressable
                  style={({ pressed }) => [
                    styles.headerCircleBtn,
                    { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <RotateCcw size={15} color={colors.text} strokeWidth={2.5} />
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.headerCircleBtn,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Share2 size={15} color={colors.text} strokeWidth={2.5} />
              </Pressable>
              {isEditing && (
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [
                    styles.headerCircleBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Edit3 size={15} color="#fff" strokeWidth={2.5} />
                </Pressable>
              )}
            </View>
          ),
          title: '',
        }}
      />

      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={styles.titleArea}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Title"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
            autoCorrect={false}
            autoCapitalize="sentences"
            multiline={false}
          />
        </View>

        <TiptapEditor
          ref={editorRef}
          initialContent={initialContent}
          onContentChange={handleUpdate}
          onStyleStateChange={setStyleState}
          onOpenAttachment={(url, fileName) => {
            console.log('Opening attachment:', { url, fileName })
            if (url) {
              Linking.openURL(url).catch((err) => console.error('Failed to open file URL:', err))
            }
          }}
          onDeleteAttachment={async (url) => {
            if (!url) return
            try {
              if (url && url.startsWith(HYPERDRIVE_URL_PREFIX)) {
                const key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
                await backendApi.deleteFile(key)
              }
            } catch (error) {
              console.error('Error deleting attachment from backend:', error)
            }
          }}
        />
      </View>

      <View style={[styles.floatingToolbar, { bottom: toolbarBottom }]}>
        <GlassView intensity={60} borderRadius={28} style={styles.glassBar}>
          {isEditing ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolbarRow}
            >
              <ToolbarBtn
                icon={CheckSquare}
                colors={colors}
                active={isActive('checkboxList')}
                onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              />
              <ToolbarBtn icon={Paperclip} colors={colors} onPress={handlePickImage} />
              <ToolbarBtn icon={Edit3} colors={colors} onPress={() => {}} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToolbarBtn
                icon={Heading1}
                colors={colors}
                active={isActive('h1')}
                onPress={() => run(() => editorRef.current?.toggleH1())}
              />
              <ToolbarBtn
                icon={Heading2}
                colors={colors}
                active={isActive('h2')}
                onPress={() => run(() => editorRef.current?.toggleH2())}
              />
              <ToolbarBtn
                icon={Bold}
                colors={colors}
                active={isActive('bold')}
                onPress={() => run(() => editorRef.current?.toggleBold())}
              />
              <ToolbarBtn
                icon={Italic}
                colors={colors}
                active={isActive('italic')}
                onPress={() => run(() => editorRef.current?.toggleItalic())}
              />
              <ToolbarBtn
                icon={List}
                colors={colors}
                active={isActive('unorderedList')}
                onPress={() => run(() => editorRef.current?.toggleUnorderedList())}
              />
              <ToolbarBtn
                icon={ListOrdered}
                colors={colors}
                active={isActive('orderedList')}
                onPress={() => run(() => editorRef.current?.toggleOrderedList())}
              />
              <ToolbarBtn
                icon={ListTodo}
                colors={colors}
                active={isActive('checkboxList')}
                onPress={() => run(() => editorRef.current?.toggleCheckboxList())}
              />
              <ToolbarBtn
                icon={Quote}
                colors={colors}
                active={isActive('blockQuote')}
                onPress={() => run(() => editorRef.current?.toggleBlockQuote())}
              />
              <ToolbarBtn
                icon={Code}
                colors={colors}
                active={isActive('codeBlock')}
                onPress={() => run(() => editorRef.current?.toggleCodeBlock())}
              />
            </ScrollView>
          ) : (
            <View style={styles.toolbarRow}>
              <ToolbarBtn
                icon={Paperclip}
                colors={colors}
                onPress={() => {
                  setIsEditing(true)
                  setTimeout(() => handlePickImage(), 100)
                }}
              />
              <ToolbarBtn
                icon={Edit3}
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
  root: {
    flex: 1,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  floatingToolbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
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
  editFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
