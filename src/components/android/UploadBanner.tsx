import { memo, useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

type UploadBannerProps = {
  fileName: string
  status?: string
  progress?: number
  onCancel?: () => void
  style?: StyleProp<ViewStyle>
}

export const UploadBanner = memo(function UploadBanner({
  fileName,
  status,
  progress,
  onCancel,
  style,
}: UploadBannerProps) {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const showProgress = typeof progress === 'number'

  return (
    <View style={[styles.uploadBanner, style]}>
      {showProgress ? null : (
        <ActivityIndicator size="small" color={c.primary} style={styles.uploadSpinner} />
      )}
      <View style={styles.uploadText}>
        {showProgress ? (
          <>
            <View style={styles.uploadHeaderRow}>
              <Text style={styles.uploadName}>{status}</Text>
              <Text style={styles.uploadPercent}>{`${progress}%`}</Text>
            </View>
            <Text style={styles.uploadFileName} numberOfLines={1}>
              {fileName}
            </Text>
            <View style={styles.uploadTrack}>
              <View style={[styles.uploadFill, { width: `${progress}%` }]} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.uploadName} numberOfLines={1}>
              {fileName}
            </Text>
            <Text style={styles.uploadStatus}>{status}</Text>
          </>
        )}
      </View>
      {showProgress && onCancel ? (
        <Pressable
          onPress={onCancel}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.uploadCancel}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_20} color={c.onSurface} />
        </Pressable>
      ) : null}
    </View>
  )
})

const useUploadHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    uploadBanner: {
      position: 'absolute',
      left: UI_SIZE_20,
      right: UI_SIZE_20,
      borderRadius: UI_SIZE_16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      zIndex: 20,
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
    },
    uploadSpinner: {
      marginRight: UI_SIZE_12,
    },
    uploadText: {
      flex: 1,
      gap: UI_SIZE_6,
    },
    uploadHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: UI_SIZE_12,
    },
    uploadName: {
      flex: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    uploadPercent: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    uploadFileName: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    uploadStatus: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    uploadTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: c.surfaceVariant ?? c.surface,
      overflow: 'hidden',
    },
    uploadFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    uploadCancel: {
      overflow: 'hidden',
      width: UI_SIZE_20 + UI_SIZE_12,
      height: UI_SIZE_20 + UI_SIZE_12,
      marginLeft: UI_SIZE_6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: UI_SIZE_20,
    },
    uploadCancelPressed: {
      opacity: 0.6,
    },
  })
  return styles
}, useUploadHooks)
