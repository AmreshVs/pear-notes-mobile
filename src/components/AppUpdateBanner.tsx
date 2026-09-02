import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown, FadeOutDown } from 'react-native-reanimated'
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

import { useAppUpdateBanner } from './useAppUpdateBanner'

export function AppUpdateBanner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = useStyles()
  const { isVisible, latestVersion, dismiss, openStore } = useAppUpdateBanner()

  if (!isVisible) return null

  return (
    <MotionView
      style={styles.container}
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(200)}
    >
      <RNView style={styles.banner}>
        <RNView style={styles.infoRow}>
          <RNView style={styles.iconCircle}>
            <SymbolIcon
              name="square.and.arrow.down"
              size={UI_ICON_SIZE_20}
              color={theme.colors.primary}
            />
          </RNView>

          <RNView style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {t('update.banner.title')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('update.banner.description', { version: latestVersion })}
            </Text>
          </RNView>

          <Pressable
            onPress={dismiss}
            accessibilityLabel={t('update.banner.dismiss')}
            style={({ pressed }) => [styles.dismissBtn, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="xmark" size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
          </Pressable>
        </RNView>

        <Pressable
          onPress={openStore}
          style={({ pressed }) => [styles.updateBtn, pressed && commonStyles.pressed]}
        >
          <Text style={styles.updateBtnText}>{t('update.banner.updateButton')}</Text>
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
      updateBtn: {
        height: 40,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
      },
      updateBtnText: {
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
