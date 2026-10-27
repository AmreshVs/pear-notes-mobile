import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View as RNView } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { router, Stack } from 'expo-router'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { AddDeviceRow } from '@/components/sync/AddDeviceRow'
import { SyncDeviceCard } from '@/components/sync/SyncDeviceCard'
import { SyncLeadersNotes } from '@/components/sync/SyncLeadersNotes'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { commonStyles, FontSize, Radii, Space, UI_ICON_SIZE_13 } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { ADD_DEVICE_ROUTE, JOIN_VAULT_ROUTE } from '@/hooks/useVaultSwitcher'
import { getVaultLabel } from '@/lib/vaultLabels'

import useDevicesScreen from './useDevicesScreen'

export default function DevicesScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const { openVault, hasSeveralVaults, syncedDevices } = useDevicesScreen()
  const vaultName = getVaultLabel(openVault, t)
  const title = hasSeveralVaults
    ? t('sync.devicesIn', { name: vaultName })
    : t('layouts.linkDevices')

  const handleAddDevice = useCallback(() => router.push(ADD_DEVICE_ROUTE as never), [])
  const handleJoin = useCallback(() => router.push(JOIN_VAULT_ROUTE as never), [])

  const renderLocalDevices = useCallback(() => {
    return (syncedDevices as any[])
      .filter((d) => d.isLocal)
      .map((device, index, arr) => (
        <SyncDeviceCard
          key={device.key}
          device={device}
          showSep={index < arr.length - 1}
          animationIndex={index}
        />
      ))
  }, [syncedDevices])

  const renderOtherDevices = useCallback(() => {
    return (syncedDevices as any[])
      .filter((d) => !d.isLocal)
      .map((device, index) => (
        <SyncDeviceCard
          key={device.key}
          device={device}
          isOther
          showSep
          animationIndex={index + 1}
        />
      ))
  }, [syncedDevices])

  const otherDevices = (syncedDevices as any[]).filter((d) => !d.isLocal)

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title }} />
      <MotionView
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.pad}
      >
        <Text style={styles.description}>{t('sync.devices.screenDesc', { name: vaultName })}</Text>

        <RNView>
          <Text style={commonThemedStyles.sectionCamelCase}>{t('sync.devices.thisDevice')}</Text>
        </RNView>

        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.deviceGroup}
        >
          {renderLocalDevices()}
        </MotionView>

        <MotionView layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
          <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
            {t('sync.devices.otherDevices')}
          </Text>
        </MotionView>

        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.deviceGroup}
        >
          {renderOtherDevices()}
          <AddDeviceRow label={t('sync.add.button')} onPress={handleAddDevice} />
        </MotionView>
        {otherDevices.length === 0 && (
          <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
        )}

        <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
          {t('sync.devices.joinSection')}
        </Text>
        <RNView style={styles.deviceGroup}>
          <AddDeviceRow icon="link" label={t('vaults.join.sectionTitle')} onPress={handleJoin} />
        </RNView>
        <Text style={styles.emptyText}>{t('sync.devices.joinHint')}</Text>

        <SyncLeadersNotes />

        <RNView style={styles.footNoteRow}>
          <SymbolIcon
            name="checkmark.shield"
            size={UI_ICON_SIZE_13}
            color={colors.primary}
            style={styles.iconTopFix}
          />
          <Text style={styles.footNote}>{t('sync.footer')}</Text>
        </RNView>
      </MotionView>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    scroll: {
      paddingTop: Space.md,
      paddingBottom: Space.huge,
    },
    pad: {
      paddingHorizontal: Space.lg,
    },
    description: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
      marginBottom: Space.xl,
    },
    footNoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      marginTop: Space.xl,
    },
    footNote: {
      fontSize: FontSize.body,
      flex: 1,
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    deviceGroup: {
      borderRadius: Radii.card,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardSurface,
      borderColor: theme.colors.borderSecondary,
    },
    emptyText: {
      fontSize: FontSize.caption,
      marginTop: Space.sm,
      marginHorizontal: Space.xs,
      color: theme.colors.textMuted,
    },
    iconTopFix: {
      marginTop: 1,
    },
  })
  return styles
})
