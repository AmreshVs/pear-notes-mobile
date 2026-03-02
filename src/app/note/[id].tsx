import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import type { OnChangeStateEvent } from 'react-native-enriched'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { NoteEditor, NoteEditorHandle } from '@/components/NoteEditor'
import { useTheme } from '@/components/Themed'

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
  const editorRef = useRef<NoteEditorHandle>(null)

  const rawNoteData = useSelector(getNoteData(id))
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])

  const [title, setTitle] = useState(noteData?.title || '')
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [styleState, setStyleState] = useState<OnChangeStateEvent | null>(null)

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
      dispatch(updateNote({ key: id, title, note: html } as any))
    },
    [dispatch, id, title],
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

      const localUri = manipulated.uri

      editorRef.current?.insertImage(localUri, finalWidth, finalHeight)

      if (manipulated.base64) {
        const buffer = Buffer.from(manipulated.base64, 'base64')

        const { link } = await backendApi.insertFile({
          key: id,
          fileName: fileName || `image-${Date.now()}.jpg`,
          buffer,
        })

        if (link) {
          const currentHtml = await editorRef.current?.getHTML()
          if (currentHtml) {
            const newHtml = currentHtml.replace(localUri, link)
            editorRef.current?.setHTML(newHtml)
          }
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }, [id, windowWidth])

  const isActive = (key: keyof OnChangeStateEvent) => styleState?.[key]?.isActive ?? false

  const bg = colors.background
  const toolbarBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Platform.OS === 'ios' ? 32 : 16

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

        <NoteEditor
          ref={editorRef}
          initialContent={noteData?.note || ''}
          onContentChange={handleUpdate}
          onStyleStateChange={setStyleState}
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
                icon={CheckSquare}
                colors={colors}
                onPress={() => {
                  setIsEditing(true)
                  setTimeout(() => editorRef.current?.toggleCheckboxList(), 100)
                }}
              />
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

        {!isEditing && (
          <Pressable
            onPress={() => {
              setIsEditing(true)
              editorRef.current?.focus()
            }}
            style={({ pressed }) => [
              styles.editFab,
              { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Edit3 size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
        )}
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
