import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { FloatingNoticeBannerProps } from './FloatingNoticeBanner.types'

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
  const theme = useTheme()
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
            <SymbolIcon name={icon.ios} size={UI_ICON_SIZE_20} color={theme.colors.primary} />
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
            <SymbolIcon name="xmark" size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
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

const useStyles = createThemedStylesheetWithHooks(
  (theme, { insets }) => {
    const styles = StyleSheet.create({
      container: {
        position: 'absolute',
        zIndex: 5000,
        bottom: insets.bottom + Space.lg,
        left: Space.lg,
        right: Space.lg,
      },
      banner: {
        backgroundColor: theme.colors.surface,
        padding: Space.md,
        borderRadius: Radii.card,
        boxShadow: theme.colors.cardShadow,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.borderSecondary,
        gap: Space.sm,
      },
      infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      iconCircle: {
        width: 36,
        height: 36,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
      },
      textContainer: {
        marginLeft: Space.md,
        flex: 1,
      },
      title: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        color: theme.colors.text,
      },
      subtitle: {
        fontSize: FontSize.caption,
        color: theme.colors.textSecondary,
      },
      dismissBtn: {
        padding: Space.xs,
        marginLeft: Space.xs,
      },
      actionBtn: {
        height: 40,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
      },
      actionBtnText: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        color: theme.colors.onPrimary,
      },
    })
    return styles
  },
  () => ({
    insets: useSafeAreaInsets(),
  }),
)
