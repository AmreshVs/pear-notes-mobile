import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'

import { AndroidInviteCard } from '@/components/android/AndroidInviteCard'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, useTheme } from '@/components/Themed'
import { commonStyles, UI_SIZE_16, UI_SIZE_40 } from '@/constants/commonStyles'
import { buildVaultInviteCopy } from '@/utils/inviteCopy'

import { useVaultInviteScreen } from './useVaultInviteScreen'

export default function AndroidVaultInviteScreen() {
  const theme = useTheme()
  const styles = useStyles()
  const { t } = useTranslation()
  const { name, invite } = useVaultInviteScreen(t('vaults.defaultName'))
  const copy = useMemo(() => buildVaultInviteCopy(t, name), [name, t])
  const title = t('vaults.invite.title', { name })

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />
      <AndroidSettingsAppBar title={title} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AndroidInviteCard invite={invite} copy={copy} idleIcon="account-plus-outline" />
      </ScrollView>
    </View>
  )
}

const useInviteHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: md3.colors.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingTop: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
  })
  return styles
}, useInviteHooks)
