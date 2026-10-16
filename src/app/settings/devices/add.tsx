import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { InviteCard } from '@/components/sync/InviteCard'
import { createThemedStylesheet } from '@/components/Themed'
import { Space } from '@/constants/commonStyles'
import { buildAddDeviceCopy } from '@/utils/inviteCopy'

import { useAddDeviceScreen } from './useAddDeviceScreen'

export default function AddDeviceScreen() {
  const styles = useStyles()
  const { t } = useTranslation()
  const { name, invite } = useAddDeviceScreen(t('vaults.defaultName'))
  const copy = useMemo(() => buildAddDeviceCopy(t, name), [name, t])
  const title = t('sync.add.title')

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title }} />
      <InviteCard invite={invite} copy={copy} idleIcon="laptopcomputer.and.iphone" />
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
