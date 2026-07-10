import { Download, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppUpdateBanner } from './useAppUpdateBanner'

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

export function AppUpdateBanner() {
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = useStyles()
  const { isVisible, latestVersion, dismiss, openStore } = useAppUpdateBanner()

  if (!isVisible) return null

  return (
    <Animated.View
      style={styles.container}
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(200)}
    >
      <RNView style={styles.banner}>
        <RNView style={styles.infoRow}>
          <RNView style={styles.iconCircle}>
            <Download size={UI_ICON_SIZE_20} color={theme.colors.primary} />
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
            <X size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
          </Pressable>
        </RNView>

        <Pressable
          onPress={openStore}
          style={({ pressed }) => [styles.updateBtn, pressed && commonStyles.pressed]}
        >
          <Text style={styles.updateBtnText}>{t('update.banner.updateButton')}</Text>
        </Pressable>
      </RNView>
    </Animated.View>
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
        borderRadius: Radii.lg,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
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
        color: theme.colors.black,
      },
    })
    return styles
  },
  () => ({
    insets: useSafeAreaInsets(),
  }),
)
