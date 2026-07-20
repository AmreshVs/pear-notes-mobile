import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_40,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hideLockInfo, useLockInfoVisible } from '@/lib/lockInfoModal'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
  scrim?: string
}

export const LockUnavailableModal = memo(function LockUnavailableModal() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const visible = useLockInfoVisible()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hideLockInfo}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hideLockInfo} />

        <View style={styles.card} pointerEvents="box-none">
          <View style={styles.iconChip}>
            <MaterialCommunityIcons name="fingerprint" size={UI_ICON_SIZE_40} color={c.primary} />
          </View>

          <Text style={styles.title}>{t('noteCard.authUnavailableTitle')}</Text>
          <Text style={styles.sub}>{t('noteCard.authUnavailableDesc')}</Text>

          <Pressable
            onPress={hideLockInfo}
            style={({ pressed }) => [styles.btn, pressed && commonStyles.pressed]}
          >
            <Text style={styles.btnText}>{t('common.ok')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
})

const useMD3 = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    scrim: {
      flex: 1,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
      backgroundColor: hexWithAlpha(c.scrim || c.onSurface, 0.4),
    },
    card: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      padding: Space.xxl,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    iconChip: {
      width: 80,
      height: 80,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      marginBottom: Space.md,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      textAlign: 'center',
      marginBottom: Space.sm,
      color: c.onSurface,
    },
    sub: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: Space.xl,
      maxWidth: 280,
      color: c.onSurfaceVariant,
    },
    btn: {
      width: '100%',
      height: 52,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: c.primary,
    },
    btnText: {
      color: c.onPrimary,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
}, useMD3)
