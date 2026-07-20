import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { FontWeight } from '@/constants/commonStyles'

export default function FoldersLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: styles.headerLarge,
        headerTitleStyle: styles.headerTitle,
        headerLargeTitleStyle: styles.headerLargeTitle,
        headerTintColor: colors.primary,
        headerLargeTitle: true,
        headerBlurEffect: 'none',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('folders.title') }} />
      <Stack.Screen name="folder/[id]" options={{ headerLargeTitle: true }} />
    </Stack>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    headerLarge: {
      backgroundColor: theme.colors.transparent,
    },
    headerTitle: {
      color: theme.colors.text,
      fontWeight: FontWeight.bold,
    },
    headerLargeTitle: {
      color: theme.colors.text,
      fontWeight: FontWeight.heavy,
    },
  })
  return styles
})
