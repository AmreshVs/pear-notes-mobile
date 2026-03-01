import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
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
  View,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { NoteEditor, NoteEditorHandle } from '@/components/NoteEditor'
import { useTheme } from '@/components/Themed'

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, isDark } = useTheme()
  const dispatch = useDispatch()
  const editorRef = useRef<NoteEditorHandle>(null)

  const rawNoteData = useSelector(getNoteData(id))
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])

  const [title, setTitle] = useState(noteData?.title || '')
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

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
    (html: string, text: string) => {
      if (!id || id === 'new') return
      dispatch(updateNote({ key: id, title, note: html || '' } as any))
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

  const handleDone = useCallback(() => {
    Keyboard.dismiss()
    setIsEditing(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const runCommand = useCallback((cmd: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    editorRef.current?.runCommand(cmd)
  }, [])

  const ToolbarBtn = ({ icon: Icon, onPress }: { icon: any; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.toolbarBtn, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Icon size={20} color={colors.text} strokeWidth={2} />
    </Pressable>
  )

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
              onPress={() => router.back()}
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
                  onPress={() => runCommand('undo()')}
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
              <ToolbarBtn icon={CheckSquare} onPress={() => runCommand('toggleTaskList()')} />
              <ToolbarBtn icon={Paperclip} onPress={() => {}} />
              <ToolbarBtn icon={Edit3} onPress={() => {}} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ToolbarBtn
                icon={Heading1}
                onPress={() => runCommand('toggleHeading({ level: 1 })')}
              />
              <ToolbarBtn
                icon={Heading2}
                onPress={() => runCommand('toggleHeading({ level: 2 })')}
              />
              <ToolbarBtn icon={Bold} onPress={() => runCommand('toggleBold()')} />
              <ToolbarBtn icon={Italic} onPress={() => runCommand('toggleItalic()')} />
              <ToolbarBtn icon={List} onPress={() => runCommand('toggleBulletList()')} />
              <ToolbarBtn icon={ListTodo} onPress={() => runCommand('toggleOrderedList()')} />
              <ToolbarBtn icon={Quote} onPress={() => runCommand('toggleBlockquote()')} />
              <ToolbarBtn icon={Code} onPress={() => runCommand('toggleCodeBlock()')} />
            </ScrollView>
          ) : (
            <View style={styles.toolbarRow}>
              <ToolbarBtn icon={CheckSquare} onPress={() => {}} />
              <ToolbarBtn icon={Paperclip} onPress={() => {}} />
              <ToolbarBtn icon={Edit3} onPress={() => {}} />
            </View>
          )}
        </GlassView>

        {!isEditing && (
          <Pressable
            onPress={() => {
              setIsEditing(true)
              editorRef.current?.runCommand('focus()')
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glassBar: {
    flex: 1,
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
