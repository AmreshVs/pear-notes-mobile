import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { useLockedContentShield } from '@/components/useLockedContentShield'
import { commonStyles, UI_ICON_SIZE_40, UI_SIZE_9999 } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  primaryContainer?: string
}

export const LockedContentShield = memo(function LockedContentShield({
  active,
}: {
  active: boolean
}) {
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { visible } = useLockedContentShield(active)

  if (!visible) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.iconChip}>
        <MaterialCommunityIcons name="lock" size={UI_ICON_SIZE_40} color={c.primary} />
      </View>
    </View>
  )
})

const useMD3 = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...commonStyles.centered,
      backgroundColor: c.background,
      zIndex: 9999,
    },
    iconChip: {
      width: 80,
      height: 80,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
  })
  return styles
}, useMD3)
