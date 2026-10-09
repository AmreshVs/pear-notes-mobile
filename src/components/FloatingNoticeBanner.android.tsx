import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { FloatingNoticeBannerProps } from './FloatingNoticeBanner.types'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
}

const useBannerHooks = () => ({
  md3: useMD3Theme(),
  insets: useSafeAreaInsets(),
})

export function FloatingNoticeBanner({
  icon,
  title,
  description,
  descriptionLines = 1,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
}: FloatingNoticeBannerProps) {
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()

  return (
    <MotionView
      style={styles.container}
      entering={FadeInDown.duration(Durations.overlayFade)}
      exiting={FadeOutDown.duration(Durations.overlayFadeOut)}
    >
      <RNView style={styles.banner}>
        <RNView style={styles.infoRow}>
          <RNView style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon.android} size={UI_ICON_SIZE_20} color={c.primary} />
          </RNView>

          <RNView style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={descriptionLines}>
              {description}
            </Text>
          </RNView>

          <Pressable
            onPress={onDismiss}
            accessibilityLabel={dismissLabel}
            style={({ pressed }) => [styles.dismissBtn, pressed && commonStyles.pressed]}
          >
            <MaterialCommunityIcons
              name="close"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>
        </RNView>

        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </Pressable>
      </RNView>
    </MotionView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 5000,
      elevation: 8,
      bottom: insets.bottom + Space.lg,
      left: Space.lg,
      right: Space.lg,
    },
    banner: {
      backgroundColor: md3.dark
        ? (c.surfaceContainerHighest ?? c.surfaceVariant)
        : (c.surfaceContainerHigh ?? c.surface),
      padding: Space.md,
      borderRadius: UI_SIZE_28,
      gap: Space.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    textContainer: {
      marginLeft: Space.md,
      flex: 1,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    dismissBtn: {
      padding: Space.xs,
      marginLeft: Space.xs,
    },
    actionBtn: {
      height: 40,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    actionBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: c.onPrimary,
    },
  })
  return styles
}, useBannerHooks)
