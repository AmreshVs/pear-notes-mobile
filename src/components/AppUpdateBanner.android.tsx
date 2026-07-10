import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppUpdateBanner } from './useAppUpdateBanner'

import { useMD3Theme } from '@/components/android/useMD3Theme'
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

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const useBannerHooks = () => ({
  md3: useMD3Theme(),
  insets: useSafeAreaInsets(),
})

export function AppUpdateBanner() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
            <MaterialCommunityIcons name="download" size={UI_ICON_SIZE_20} color={c.primary} />
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
            <MaterialCommunityIcons
              name="close"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
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

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 5000,
      bottom: insets.bottom + Space.lg,
      left: Space.lg,
      right: Space.lg,
    },
    banner: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
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
    updateBtn: {
      height: 40,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    updateBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: c.onPrimary,
    },
  })
  return styles
}, useBannerHooks)
