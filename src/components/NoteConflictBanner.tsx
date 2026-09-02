import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { useNoteConflict } from './useNoteConflict'

const EDITOR_HEADER_OFFSET = 52

export function NoteConflictBanner({ noteKey }: { noteKey: string | null }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = useStyles()
  const { isVisible, keepMine, useTheirs } = useNoteConflict(noteKey)

  if (!isVisible) return null

  return (
    <MotionView
      style={styles.container}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
    >
      <RNView style={styles.banner}>
        <RNView style={styles.iconCircle}>
          <SymbolIcon name="info.circle" size={UI_ICON_SIZE_20} color={theme.colors.primary} />
        </RNView>

        <Text style={styles.title} numberOfLines={2}>
          {t('noteEditor.conflict.title')}
        </Text>

        <RNView style={styles.actions}>
          <Pressable
            onPress={keepMine}
            accessibilityRole="button"
            accessibilityLabel={t('noteEditor.conflict.keepMine')}
            style={({ pressed }) => [styles.primaryBtn, pressed && commonStyles.pressed]}
          >
            <Text style={styles.primaryBtnText}>{t('noteEditor.conflict.keepMine')}</Text>
          </Pressable>

          <Pressable
            onPress={useTheirs}
            accessibilityRole="button"
            accessibilityLabel={t('noteEditor.conflict.useTheirs')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && commonStyles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>{t('noteEditor.conflict.useTheirs')}</Text>
          </Pressable>
        </RNView>
      </RNView>
    </MotionView>
  )
}

const useBannerHooks = () => ({
  insets: useSafeAreaInsets(),
})

const useStyles = createThemedStylesheetWithHooks((theme, { insets }) => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 400,
      top: insets.top + EDITOR_HEADER_OFFSET,
      left: Space.lg,
      right: Space.lg,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSecondary,
      borderRadius: Radii.card,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
    },
    iconCircle: {
      width: 28,
      height: 28,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
    },
    title: {
      flex: 1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    primaryBtn: {
      height: 30,
      paddingHorizontal: Space.md,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    primaryBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.onPrimary,
    },
    secondaryBtn: {
      height: 30,
      paddingHorizontal: Space.md,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.colors.borderSecondary,
    },
    secondaryBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
}, useBannerHooks)
