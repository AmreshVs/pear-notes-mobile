import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { RootOverlay } from '@/components/RootOverlay'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  acceptNoteLockPrompt,
  declineNoteLockPrompt,
  useNoteLockPromptModal,
} from '@/components/useNoteLockPromptModal'
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
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
  scrim?: string
}

export const NoteLockPromptModal = memo(function NoteLockPromptModal() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { visible, isOffer, copy, deviceMethod } = useNoteLockPromptModal()

  const method = deviceMethod === 'none' ? '' : t(getLockMethodLabelKey(deviceMethod))

  return (
    <RootOverlay visible={visible} onRequestClose={declineNoteLockPrompt}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.iconChip}>
            <MaterialCommunityIcons
              name={isOffer ? 'fingerprint' : 'lock-outline'}
              size={UI_ICON_SIZE_40}
              color={c.primary}
            />
          </View>

          <Text style={styles.title}>{t(copy.title, { method })}</Text>
          <Text style={styles.sub}>{t(copy.body, { method })}</Text>

          <Pressable
            onPress={acceptNoteLockPrompt}
            style={({ pressed }) => [
              styles.btn,
              styles.confirmBtn,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.confirmText}>{t(copy.confirm, { method })}</Text>
          </Pressable>
          <Pressable
            onPress={declineNoteLockPrompt}
            style={({ pressed }) => [styles.btn, pressed && commonStyles.pressed]}
          >
            <Text style={styles.cancelText}>{t('noteLockPrompt.notNow')}</Text>
          </Pressable>
        </View>
      </View>
    </RootOverlay>
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
      color: c.onSurfaceVariant,
    },
    btn: {
      width: '100%',
      height: 52,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    confirmBtn: {
      backgroundColor: c.primary,
      marginBottom: Space.sm,
    },
    confirmText: {
      color: c.onPrimary,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
    },
    cancelText: {
      color: c.primary,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
}, useMD3)
