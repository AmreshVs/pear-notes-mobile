import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_26,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_64,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
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
  const { t } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
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

  const dismiss = useCallback((action: () => void) => {
    pendingActionRef.current = action
    ref.current?.dismiss()
  }, [])

  const items: AttachItem[] = useMemo(
    () => [
      {
        icon: 'image-multiple-outline',
        label: t('attachments.photoVideo'),
        onPress: () => dismiss(onPickImage),
      },
      { icon: 'camera-outline', label: t('attachments.takePhoto'), onPress: () => dismiss(onTakePhoto) },
      { icon: 'video-outline', label: t('attachments.takeVideo'), onPress: () => dismiss(onTakeVideo) },
      { icon: 'folder-open-outline', label: t('attachments.chooseFile'), onPress: () => dismiss(onPickFile) },
      {
        icon: 'text-recognition',
        label: t('attachments.scanDocument'),
        onPress: () => dismiss(onScanDocument),
      },
      {
        icon: 'microphone-outline',
        label: t('attachments.recordAudio'),
        onPress: () => dismiss(onRecordAudio),
      },
    ],
    [dismiss, onPickImage, onTakePhoto, onTakeVideo, onPickFile, onScanDocument, onRecordAudio, t],
  )

  const backgroundStyle = useMemo(() => styles.sheetBackground, [styles.sheetBackground])

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={handleSheetDismiss}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>{t('attachments.addAttachment')}</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              android_ripple={ripple}
              style={styles.gridItem}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={UI_ICON_SIZE_26}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, md3Theme) => {
    const c = md3Theme.colors as ExtendedColors
    const sheetBg = c.surfaceContainerLow ?? c.surface

    const styles = StyleSheet.create({
      sheetBackground: {
        backgroundColor: sheetBg,
        borderTopLeftRadius: UI_SIZE_28,
        borderTopRightRadius: UI_SIZE_28,
      },
      handleIndicator: {
        width: UI_SIZE_36,
        height: UI_SIZE_4,
        borderRadius: 9999,
        alignSelf: 'center',
        backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.5),
      },
      container: {
        paddingHorizontal: UI_SIZE_20,
      },
      title: {
        fontSize: FontSize.title,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.3,
        paddingVertical: UI_SIZE_14,
        paddingHorizontal: UI_SIZE_4,
        paddingTop: 0,
        color: c.onSurface,
      },
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: UI_SIZE_12,
      },
      gridItem: {
        width: '30%',
        alignItems: 'center',
        gap: UI_SIZE_8,
        paddingVertical: UI_SIZE_4,
      },
      iconCircle: {
        width: UI_SIZE_64,
        height: UI_SIZE_64,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
      },
      itemLabel: {
        fontSize: FontSize.caption,
        fontFamily: FontFamily.medium,
        fontWeight: FontWeight.medium,
        textAlign: 'center',
        lineHeight: 16,
        color: c.onSurfaceVariant,
      },
      bottomPad: {
        height: UI_SIZE_28,
      },
    })
    return styles
  },
  useMD3Theme,
)
