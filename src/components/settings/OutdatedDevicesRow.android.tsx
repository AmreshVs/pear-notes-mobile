import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { outdatedDeviceMeta } from '@/utils/deviceSeen'

import { type SyncedDevice, UNNAMED_DEVICE } from './usePrivacyLock'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHighest?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

export function OutdatedDevicesRow({ devices }: { devices: SyncedDevice[] }) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()

  const renderChip = useCallback(
    (device: SyncedDevice) => {
      const meta = outdatedDeviceMeta(device, t)
      return (
        <View key={device.key} style={styles.chip}>
          <MaterialCommunityIcons
            name={device.deviceType === 'desktop' ? 'monitor' : 'cellphone'}
            size={UI_ICON_SIZE_14}
            color={c.onSurfaceVariant}
          />
          <Text style={styles.chipText}>{device.title || UNNAMED_DEVICE}</Text>
          {!!meta && <Text style={styles.chipMeta}>{meta}</Text>}
        </View>
      )
    },
    [styles, t, c.onSurfaceVariant],
  )

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="shield-plus-outline"
          size={UI_ICON_SIZE_22}
          color={c.primary}
        />
      </View>
      <View style={commonStyles.flex1}>
        <Text style={styles.title}>{t('settings.privacy.outdatedDevices')}</Text>
        <Text style={styles.desc}>{t('settings.privacy.outdatedDevicesDesc')}</Text>
        <View style={styles.chips}>{devices.map(renderChip)}</View>
      </View>
    </View>
  )
}

const useOutdatedDevicesHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      gap: UI_SIZE_16,
    },
    iconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    desc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_20,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    chipText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
    },
    chipMeta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useOutdatedDevicesHooks)
