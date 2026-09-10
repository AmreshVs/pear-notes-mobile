import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import * as FileSystem from 'expo-file-system'
import { SymbolView } from 'expo-symbols'

import { deleteNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getActivityLogEnabled,
  getLockMethod,
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { NoteHistoryModal } from '@/components/activity/NoteHistoryModal'
import { AudioRecorderModal } from '@/components/AudioRecorderModal'
import { EdgeFade } from '@/components/EdgeFade'
import { GlassView } from '@/components/GlassView'
import { EditorToolbar } from '@/components/ios/EditorToolbar'
import { LockedContentShield } from '@/components/LockedContentShield'
import { LockedNoteView } from '@/components/LockedNoteView'
import { NoteConflictBanner } from '@/components/NoteConflictBanner'
import { createThemedStylesheet, useReduceMotion, useTheme } from '@/components/Themed'
import { TiptapEditor } from '@/components/TiptapEditor'
import { UploadQueueBanner } from '@/components/upload/UploadQueueBanner'
import {
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_20,
  UI_SIZE_32,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_SF } from '@/constants/folderIcons'
import { useDeferredEditorMount } from '@/hooks/useDeferredEditorMount'
import { useLockedNoteScreenProtection } from '@/hooks/useLockedNoteScreenProtection'
import { hapticError, hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { snapTo } from '@/lib/motion'
import {
  cleanupCachedAttachment,
  downloadToCache,
  saveImageToPhotos,
  shareMessage,
} from '@/lib/noteAttachmentManager'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { buildNoteSharePayload } from '@/lib/noteShare'
import { showCameraPermissionAlert } from '@/lib/permissionAlerts'
import { NoteEditorContext } from '@/providers/NoteEditorContext'

import ExpoNativeShareModule from '../../modules/expo-native-share'

import { useNoteEditor } from './useNoteEditor'
import { useNoteEditorActions } from './useNoteEditorActions'

const ExpoUI: any = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null
const EDITOR_HEADER_HEIGHT = 52

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReduceMotion()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const styles = useStyles()
  const { t } = useTranslation()

  const editor = useNoteEditor()
  const {
    editorRef,
    noteId,
    isOpen,
    isEditing,
    keyboardHeight,
    isSharing,
    setIsSharing,
    selectedImageSrc,
    setSelectedImageSrc,
    selectedAttachmentSrc,
    setSelectedAttachmentSrc,
    selectedAttachmentFileName,
    setSelectedAttachmentFileName,
    isRecorderVisible,
    historyVisible,
    setHistoryVisible,
    setIsRecorderVisible,
    imageActionRect,
    setImageActionRect,
    isImageActionSheetOpen,
    setIsImageActionSheetOpen,
    attachmentActionRect,
    setAttachmentActionRect,
    isAttachmentActionSheetOpen,
    setIsAttachmentActionSheetOpen,
    slideAnim,
    titleRef,
    noteContentRef,
    moveFolders,
    resetEditorState,
    closeNote,
    openNote,
    handleStyleStateChange,
    isActive,
    handleEditorFocus,
    handleEditorBlur,
    resolveHyperdriveUrl,
    isEdgeSwipeActive,
    setIsEdgeSwipeActive,
    noteData,
    handleYjsMessage,
  } = editor

  const isPreviewingRef = useRef(false)

  const shouldMountEditor = useDeferredEditorMount(isOpen)

  const lockMethod = useSelector(getLockMethod)
  const activityEnabled = useSelector(getActivityLogEnabled) as boolean
  const isNoteUnlockedForNote = useIsNoteUnlocked(noteId)
  const isNoteLocked = !!noteData?.locked && !!noteId && !isNoteUnlockedForNote
  const protectLockedNote = isOpen && !!noteData?.locked
  useLockedNoteScreenProtection(protectLockedNote)

  const editorLabels = useMemo(
    () => ({
      photo: t('noteEditor.upload.photo'),
      file: t('noteEditor.upload.file'),
      audio: t('noteEditor.upload.audio'),
      scannedDoc: t('noteEditor.upload.scannedDoc'),
      uploadFailedVideo: t('noteEditor.upload.failedVideo'),
      uploadFailedScan: t('noteEditor.upload.failedScan'),
      unlockReason: t('noteCard.unlockReason'),
      lockReason: t('noteCard.lockReason'),
      pageCountLabel: (count: number) => t('noteEditor.upload.pageCount', { count }),
    }),
    [t],
  )

  const handleUploadError = useCallback(
    (message: string) => Alert.alert(t('noteEditor.upload.failedTitle'), message),
    [t],
  )

  const handleCameraPermissionDenied = useCallback(() => showCameraPermissionAlert(t), [t])

  const deleteUploadCache = useCallback(async (cacheUri: string) => {
    await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {})
  }, [])

  const handleBeforeToggleLock = useCallback(() => hapticMedium(), [])

  const {
    handleUpdate,
    handleTitleChange,
    handlePickImage,
    handleTakePhoto,
    handleTakeVideo,
    handlePickFile,
    handleScanDocument,
    handleRequestPdfThumbnail,
    handleRecordingDone,
    handleMoveNote,
    handleTogglePin,
    handleDeleteAttachment,
    handleDone,
    handleToggleLock,
  } = useNoteEditorActions({
    editor,
    lockMethod,
    screenWidth: Dimensions.get('window').width,
    recordingFileNamePrefix: 'recording',
    labels: editorLabels,
    onUploadError: handleUploadError,
    onCameraPermissionDenied: handleCameraPermissionDenied,
    deleteUploadCache,
    onBeforeToggleLock: handleBeforeToggleLock,
  })

  const handleRecordAudio = useCallback(() => {
    hapticMedium()
    Keyboard.dismiss()
    editorRef.current?.blur()
    setTimeout(() => setIsRecorderVisible(true), 100)
  }, [setIsRecorderVisible])

  const handleDeleteNote = useCallback(() => {
    if (!noteId) return
    hapticMedium()
    Alert.alert(t('noteCard.actions.delete'), t('noteCard.deleteConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('noteCard.actions.delete'),
        style: 'destructive',
        onPress: () => {
          dispatch(deleteNote(noteId as any))
          const w = Dimensions.get('window').width
          if (reduceMotion) {
            snapTo(slideAnim, w, resetEditorState)
            return
          }
          Animated.timing(slideAnim, {
            toValue: w,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            resetEditorState()
          })
        },
      },
    ])
  }, [noteId, dispatch, slideAnim, resetEditorState, reduceMotion, t])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    hapticMedium()
    setIsSharing(true)
    const title = titleRef.current || t('noteCard.untitled')
    try {
      const { message, urls } = await buildNoteSharePayload({
        title,
        html: noteContentRef.current || '',
        resolveHyperdriveUrl,
      })
      try {
        await shareMessage(message, urls)
      } catch {
        await Share.share({ title, message })
      }
    } finally {
      setIsSharing(false)
    }
  }, [resolveHyperdriveUrl, isSharing, setIsSharing, t])

  const showMoveToSheet = useCallback(() => {
    if (moveFolders.length === 0) return
    const folderNames = moveFolders.map((f: any) => f.name || f.id)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('noteCard.actions.moveTo'),
        options: [t('common.cancel'), ...folderNames],
        cancelButtonIndex: 0,
      },
      (index: number) => {
        if (index === 0) return
        const folder = moveFolders[index - 1]
        if (folder) handleMoveNote(folder.id)
      },
    )
  }, [moveFolders, handleMoveNote, t])

  const handleOpenNoteHistory = useCallback(() => {
    if (!noteId) return
    setHistoryVisible(true)
  }, [noteId])

  const handleCloseNoteHistory = useCallback(() => setHistoryVisible(false), [])

  const handleMoreOptions = useCallback(() => {
    if (!noteId) return
    hapticMedium()
    if (Platform.OS === 'ios') {
      const lockLabel = noteData?.locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock')
      const pinLabel = noteData?.pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin')
      const entries = [
        { label: pinLabel, run: handleTogglePin },
        { label: t('noteCard.actions.moveTo'), run: showMoveToSheet },
        { label: lockLabel, run: handleToggleLock },
        ...(activityEnabled
          ? [{ label: t('noteEditor.menu.noteHistory'), run: handleOpenNoteHistory }]
          : []),
        { label: t('noteCard.actions.delete'), run: handleDeleteNote },
      ]
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...entries.map((entry) => entry.label)],
          cancelButtonIndex: 0,
          destructiveButtonIndex: entries.length,
        },
        (index: number) => {
          if (index > 0) entries[index - 1]?.run()
        },
      )
    } else {
      handleDeleteNote()
    }
  }, [
    noteId,
    noteData?.locked,
    noteData?.pinned,
    activityEnabled,
    handleOpenNoteHistory,
    showMoveToSheet,
    handleTogglePin,
    handleToggleLock,
    handleDeleteNote,
    t,
  ])

  const handleOpenAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      hapticLight()
      editorRef.current?.setAttachmentLoading(url, true, attachmentId)
      let localUri: string | null = null
      try {
        localUri = await downloadToCache(url, fileName, (progress) =>
          editorRef.current?.setAttachmentLoading(url, true, attachmentId, progress),
        )
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        await ExpoNativeShareModule.share({ message: '', urls: [localUri], resolveOnDismiss: true })
      } catch {
        Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
      } finally {
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        isPreviewingRef.current = false
        if (localUri) {
          await cleanupCachedAttachment(localUri)
        }
      }
    },
    [t],
  )

  const handlePreviewAttachment = useCallback(
    async (url: string, fileName: string, attachmentId?: string) => {
      if (!url || isPreviewingRef.current) return
      isPreviewingRef.current = true
      hapticLight()
      editorRef.current?.setAttachmentLoading(url, true, attachmentId)
      let localUri: string | null = null
      try {
        localUri = await downloadToCache(url, fileName, (progress) =>
          editorRef.current?.setAttachmentLoading(url, true, attachmentId, progress),
        )
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        await ExpoNativeShareModule.preview({ url: localUri })
      } catch {
        Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
      } finally {
        editorRef.current?.setAttachmentLoading(url, false, attachmentId)
        isPreviewingRef.current = false
        if (localUri) {
          await cleanupCachedAttachment(localUri)
        }
      }
    },
    [t],
  )

  const handleImageSaveToPhotos = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    try {
      const src = selectedImageSrc
      const fileName = src.startsWith('data:')
        ? `image_${Date.now()}.jpg`
        : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
      await saveImageToPhotos(src, fileName)
      hapticSuccess()
    } catch {
      hapticError()
      Alert.alert(t('common.error'), t('noteEditor.upload.failedVideo'))
    }
  }, [selectedImageSrc, setIsImageActionSheetOpen, t])

  const handleImageDelete = useCallback(async () => {
    if (!selectedImageSrc) return
    setIsImageActionSheetOpen(false)
    const src = selectedImageSrc
    hapticWarning()
    await handleDeleteAttachment(src)
    editorRef.current?.deleteImage(src)
  }, [selectedImageSrc, setIsImageActionSheetOpen, handleDeleteAttachment])

  const handleImageLongPress = useCallback(
    (src: string, rect?: { x: number; y: number; width: number; height: number }) => {
      if (!src) return
      hapticMedium()
      setSelectedImageSrc(src)

      if (Platform.OS === 'ios') {
        setImageActionRect(rect || null)
        setIsImageActionSheetOpen(true)
      } else {
        Alert.alert(t('noteEditor.menu.imageOptions'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('noteEditor.menu.saveToPhotos'),
            onPress: () => handleImageSaveToPhotos(),
          },
          {
            text: t('noteCard.actions.delete'),
            onPress: () => handleImageDelete(),
            style: 'destructive',
          },
        ])
      }
    },
    [
      handleImageSaveToPhotos,
      handleImageDelete,
      setSelectedImageSrc,
      setImageActionRect,
      setIsImageActionSheetOpen,
      t,
    ],
  )

  const handleAttachmentShareAction = useCallback(async () => {
    if (!selectedAttachmentSrc || !selectedAttachmentFileName) return
    setIsAttachmentActionSheetOpen(false)
    await handleOpenAttachment(selectedAttachmentSrc, selectedAttachmentFileName)
  }, [
    selectedAttachmentSrc,
    selectedAttachmentFileName,
    setIsAttachmentActionSheetOpen,
    handleOpenAttachment,
  ])

  const handleAttachmentDeleteAction = useCallback(async () => {
    if (!selectedAttachmentSrc) return
    setIsAttachmentActionSheetOpen(false)
    const url = selectedAttachmentSrc
    hapticWarning()
    await handleDeleteAttachment(url)
    editorRef.current?.deleteAttachment(url)
  }, [selectedAttachmentSrc, setIsAttachmentActionSheetOpen, handleDeleteAttachment])

  const handleAttachmentLongPress = useCallback(
    (
      url: string,
      fileName: string,
      rect?: { x: number; y: number; width: number; height: number },
    ) => {
      if (!url) return
      hapticMedium()
      setSelectedAttachmentSrc(url)
      setSelectedAttachmentFileName(fileName)

      if (Platform.OS === 'ios') {
        setAttachmentActionRect(rect || null)
        setIsAttachmentActionSheetOpen(true)
      } else {
        Alert.alert(t('noteEditor.menu.attachmentOptions'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('noteCard.actions.share'),
            onPress: () => handleAttachmentShareAction(),
          },
          {
            text: t('noteCard.actions.delete'),
            onPress: () => handleAttachmentDeleteAction(),
            style: 'destructive',
          },
        ])
      }
    },
    [
      handleAttachmentShareAction,
      handleAttachmentDeleteAction,
      setSelectedAttachmentSrc,
      setSelectedAttachmentFileName,
      setAttachmentActionRect,
      setIsAttachmentActionSheetOpen,
      t,
    ],
  )

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          isOpen && Platform.OS === 'ios' && event.nativeEvent.pageX <= 28,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          isOpen &&
          Platform.OS === 'ios' &&
          gestureState.moveX <= 36 &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderGrant: () => {
          setIsEdgeSwipeActive(true)
          slideAnim.stopAnimation()
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isOpen || gestureState.dx <= 0) return
          const width = Dimensions.get('window').width
          slideAnim.setValue(Math.min(gestureState.dx, width))
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isOpen) return
          const width = Dimensions.get('window').width
          const shouldClose = gestureState.dx > width * 0.3 || gestureState.vx > 0.75

          if (shouldClose) {
            closeNote()
            return
          }

          setIsEdgeSwipeActive(false)
          if (reduceMotion) {
            snapTo(slideAnim, 0)
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 24,
              stiffness: 260,
            }).start()
          }
        },
        onPanResponderTerminate: () => {
          setIsEdgeSwipeActive(false)
          if (reduceMotion) {
            snapTo(slideAnim, 0)
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 24,
              stiffness: 260,
            }).start()
          }
        },
      }),
    [closeNote, isOpen, slideAnim, setIsEdgeSwipeActive, reduceMotion],
  )

  const contextValue = useMemo(
    () => ({ openNote, closeNote, isOpen }),
    [openNote, closeNote, isOpen],
  )

  const toolbarBottom = useMemo(
    () => (keyboardHeight > 0 ? keyboardHeight + 12 : Platform.OS === 'ios' ? 32 : 16),
    [keyboardHeight],
  )

  const contentTop = useMemo(() => insets.top + EDITOR_HEADER_HEIGHT, [insets.top])

  const bottomFadeStyle = useMemo(
    () => [styles.bottomFade, { height: insets.bottom }],
    [styles.bottomFade, insets.bottom],
  )

  return (
    <NoteEditorContext.Provider value={contextValue}>
      {children}
      <>
        <Animated.View
          style={[styles.animatedView, { transform: [{ translateX: slideAnim }] }]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          {Platform.OS === 'ios' && isOpen ? (
            <View
              style={styles.edgeSwipeZone}
              pointerEvents="box-only"
              {...edgeSwipeResponder.panHandlers}
            />
          ) : null}

          <View style={[styles.header, { paddingTop: insets.top - 5 }]}>
            <EdgeFade color={colors.background} />
            <View style={styles.headerRow}>
              <GlassView intensity={0} borderRadius={24} style={styles.headerBtn} isInteractive>
                <Pressable
                  onPress={closeNote}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                  style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                >
                  <SymbolView
                    name="chevron.left"
                    size={UI_ICON_SIZE_20}
                    tintColor={colors.text}
                    weight="semibold"
                    fallback={<View />}
                  />
                </Pressable>
              </GlassView>

              <View style={styles.flex1} />

              {isNoteLocked ? null : isEditing ? (
                <View style={styles.doneBtn}>
                  <Pressable
                    onPress={handleDone}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.done')}
                    style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                  >
                    <SymbolView
                      name="checkmark"
                      size={UI_ICON_SIZE_22}
                      tintColor={colors.onPrimary}
                      weight="semibold"
                      fallback={<View />}
                    />
                  </Pressable>
                </View>
              ) : (
                <GlassView intensity={0} borderRadius={24} style={styles.headerPill} isInteractive>
                  <Pressable
                    onPress={handleShare}
                    disabled={isSharing}
                    accessibilityRole="button"
                    accessibilityLabel={t('noteCard.actions.share')}
                    style={({ pressed }) => [
                      styles.headerBtnInner,
                      (pressed || isSharing) && styles.pressed,
                    ]}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <SymbolView
                        name="square.and.arrow.up"
                        size={UI_ICON_SIZE_24}
                        tintColor={colors.text}
                        weight="medium"
                        fallback={<View />}
                      />
                    )}
                  </Pressable>
                  <View style={styles.pillDivider} />
                  {ExpoUI ? (
                    <ExpoUI.Host matchContents style={{ width: UI_SIZE_48, height: UI_SIZE_48 }}>
                      <ExpoUI.Menu
                        label={
                          <ExpoUI.RNHostView matchContents>
                            <View
                              style={styles.headerBtnInner}
                              accessible
                              accessibilityRole="button"
                              accessibilityLabel={t('noteCard.actions.options')}
                            >
                              <SymbolView
                                name="ellipsis"
                                size={UI_ICON_SIZE_24}
                                tintColor={colors.text}
                                weight="medium"
                                fallback={<View />}
                              />
                            </View>
                          </ExpoUI.RNHostView>
                        }
                      >
                        <ExpoUI.Button
                          label={
                            noteData?.pinned
                              ? t('noteCard.actions.unpin')
                              : t('noteCard.actions.pin')
                          }
                          systemImage={noteData?.pinned ? 'pin.slash' : 'pin'}
                          onPress={handleTogglePin}
                        />
                        <ExpoUI.Menu
                          label={t('noteCard.actions.moveTo')}
                          systemImage="folder.badge.plus"
                        >
                          {moveFolders.length > 0 ? (
                            moveFolders.map((f: any) => (
                              <ExpoUI.Button
                                key={f.id}
                                label={f.name}
                                systemImage={FOLDER_ICON_SF[f.icon ?? ''] ?? FALLBACK_FOLDER_SF}
                                onPress={() => handleMoveNote(f.id)}
                              />
                            ))
                          ) : (
                            <ExpoUI.Button
                              label={t('noteCard.actions.noFolders')}
                              systemImage="folder.badge.minus"
                              onPress={() => {}}
                            />
                          )}
                        </ExpoUI.Menu>
                        <ExpoUI.Button
                          label={
                            noteData?.locked
                              ? t('noteCard.actions.unlock')
                              : t('noteCard.actions.lock')
                          }
                          systemImage={noteData?.locked ? 'lock.slash' : 'lock'}
                          onPress={handleToggleLock}
                        />
                        {activityEnabled ? (
                          <ExpoUI.Button
                            label={t('noteEditor.menu.noteHistory')}
                            systemImage="clock.arrow.circlepath"
                            onPress={handleOpenNoteHistory}
                          />
                        ) : null}
                        <ExpoUI.Button
                          label={t('noteCard.actions.delete')}
                          systemImage="trash"
                          role="destructive"
                          onPress={handleDeleteNote}
                        />
                      </ExpoUI.Menu>
                    </ExpoUI.Host>
                  ) : (
                    <Pressable
                      onPress={handleMoreOptions}
                      accessibilityRole="button"
                      accessibilityLabel={t('noteCard.actions.options')}
                      style={({ pressed }) => [styles.headerBtnInner, pressed && styles.pressed]}
                    >
                      <SymbolView
                        name="ellipsis"
                        size={UI_ICON_SIZE_24}
                        tintColor={colors.text}
                        weight="medium"
                        fallback={<View />}
                      />
                    </Pressable>
                  )}
                </GlassView>
              )}
            </View>
          </View>

          {shouldMountEditor && (
            <TiptapEditor
              ref={editorRef}
              noteId={noteId ?? 'new'}
              initialContent=""
              initialTitle=""
              safeAreaTop={contentTop}
              safeAreaBottom={0}
              scrollEnabled={!isEdgeSwipeActive}
              onContentChange={handleUpdate}
              onTitleChange={handleTitleChange}
              onStyleStateChange={handleStyleStateChange}
              onEditorFocus={handleEditorFocus}
              onEditorBlur={handleEditorBlur}
              onOpenAttachment={handleOpenAttachment}
              onPreviewAttachment={handlePreviewAttachment}
              onRequestPdfThumbnail={handleRequestPdfThumbnail}
              onDeleteAttachment={handleDeleteAttachment}
              onImageLongPress={handleImageLongPress}
              onAttachmentLongPress={handleAttachmentLongPress}
              onYjsMessage={handleYjsMessage}
            />
          )}

          <NoteConflictBanner noteKey={noteId} />

          <View style={bottomFadeStyle} pointerEvents="none">
            <EdgeFade color={colors.background} placement="bottom" />
          </View>

          {isOpen && !isNoteLocked && (
            <EditorToolbar
              isEditing={isEditing}
              isActive={isActive}
              colors={colors}
              editorRef={editorRef}
              toolbarBottom={toolbarBottom}
              onPickImage={handlePickImage}
              onPickFile={handlePickFile}
              onRecordAudio={handleRecordAudio}
              onScanDocument={handleScanDocument}
              onTakePhoto={handleTakePhoto}
              onTakeVideo={handleTakeVideo}
            />
          )}

          {isNoteLocked && (
            <View style={styles.lockOverlay}>
              <LockedNoteView noteId={noteId ?? ''} topInset={contentTop} />
            </View>
          )}

          <LockedContentShield active={protectLockedNote} />

          {!!noteId && (
            <NoteHistoryModal
              visible={historyVisible}
              noteId={noteId}
              onClose={handleCloseNoteHistory}
            />
          )}

          <AudioRecorderModal
            visible={isRecorderVisible}
            onDone={handleRecordingDone}
            onCancel={() => setIsRecorderVisible(false)}
          />

          <UploadQueueBanner noteId={noteId} bottom={toolbarBottom + 64} />

          {ExpoUI && (
            <View
              style={[
                styles.confirmationDialogTarget,
                {
                  top: imageActionRect
                    ? Math.max(
                        100,
                        Math.min(
                          Dimensions.get('window').height - 150,
                          imageActionRect.y + imageActionRect.height / 2,
                        ),
                      )
                    : 0,
                  left: imageActionRect
                    ? imageActionRect.width < 300
                      ? imageActionRect.x + imageActionRect.width / 2 <
                        Dimensions.get('window').width / 2
                        ? imageActionRect.x + imageActionRect.width - 5
                        : imageActionRect.x + 5
                      : imageActionRect.x + imageActionRect.width / 2
                    : 0,
                  opacity: imageActionRect ? 1 : 0,
                },
              ]}
              pointerEvents="none"
            >
              <ExpoUI.Host matchContents>
                <ExpoUI.ConfirmationDialog
                  title={t('noteEditor.menu.imageOptions')}
                  titleVisibility="hidden"
                  isPresented={isImageActionSheetOpen && !!imageActionRect}
                  onIsPresentedChange={setIsImageActionSheetOpen}
                >
                  <ExpoUI.ConfirmationDialog.Trigger>
                    <ExpoUI.RNHostView matchContents>
                      <View style={{ width: 1, height: 1 }} />
                    </ExpoUI.RNHostView>
                  </ExpoUI.ConfirmationDialog.Trigger>
                  <ExpoUI.ConfirmationDialog.Actions>
                    <ExpoUI.Button
                      label={t('noteEditor.menu.saveToPhotos')}
                      systemImage="square.and.arrow.down"
                      onPress={handleImageSaveToPhotos}
                    />
                    <ExpoUI.Button
                      label={t('noteCard.actions.delete')}
                      systemImage="trash"
                      role="destructive"
                      onPress={handleImageDelete}
                    />
                  </ExpoUI.ConfirmationDialog.Actions>
                </ExpoUI.ConfirmationDialog>
              </ExpoUI.Host>
            </View>
          )}

          {ExpoUI && (
            <View
              style={[
                styles.confirmationDialogTarget,
                {
                  top: attachmentActionRect
                    ? Math.max(
                        100,
                        Math.min(
                          Dimensions.get('window').height - 150,
                          attachmentActionRect.y + attachmentActionRect.height / 2,
                        ),
                      )
                    : 0,
                  left: attachmentActionRect
                    ? attachmentActionRect.width < 300
                      ? attachmentActionRect.x + attachmentActionRect.width / 2 <
                        Dimensions.get('window').width / 2
                        ? attachmentActionRect.x + attachmentActionRect.width - 5
                        : attachmentActionRect.x + 5
                      : attachmentActionRect.x + attachmentActionRect.width / 2
                    : 0,
                  opacity: attachmentActionRect ? 1 : 0,
                },
              ]}
              pointerEvents="none"
            >
              <ExpoUI.Host matchContents>
                <ExpoUI.ConfirmationDialog
                  title={t('noteEditor.menu.attachmentOptions')}
                  titleVisibility="hidden"
                  isPresented={isAttachmentActionSheetOpen && !!attachmentActionRect}
                  onIsPresentedChange={setIsAttachmentActionSheetOpen}
                >
                  <ExpoUI.ConfirmationDialog.Trigger>
                    <ExpoUI.RNHostView matchContents>
                      <View style={{ width: 1, height: 1 }} />
                    </ExpoUI.RNHostView>
                  </ExpoUI.ConfirmationDialog.Trigger>
                  <ExpoUI.ConfirmationDialog.Actions>
                    <ExpoUI.Button
                      label={t('noteCard.actions.share')}
                      systemImage="square.and.arrow.up"
                      onPress={handleAttachmentShareAction}
                    />
                    <ExpoUI.Button
                      label={t('noteCard.actions.delete')}
                      systemImage="trash"
                      role="destructive"
                      onPress={handleAttachmentDeleteAction}
                    />
                  </ExpoUI.ConfirmationDialog.Actions>
                </ExpoUI.ConfirmationDialog>
              </ExpoUI.Host>
            </View>
          )}
        </Animated.View>
      </>
    </NoteEditorContext.Provider>
  )
}

const ActionSheetIOS: any = Platform.OS === 'ios' ? require('react-native').ActionSheetIOS : null

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    animatedView: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.background,
    },
    lockOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 9,
      backgroundColor: theme.colors.background,
    },
    header: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    edgeSwipeZone: {
      ...StyleSheet.absoluteFill,
      width: UI_SIZE_32,
      zIndex: 30,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      paddingHorizontal: Space.base,
    },
    headerBtn: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    headerBtnInner: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doneBtn: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: Radii.pill,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: theme.colors.primary,
    },
    headerPill: {
      height: UI_SIZE_48,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    pillDivider: {
      width: StyleSheet.hairlineWidth,
      height: UI_SIZE_20,
      backgroundColor: theme.colors.separator,
    },
    flex1: {
      flex: 1,
    },
    pressed: {
      opacity: 0.5,
    },
    confirmationDialogTarget: {
      position: 'absolute',
      width: 1,
      height: 1,
    },
  })
  return styles
})
