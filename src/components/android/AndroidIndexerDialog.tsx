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
  UI_ICON_SIZE_36,
  UI_SIZE_28,
  UI_SIZE_52,
  UI_SIZE_80,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getLeaderModalCopy } from '@/utils/indexerUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
  scrim?: string
}

type Props = {
  visible: boolean
  mode: 'add' | 'remove'
  deviceName: string
  isLocalTarget: boolean
  onCancel: () => void
  onConfirm: () => void
}

export const AndroidIndexerDialog = memo(function AndroidIndexerDialog({
  visible,
  mode,
  deviceName,
  isLocalTarget,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const copy = getLeaderModalCopy(t, mode, isLocalTarget, deviceName)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.card} pointerEvents="box-none">
          <View style={styles.iconChip}>
            <MaterialCommunityIcons
              name={mode === 'remove' ? 'minus-circle-outline' : 'crown-outline'}
              size={UI_ICON_SIZE_36}
              color={c.onPrimaryContainer || c.primary}
            />
          </View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.sub}>{copy.body}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btnGhost, pressed && commonStyles.pressed]}
            >
              <Text style={styles.btnGhostText}>{t('sync.delete.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.btnFilled, pressed && commonStyles.pressed]}
            >
              <Text style={styles.btnFilledText}>{copy.confirm}</Text>
            </Pressable>
          </View>
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
      width: UI_SIZE_80,
      height: UI_SIZE_80,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      marginBottom: Space.md,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.35),
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
      color: c.onSurfaceVariant,
    },
    actions: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      gap: Space.sm,
    },
    btnGhost: {
      flex: 1,
      height: UI_SIZE_52,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    btnGhostText: {
      color: c.onSurface,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
    },
    btnFilled: {
      flex: 1,
      height: UI_SIZE_52,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: c.primary,
    },
    btnFilledText: {
      color: c.onPrimary,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
}, useMD3)
