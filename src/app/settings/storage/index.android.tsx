import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'

import { AndroidDeviceStorageOverview } from '@/components/android/AndroidDeviceStorageOverview'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { RemovalBottomSheet } from '@/components/android/RemovalBottomSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { UI_SIZE_20, UI_SIZE_40 } from '@/constants/commonStyles'
import { useDeviceStorage } from '@/hooks/useDeviceStorage'
import { getVaultLabel } from '@/lib/vaultLabels'
import { buildRemoveAllDetails } from '@/utils/removalDetails'

export default function AndroidDeviceStorageScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const {
    total,
    measured,
    vaultUsage,
    breakdown,
    isClearingCache,
    isDeletingOldVaults,
    handleClearCache,
    handleDeleteOldVaults,
    handleOpenAiModels,
    handleOpenVaultStorage,
    removeSheetVisible,
    openRemoveSheet,
    closeRemoveSheet,
    confirmRemoveAll,
  } = useDeviceStorage()

  const removeAllDetails = useMemo(
    () =>
      buildRemoveAllDetails(t, {
        device: 'phone',
        vaultNames: vaultUsage.map((vault) => getVaultLabel(vault, t)),
        vaultBytes: vaultUsage.reduce((sum, vault) => sum + vault.bytes, 0),
        aiBytes: breakdown.aiBytes,
        showAi: breakdown.showAi,
        dataBytes: breakdown.dataBytes,
      }),
    [breakdown, t, vaultUsage],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={md3.dark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />
      <AndroidSettingsAppBar title={t('layouts.storage')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AndroidDeviceStorageOverview
          total={total}
          measured={measured}
          vaultUsage={vaultUsage}
          breakdown={breakdown}
          isClearingCache={isClearingCache}
          isDeletingOldVaults={isDeletingOldVaults}
          onClearCache={handleClearCache}
          onDeleteOldVaults={handleDeleteOldVaults}
          onOpenAiModels={handleOpenAiModels}
          onOpenVaultStorage={handleOpenVaultStorage}
          onRemoveAllData={openRemoveSheet}
        />
      </ScrollView>
      <RemovalBottomSheet
        visible={removeSheetVisible}
        details={removeAllDetails}
        onConfirm={confirmRemoveAll}
        onCancel={closeRemoveSheet}
      />
    </View>
  )
}

const useAndroidStorageHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: md3.colors.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
  })
  return styles
}, useAndroidStorageHooks)
