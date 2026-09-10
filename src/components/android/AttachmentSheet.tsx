import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA, useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_26,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_64,
  UI_SIZE_9999,
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
  const sheet = useSheetStyles()
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

  const backgroundStyle = useMemo(() => sheet.sheetBackground, [sheet.sheetBackground])

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicator}
      onDismiss={handleSheetDismiss}
    >
      <BottomSheetView style={sheet.content}>
        <View style={sheet.header}>
          <Text style={sheet.title}>{t('attachments.addAttachment')}</Text>
        </View>

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

        <View style={sheet.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, md3Theme) => {
    const c = md3Theme.colors as ExtendedColors
    const styles = StyleSheet.create({
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
        borderRadius: UI_SIZE_9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
      },
      itemLabel: {
        fontSize: FontSize.caption,
        fontFamily: FontFamily.medium,
        fontWeight: FontWeight.medium,
        textAlign: 'center',
        lineHeight: UI_SIZE_16,
        color: c.onSurfaceVariant,
      },
    })
    return styles
  },
  useMD3Theme,
)
