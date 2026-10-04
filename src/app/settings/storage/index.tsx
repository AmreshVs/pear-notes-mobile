import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { ClearStorageBottomSheet } from '@/components/bottomsheet/ClearStorageAppBottomSheet'
import { DeviceStorageOverview } from '@/components/storage/DeviceStorageOverview'
import { createThemedStylesheet } from '@/components/Themed'
import { Space, UI_SIZE_60 } from '@/constants/commonStyles'
import { useDeviceStorage } from '@/hooks/useDeviceStorage'
import { getVaultLabel } from '@/lib/vaultLabels'
import { buildRemoveAllDetails } from '@/utils/removalDetails'

export default function DeviceStorageScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
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
        device: 'iphone',
        vaultNames: vaultUsage.map((vault) => getVaultLabel(vault, t)),
        vaultBytes: vaultUsage.reduce((sum, vault) => sum + vault.bytes, 0),
        aiBytes: breakdown.aiBytes,
        showAi: breakdown.showAi,
        dataBytes: breakdown.dataBytes,
      }),
    [breakdown, t, vaultUsage],
  )

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <DeviceStorageOverview
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
      <ClearStorageBottomSheet
        visible={removeSheetVisible}
        details={removeAllDetails}
        onConfirm={confirmRemoveAll}
        onCancel={closeRemoveSheet}
      />
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingBottom: UI_SIZE_60,
    },
  })
  return styles
})
