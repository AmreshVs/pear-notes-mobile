import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { BlurView } from 'expo-blur'

import { GlassView } from '@/components/GlassView'
import { RootOverlay } from '@/components/RootOverlay'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  acceptNoteLockPrompt,
  declineNoteLockPrompt,
  useNoteLockPromptModal,
} from '@/components/useNoteLockPromptModal'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_40,
  UI_SIZE_50,
} from '@/constants/commonStyles'
import { useModalCardStyle } from '@/hooks/useModalCardStyle'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

export const NoteLockPromptModal = memo(function NoteLockPromptModal() {
  const { t } = useTranslation()
  const { colors, colorScheme } = useTheme()
  const styles = useStyles()
  const modalCardStyle = useModalCardStyle()
  const { visible, isOffer, copy, deviceMethod } = useNoteLockPromptModal()

  const method = deviceMethod === 'none' ? '' : t(getLockMethodLabelKey(deviceMethod))

  return (
    <RootOverlay visible={visible} onRequestClose={declineNoteLockPrompt}>
      <RNView style={styles.modalFill}>
        <BlurView intensity={95} tint={colorScheme} style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={modalCardStyle}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.icon}>
                <SymbolIcon
                  name={isOffer ? 'faceid' : 'lock'}
                  size={UI_ICON_SIZE_40}
                  color={colors.primary}
                />
              </RNView>

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
            </RNView>
          </GlassView>
        </RNView>
      </RNView>
    </RootOverlay>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    modalFill: {
      ...StyleSheet.absoluteFill,
    },
    modalCenter: {
      flex: 1,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      ...commonStyles.centered,
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.15),
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: LetterSpacing.tight,
      marginBottom: Space.sm,
      color: theme.colors.text,
    },
    sub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: Space.lg,
      color: theme.colors.text,
    },
    btn: {
      width: '100%',
      minHeight: UI_SIZE_50,
      borderRadius: Radii.md,
      ...commonStyles.centered,
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
      marginBottom: Space.sm,
    },
    confirmText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
