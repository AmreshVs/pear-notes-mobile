import { StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { commonStyles, FontFamily, FontSize, Radii, UI_SIZE_40 } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultInitial } from '@/lib/vaultLabels'

type Props = {
  label: string
  current: boolean
}

export function VaultAvatar({ label, current }: Props) {
  const styles = useStyles()
  return (
    <View style={current ? styles.avatarCurrent : styles.avatar}>
      <Text style={current ? styles.textCurrent : styles.text}>{getVaultInitial(label)}</Text>
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const avatarBase = {
    width: UI_SIZE_40,
    height: UI_SIZE_40,
    borderRadius: Radii.md,
    ...commonStyles.centered,
  }
  const textBase = {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
  }
  const styles = StyleSheet.create({
    avatar: {
      ...avatarBase,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    avatarCurrent: {
      ...avatarBase,
      backgroundColor: c.primaryContainer,
    },
    text: {
      ...textBase,
      color: c.onSurfaceVariant,
    },
    textCurrent: {
      ...textBase,
      color: c.onPrimaryContainer,
    },
  })
  return styles
}, useMD3Theme)
