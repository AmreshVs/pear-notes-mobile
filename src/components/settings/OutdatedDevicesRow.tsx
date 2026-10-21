import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { outdatedDeviceMeta } from '@/utils/deviceSeen'

import { type SyncedDevice, UNNAMED_DEVICE } from './usePrivacyLock'

export function OutdatedDevicesRow({ devices }: { devices: SyncedDevice[] }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()

  const renderChip = useCallback(
    (device: SyncedDevice) => {
      const meta = outdatedDeviceMeta(device, t)
      return (
        <RNView key={device.key} style={styles.chip}>
          <SymbolIcon
            name={device.deviceType === 'desktop' ? 'desktopcomputer' : 'iphone'}
            size={UI_ICON_SIZE_14}
            color={colors.textMuted}
          />
          <Text style={styles.chipText}>{device.title || UNNAMED_DEVICE}</Text>
          {!!meta && <Text style={styles.chipMeta}>{meta}</Text>}
        </RNView>
      )
    },
    [styles, t, colors.textMuted],
  )

  return (
    <RNView style={styles.row}>
      <RNView style={styles.iconBox}>
        <SymbolIcon
          name="shield.lefthalf.filled"
          size={UI_ICON_SIZE_20}
          color={colors.primary}
          weight="medium"
        />
      </RNView>
      <RNView style={commonStyles.flex1}>
        <Text style={styles.title}>{t('settings.privacy.outdatedDevices')}</Text>
        <Text style={styles.desc}>{t('settings.privacy.outdatedDevicesDesc')}</Text>
        <RNView style={styles.chips}>{devices.map(renderChip)}</RNView>
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.md,
      padding: Space.lg,
    },
    iconBox: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    desc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginTop: UI_SIZE_2,
      lineHeight: FontSize.body * 1.4,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Space.sm,
      marginTop: Space.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    chipText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    chipMeta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
