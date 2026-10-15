import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { FontWeight } from '@/constants/commonStyles'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'

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
        scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('folders.title') }} />
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="folder/[id]" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="folder/[id]" options={{ headerShown: false }} />
      )}
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="upcoming" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="upcoming" options={{ headerShown: false }} />
      )}
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="birthdays" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="birthdays" options={{ headerShown: false }} />
      )}
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="attachments" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="attachments" options={{ headerShown: false }} />
      )}
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="duplicates" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="duplicates" options={{ headerShown: false }} />
      )}
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="recap" options={{ headerLargeTitle: true }} />
      ) : (
        <Stack.Screen name="recap" options={{ headerShown: false }} />
      )}
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
