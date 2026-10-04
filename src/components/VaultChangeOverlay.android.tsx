import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_28,
} from '@/constants/commonStyles'
import { useVaultChangeOverlay } from '@/hooks/useVaultChangeOverlay'

const noop = () => {}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function VaultChangeOverlay() {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const { visible, message } = useVaultChangeOverlay()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={noop}
    >
      <View style={styles.scrim} accessibilityRole="progressbar" accessibilityLabel={message}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={md3.colors.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
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
