import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { FadeIn, FadeOut } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_28,
} from '@/constants/commonStyles'
import { useVaultChangeOverlay } from '@/hooks/useVaultChangeOverlay'

const OVERLAY_Z_INDEX = 1000

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function VaultChangeOverlay() {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const { visible, message } = useVaultChangeOverlay()

  if (!visible) return null

  return (
    <MotionView
      style={styles.scrim}
      entering={FadeIn.duration(Durations.overlayFade)}
      exiting={FadeOut.duration(Durations.overlayFadeOut)}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <View style={styles.card}>
        <ActivityIndicator size="large" color={md3.colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </MotionView>
  )
}

const useOverlayHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      zIndex: OVERLAY_Z_INDEX,
      backgroundColor: theme.colors.backdrop,
    },
    card: {
      ...commonStyles.centered,
      gap: UI_SIZE_16,
      paddingVertical: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_24,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    message: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      textAlign: 'center',
    },
  })
  return styles
}, useOverlayHooks)
