import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { FadeIn, FadeOut } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'

import { MotionView } from '@/components/MotionView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { commonStyles, Durations, FontSize, FontWeight, Space } from '@/constants/commonStyles'
import { useVaultChangeOverlay } from '@/hooks/useVaultChangeOverlay'

const BLUR_INTENSITY = 60
const OVERLAY_Z_INDEX = 1000

export function VaultChangeOverlay() {
  const theme = useTheme()
  const styles = useStyles()
  const { visible, message } = useVaultChangeOverlay()

  if (!visible) return null

  return (
    <MotionView
      style={styles.layer}
      entering={FadeIn.duration(Durations.overlayFade)}
      exiting={FadeOut.duration(Durations.overlayFadeOut)}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityViewIsModal
    >
      <BlurView
        intensity={BLUR_INTENSITY}
        tint={theme.colorScheme}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </MotionView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    layer: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      zIndex: OVERLAY_Z_INDEX,
      backgroundColor: theme.colors.backdrop,
    },
    content: {
      ...commonStyles.centered,
      gap: Space.base,
      paddingHorizontal: Space.xl,
    },
    message: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      textAlign: 'center',
    },
  })
  return styles
})
