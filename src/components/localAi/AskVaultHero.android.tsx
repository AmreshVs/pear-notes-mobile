import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_28,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_24,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

interface AskVaultHeroProps {
  subtitle: string
}

export const AskVaultHero = memo(function AskVaultHero({ subtitle }: AskVaultHeroProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const styles = useStyles()
  return (
    <View style={styles.hero}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_28} color={md3.colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('localAi.askVault.heroTitle')}
      </Text>
      <Text style={styles.subtitle} accessibilityRole="text">
        {subtitle}
      </Text>
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ReturnType<typeof useMD3Theme>['colors'] & {
    onSurfaceVariant?: string
  }
  const styles = StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingTop: UI_SIZE_24,
      paddingBottom: UI_SIZE_10,
    },
    badge: {
      ...commonStyles.centered,
      width: UI_SIZE_56,
      height: UI_SIZE_56,
      borderRadius: UI_SIZE_24,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
    },
    title: {
      marginTop: UI_SIZE_6,
      textAlign: 'center',
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
