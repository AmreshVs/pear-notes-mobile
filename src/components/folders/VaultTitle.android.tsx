import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, type StyleProp, StyleSheet, type TextStyle, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultSwitcher } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hapticSelection } from '@/lib/haptics'
import { getVaultLabel } from '@/lib/vaultLabels'

import { VaultDrawer } from './VaultDrawer.android'

type Props = {
  title: string
  titleStyle: StyleProp<TextStyle>
}

export function VaultTitle({ title, titleStyle }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const { currentVault, visible, busy, sheetOpen, setSheetOpen } = useVaultSwitcher()
  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])

  const openDrawer = useCallback(() => {
    hapticSelection()
    setSheetOpen(true)
  }, [setSheetOpen])
  const closeDrawer = useCallback(() => setSheetOpen(false), [setSheetOpen])

  if (!visible) return <Text style={titleStyle}>{title}</Text>

  return (
    <View style={styles.row}>
      <Pressable
        onPress={openDrawer}
        disabled={busy}
        android_ripple={ripple}
        hitSlop={UI_SIZE_8}
        accessibilityRole="button"
        accessibilityLabel={t('vaults.drawer.open')}
        style={styles.menuButton}
      >
        <MaterialCommunityIcons name="menu" size={UI_ICON_SIZE_24} color={md3.colors.onSurface} />
      </Pressable>
      <Text style={[titleStyle, styles.shrink]} numberOfLines={1}>
        {getVaultLabel(currentVault, t)}
      </Text>
      <VaultDrawer visible={sheetOpen} onClose={closeDrawer} />
    </View>
  )
}

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    menuButton: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginLeft: -UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      ...commonStyles.centered,
    },
    shrink: {
      flexShrink: 1,
    },
  })
  return styles
})
