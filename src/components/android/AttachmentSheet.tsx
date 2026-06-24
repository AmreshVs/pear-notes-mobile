import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static"
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

type AttachItem = {
  icon: string
  label: string
  onPress: () => void
}

type Props = {
  visible: boolean
  onDismiss: () => void
  onPickImage: () => void
  onTakePhoto: () => void
  onTakeVideo: () => void
  onPickFile: () => void
  onScanDocument: () => void
  onRecordAudio: () => void
}

export function AttachmentSheet({
  visible,
  onDismiss,
  onPickImage,
  onTakePhoto,
  onTakeVideo,
  onPickFile,
  onScanDocument,
  onRecordAudio,
}: Props) {
  const ref = useRef<BottomSheetModal>(null)
  const { colors } = useMD3Theme()
  const c = colors as ExtendedColors
  const pendingActionRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const handleSheetDismiss = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    onDismiss()
    if (action) {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(action, 80)
      })
    }
  }, [onDismiss])

  const dismiss = useCallback(
    (action: () => void) => {
      pendingActionRef.current = action
      ref.current?.dismiss()
    },
    [],
  )

  const items: AttachItem[] = useMemo(
    () => [
      { icon: 'image-multiple-outline', label: 'Photo & Video', onPress: () => dismiss(onPickImage) },
      { icon: 'camera-outline', label: 'Take Photo', onPress: () => dismiss(onTakePhoto) },
      { icon: 'video-outline', label: 'Take Video', onPress: () => dismiss(onTakeVideo) },
      { icon: 'folder-open-outline', label: 'Choose File', onPress: () => dismiss(onPickFile) },
      { icon: 'text-recognition', label: 'Scan Document', onPress: () => dismiss(onScanDocument) },
      { icon: 'microphone-outline', label: 'Record Audio', onPress: () => dismiss(onRecordAudio) },
    ],
    [dismiss, onPickImage, onTakePhoto, onTakeVideo, onPickFile, onScanDocument, onRecordAudio],
  )

  const sheetBg = (c as any).surfaceContainerLow ?? c.surface

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }),
    [sheetBg],
  )

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={[
        styles.handle,
        { backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.3) },
      ]}
      onDismiss={handleSheetDismiss}
    >
      <BottomSheetView style={styles.container}>
        <Text style={[styles.title, { color: c.onSurface }]}>Add Attachment</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.gridItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: hexWithAlpha(
                      (c as any).surfaceContainerHighest ?? c.surfaceVariant,
                      0.9,
                    ),
                  },
                ]}
              >
                <MaterialCommunityIcons name={item.icon as any} size={26} color={c.primary} />
              </View>
              <Text style={[styles.itemLabel, { color: c.onSurfaceVariant }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 4,
    borderRadius: 9999,
    alignSelf: 'center',
  },
  container: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    paddingVertical: 14,
    paddingHorizontal: 4,
    paddingTop: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomPad: {
    height: 28,
  },
})
