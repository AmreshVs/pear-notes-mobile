import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import * as Haptics from 'expo-haptics'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { SymbolView } from 'expo-symbols'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Animated,
  Dimensions,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FullWindowOverlay } from 'react-native-screens'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { useTheme } from '@/components/Themed'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapStyleState,
} from '@/components/TiptapEditor'

// ── Context ──────────────────────────────────────────────────────────────────

interface NoteEditorContextType {
  openNote: (id: string) => void
  closeNote: () => void
  isOpen: boolean
}

const NoteEditorContext = createContext<NoteEditorContextType>({
  openNote: () => {},
  closeNote: () => {},
  isOpen: false,
})

export const useNoteEditor = () => useContext(NoteEditorContext)

// ── ToolbarBtn ───────────────────────────────────────────────────────────────

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

// ── Provider ─────────────────────────────────────────────────────────────────

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const editorRef = useRef<TiptapEditorHandle>(null)
  const colorScheme = useColorScheme()
  const floatingHeaderHeight = insets.top + 52
  const isDark = colorScheme === 'dark'

  // ── State ───────────────────────────────────────────────────────────
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [styleState, setStyleState] = useState<TiptapStyleState | null>(null)

  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current
  const titleRef = useRef<string>('')
  const loadedNoteRef = useRef<string | null>(null)

  // ── Redux data ──────────────────────────────────────────────────────
  const rawNoteData = useSelector(getNoteData(noteId ?? ''))
  const noteData = useMemo(() => (rawNoteData || {}) as any, [rawNoteData])
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)

  // ── Keyboard tracking ───────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (!isOpen) return
        setKeyboardHeight(e.endCoordinates.height)
        setIsEditing(true)
      },
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!isOpen) return
        setKeyboardHeight(0)
      },
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [isOpen])

  // ── Load note content when noteId changes ───────────────────────────
  useEffect(() => {
    if (!noteId || noteId === loadedNoteRef.current) return
    loadedNoteRef.current = noteId
    titleRef.current = noteData?.title || ''

    let content = noteData?.note || ''
    if (hyperdriveServerAddress && content.includes(HYPERDRIVE_URL_PREFIX)) {
      content = content.replaceAll(
        HYPERDRIVE_URL_PREFIX,
        hyperdriveServerAddress.replace(/\/$/, ''),
      )
    }

    // Send content to the already-initialised WebView — near-instant
    editorRef.current?.setHTML(content)
    editorRef.current?.setTitle(noteData?.title || '')

    // Start the slide-in animation *after* content is set
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start()
  }, [noteId, noteData, hyperdriveServerAddress, slideAnim])

  // Reset editing state when note closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setKeyboardHeight(0)
    }
  }, [isOpen])

  // ── Callbacks ───────────────────────────────────────────────────────

  const handleUpdate = useCallback(
    (html: string) => {
      if (!noteId || noteId === 'new') return
      let finalHtml = html
      if (hyperdriveServerAddress) {
        finalHtml = finalHtml.replaceAll(
          hyperdriveServerAddress.replace(/\/$/, ''),
          HYPERDRIVE_URL_PREFIX,
        )
      }
      dispatch(updateNote({ key: noteId, title: titleRef.current, note: finalHtml } as any))
    },
    [dispatch, noteId, hyperdriveServerAddress],
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      titleRef.current = newTitle
      if (!noteId || noteId === 'new') return
      dispatch(updateNote({ key: noteId, title: newTitle, note: noteData?.note || '' } as any))
    },
    [dispatch, noteId, noteData],
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
    const screenW = Dimensions.get('window').width
    const maxWidth = screenW - 40
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
        key: noteId!,
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
  }, [noteId, hyperdriveServerAddress])

  // ── Context actions ────────────────────────────────────────────────

  const openNote = useCallback((id: string) => {
    loadedNoteRef.current = null // force content reload
    setNoteId(id)
    setIsOpen(true)
    // Animation starts in the useEffect after content is set
  }, [])

  const closeNote = useCallback(async () => {
    await editorRef.current?.save()
    Keyboard.dismiss()
    const w = Dimensions.get('window').width
    Animated.timing(slideAnim, {
      toValue: w,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false)
      setNoteId(null)
      loadedNoteRef.current = null
    })
  }, [slideAnim])

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  const isActive = (key: keyof TiptapStyleState) => styleState?.[key]?.isActive ?? false
  const toolbarBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Platform.OS === 'ios' ? 32 : 16

  // ── Render ─────────────────────────────────────────────────────────

  const Wrapper = Platform.OS === 'ios' ? FullWindowOverlay : React.Fragment

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <Wrapper>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }],
            },
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          {/* ── Custom Header — transparent with individual glass pill buttons ── */}
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.headerRow}>
              {/* Back — standalone glass circle */}
              <GlassView intensity={5} borderRadius={24} style={styles.headerBtn}>
                <Pressable
                  onPress={closeNote}
                  style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                >
                  <SymbolView
                    name="chevron.left"
                    size={20}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              </GlassView>

              <View style={{ flex: 1 }} />

              {/* Right actions — grouped in a glass pill */}
              {isEditing ? (
                <GlassView intensity={5} borderRadius={22} style={styles.headerBtn}>
                  <Pressable
                    onPress={handleDone}
                    style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <SymbolView
                      name="checkmark"
                      size={28}
                      tintColor={colors.text}
                      weight="semibold"
                      fallback={<View />}
                    />
                  </Pressable>
                </GlassView>
              ) : (
                <GlassView intensity={5} borderRadius={24} style={styles.headerPill}>
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <SymbolView
                      name="square.and.arrow.up"
                      size={24}
                      tintColor={colors.text}
                      weight="medium"
                      fallback={<View />}
                    />
                  </Pressable>
                  <View
                    style={[
                      styles.pillDivider,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => [styles.headerBtnInner, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <SymbolView
                      name="ellipsis"
                      size={24}
                      tintColor={colors.text}
                      weight="medium"
                      fallback={<View />}
                    />
                  </Pressable>
                </GlassView>
              )}
            </View>
          </View>

          {/* ── Editor (always mounted, content swapped via setHTML) ── */}
          <TiptapEditor
            ref={editorRef}
            initialContent=""
            initialTitle=""
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

          {/* ── Floating Toolbar ────────────────────────────────────── */}
          {isOpen && (
            <View style={[styles.floatingToolbar, { bottom: toolbarBottom }]}>
              <GlassView intensity={5} borderRadius={28} style={styles.glassBar}>
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
          )}
        </Animated.View>
      </Wrapper>
    </NoteEditorContext.Provider>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  // Standalone glass circle (back / checkmark)
  headerBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerBtnInner: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pill containing share + divider + ellipsis
  headerPill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pillDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
  },
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
