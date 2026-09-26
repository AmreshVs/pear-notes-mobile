import { Pressable, StyleSheet, View } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  title: string
  description: string
  buttonLabel: string
  disabled?: boolean
  onPress: () => void
}

export function DangerActionCard({ title, description, buttonLabel, disabled, onPress }: Props) {
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()

  return (
    <View style={[commonThemedStyles.card, styles.card]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          disabled && commonStyles.disabled,
          pressed && commonStyles.pressed,
        ]}
      >
        <SymbolIcon name="trash" size={UI_ICON_SIZE_16} color={colors.error} weight="medium" />
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    card: {
      padding: Space.lg,
      gap: Space.xs,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    button: {
      ...commonStyles.row,
      ...commonStyles.centered,
      gap: Space.sm,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      marginTop: Space.md,
      borderRadius: Radii.md,
      backgroundColor: hexWithAlpha(theme.colors.error, 0.08),
    },
    buttonText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
  })
  return styles
})
