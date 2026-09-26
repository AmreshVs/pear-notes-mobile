import { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  title: string
  description: string
  buttonLabel: string
  disabled?: boolean
  onPress: () => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function DangerActionCard({ title, description, buttonLabel, disabled, onPress }: Props) {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const rippleDanger = useMemo(() => androidRipple(md3.colors.error), [md3.colors.error])

  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={rippleDanger}
        accessibilityRole="button"
        style={disabled ? [styles.button, commonStyles.disabled] : styles.button}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={UI_ICON_SIZE_20}
          color={md3.colors.error}
        />
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  )
}

const useCardHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_20,
      gap: UI_SIZE_16,
    },
    text: {
      gap: UI_SIZE_4,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    button: {
      overflow: 'hidden',
      ...commonStyles.row,
      ...commonStyles.centered,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.error, 0.08),
    },
    buttonText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useCardHooks)
