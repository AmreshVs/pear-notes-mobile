import { Lock } from 'lucide-react-native'
import { memo } from 'react'
import { View as RNView, StyleSheet } from 'react-native'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { useLockedContentShield } from '@/components/useLockedContentShield'
import { commonStyles, Radii, Space, UI_ICON_SIZE_40 } from '@/constants/commonStyles'

export const LockedContentShield = memo(function LockedContentShield({
  active,
}: {
  active: boolean
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const { visible } = useLockedContentShield(active)

  if (!visible) return null

  return (
    <RNView style={styles.overlay}>
      <RNView style={styles.iconRing}>
        <Lock size={UI_ICON_SIZE_40} color={colors.primary} strokeWidth={2} />
      </RNView>
    </RNView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...commonStyles.centered,
      backgroundColor: theme.colors.background,
      zIndex: 9999,
      gap: Space.lg,
    },
    iconRing: {
      ...commonStyles.iconRing80,
      backgroundColor: `${theme.colors.primary}26`,
      borderColor: `${theme.colors.primary}4D`,
      borderRadius: Radii.card,
    },
  })
  return styles
})
