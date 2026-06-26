import { memo } from 'react'
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontWeight,
  UI_FONT_SIZE_11,
  UI_FONT_SIZE_13,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'

type UploadBannerProps = {
  fileName: string
  status: string
  style?: StyleProp<ViewStyle>
}

export const UploadBanner = memo(function UploadBanner({
  fileName,
  status,
  style,
}: UploadBannerProps) {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  return (
    <View style={[styles.uploadBanner, style]}>
      <ActivityIndicator size="small" color={c.primary} style={styles.uploadSpinner} />
      <View style={styles.uploadText}>
        <Text style={styles.uploadName} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={styles.uploadStatus}>{status}</Text>
      </View>
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
    },
    uploadName: {
      fontSize: UI_FONT_SIZE_13,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    uploadStatus: {
      fontSize: UI_FONT_SIZE_11,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: 1,
    },
  })
  return styles
}, useUploadHooks)
