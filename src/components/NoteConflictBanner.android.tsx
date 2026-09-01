import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { useNoteConflict } from './useNoteConflict'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
}

const EDITOR_HEADER_OFFSET = 52

const useBannerHooks = () => ({
  md3: useMD3Theme(),
  insets: useSafeAreaInsets(),
})

export function NoteConflictBanner({ noteKey }: { noteKey: string | null }) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
          <MaterialCommunityIcons
            name="information-outline"
            size={UI_ICON_SIZE_20}
            color={c.onPrimaryContainer || c.primary}
          />
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

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 400,
      elevation: 8,
      top: insets.top + EDITOR_HEADER_OFFSET,
      left: Space.lg,
      right: Space.lg,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
    },
    iconCircle: {
      width: 28,
      height: 28,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    title: {
      flex: 1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    primaryBtn: {
      height: 32,
      paddingHorizontal: Space.md,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    primaryBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: c.onPrimary,
    },
    secondaryBtn: {
      height: 32,
      paddingHorizontal: Space.md,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primaryContainer || c.surfaceVariant,
    },
    secondaryBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: c.onPrimaryContainer || c.onSurface,
    },
  })
  return styles
}, useBannerHooks)
