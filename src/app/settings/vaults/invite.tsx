import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { InviteCard } from '@/components/sync/InviteCard'
import { createThemedStylesheet } from '@/components/Themed'
import { Space } from '@/constants/commonStyles'
import { buildVaultInviteCopy } from '@/utils/inviteCopy'

import { useVaultInviteScreen } from './useVaultInviteScreen'

export default function VaultInviteScreen() {
  const styles = useStyles()
  const { t } = useTranslation()
  const { name, invite } = useVaultInviteScreen(t('vaults.defaultName'))
  const copy = useMemo(() => buildVaultInviteCopy(t, name), [name, t])
  const title = t('vaults.invite.title', { name })

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title }} />
      <InviteCard invite={invite} copy={copy} idleIcon="person.badge.plus" />
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
      paddingBottom: Space.scrollBottom,
    },
  })
  return styles
})
