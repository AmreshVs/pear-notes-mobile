import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { commonStyles, FontSize, FontWeight, Space } from '@/constants/commonStyles'
import { useVaultChangeOverlay } from '@/hooks/useVaultChangeOverlay'

const BLUR_INTENSITY = 60

export function VaultChangeOverlay() {
  const theme = useTheme()
  const styles = useStyles()
  const { visible, message } = useVaultChangeOverlay()

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={message}>
        <BlurView
          intensity={BLUR_INTENSITY}
          tint={theme.colorScheme}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
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
