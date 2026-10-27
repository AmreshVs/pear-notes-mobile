import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { AndroidDeviceCard } from '@/components/android/AndroidDeviceCard'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { AndroidSyncLeadersNotes } from '@/components/android/AndroidSyncLeadersNotes'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { AddDeviceRow } from '@/components/sync/AddDeviceRow'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_24,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { ADD_DEVICE_ROUTE, JOIN_VAULT_ROUTE } from '@/hooks/useVaultSwitcher'
import { getVaultLabel } from '@/lib/vaultLabels'

import useDevicesScreen from './useDevicesScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

export default function AndroidDevicesScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()

  const {
    openVault,
    hasSeveralVaults,
    deleteSheetVisible,
    setDeleteSheetVisible,
    syncedDevices,
    handleDeleteDevice,
    handleConfirmDelete,
  } = useDevicesScreen()

  const vaultName = getVaultLabel(openVault, t)
  const title = hasSeveralVaults ? t('sync.devicesIn', { name: vaultName }) : t('sync.title')

  const handleAddDevice = useCallback(() => router.push(ADD_DEVICE_ROUTE as never), [])
  const handleJoin = useCallback(() => router.push(JOIN_VAULT_ROUTE as never), [])
  const handleDismissDelete = useCallback(
    () => setDeleteSheetVisible(false),
    [setDeleteSheetVisible],
  )

  const deviceColors = useMemo(
    () => ({
      surfaceContainerHigh: c.surfaceContainerHigh,
      surfaceContainerHighest: c.surfaceContainerHighest,
      surfaceVariant: c.surfaceVariant,
      primary: c.primary,
      onSurface: c.onSurface,
      onSurfaceVariant: c.onSurfaceVariant,
      error: c.error,
    }),
    [c],
  )

  const deleteActions = useMemo(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('sync.delete.remove'),
        destructive: true,
        onPress: handleConfirmDelete,
      },
    ],
    [handleConfirmDelete, t],
  )

  const renderLocalDeviceCard = useCallback(
    (device: any, index: number) => (
      <AndroidDeviceCard
        key={device.key}
        device={device}
        isLocal
        colors={deviceColors}
        index={index}
        onDelete={handleDeleteDevice}
      />
    ),
    [deviceColors, handleDeleteDevice],
  )

  const renderOtherDeviceCard = useCallback(
    (device: any, index: number) => (
      <AndroidDeviceCard
        key={device.key}
        device={device}
        colors={deviceColors}
        index={index}
        onDelete={handleDeleteDevice}
      />
    ),
    [deviceColors, handleDeleteDevice],
  )

  const otherDevices = syncedDevices.filter((d: any) => !d.isLocal)
  const localDevices = syncedDevices.filter((d: any) => d.isLocal)

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <AndroidSettingsAppBar title={title} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.content}
        >
          <Text style={styles.description}>
            {t('sync.devices.screenDesc', { name: vaultName })}
          </Text>

          {localDevices.length > 0 && (
            <>
              <Text style={md3Styles.settingsSectionCamelCase}>{t('sync.devices.thisDevice')}</Text>
              <View style={styles.deviceList}>{localDevices.map(renderLocalDeviceCard)}</View>
            </>
          )}

          <Text
            style={[
              commonStyles.sectionHeader,
              md3Styles.settingsSectionCamelCase,
              localDevices.length > 0 && md3Styles.settingsSectionCamelCase,
            ]}
          >
            {t('sync.devices.otherDevices')}
          </Text>

          <View style={styles.deviceList}>
            {otherDevices.map(renderOtherDeviceCard)}
            <AddDeviceRow label={t('sync.add.button')} onPress={handleAddDevice} />
          </View>
          {otherDevices.length === 0 && (
            <Text style={styles.emptyText}>{t('sync.devices.empty')}</Text>
          )}

          <Text style={[commonStyles.sectionHeader, md3Styles.settingsSectionCamelCase]}>
            {t('sync.devices.joinSection')}
          </Text>
          <View style={styles.deviceList}>
            <AddDeviceRow icon="link" label={t('vaults.join.sectionTitle')} onPress={handleJoin} />
          </View>
          <Text style={styles.emptyText}>{t('sync.devices.joinHint')}</Text>

          <AndroidSyncLeadersNotes />

          <View style={styles.footNoteRow}>
            <MaterialCommunityIcons
              name="shield-check"
              size={UI_ICON_SIZE_12}
              color={c.primary}
              style={styles.warningIconMargin}
            />
            <Text style={styles.footNoteText}>{t('sync.footer')}</Text>
          </View>
        </MotionView>
      </ScrollView>

      <BottomActionSheet
        visible={deleteSheetVisible}
        onDismiss={handleDismissDelete}
        title={t('sync.delete.title', { name: vaultName })}
        subtitle={t('sync.delete.description', { name: vaultName })}
        showHeader
        actions={deleteActions}
      />
    </View>
  )
}

const useDevicesHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    content: {
      ...commonStyles.flex1,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_24,
    },
    warningIconMargin: {
      marginTop: UI_SIZE_2,
    },
    footNoteRow: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_24,
    },
    footNoteText: {
      fontSize: FontSize.caption,
      ...commonStyles.flex1,
      lineHeight: UI_SIZE_17,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    deviceList: {
      gap: UI_SIZE_12,
    },
    emptyText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      marginTop: UI_SIZE_8,
      marginHorizontal: UI_SIZE_4,
      color: c.onSurfaceVariant,
    },
  })

  return styles
}, useDevicesHooks)
