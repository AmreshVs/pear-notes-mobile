import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_24,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'

interface AskVaultHeroProps {
  subtitle: string
}

export const AskVaultHero = memo(function AskVaultHero({ subtitle }: AskVaultHeroProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.hero}>
      <SymbolView
        name="sparkles"
        size={UI_ICON_SIZE_40}
        tintColor={colors.primary}
        weight="semibold"
      />
      <Text style={styles.title} accessibilityRole="header">
        {t('localAi.askVault.heroTitle')}
      </Text>
      <Text style={styles.subtitle} accessibilityRole="text">
        {subtitle}
      </Text>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingTop: UI_SIZE_24,
      paddingBottom: UI_SIZE_10,
    },
    title: {
      marginTop: UI_SIZE_6,
      textAlign: 'center',
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      lineHeight: 17,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
