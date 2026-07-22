import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { usePathname } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_16,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

import { useBackupProgressBanner } from './useBackupProgressBanner'
import { useBackupProgressBannerAnimation } from './useBackupProgressBannerAnimation'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export function BackupProgressBanner() {
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()

  const {
    t,
    isExporting,
    isExportComplete,
    progressStatus,
    message,
    isCollapsed,
    isVisible,
    handlePress,
    toggleCollapse,
  } = useBackupProgressBanner()

  const { containerStyle, textContainerStyle, actionsContainerStyle } =
    useBackupProgressBannerAnimation(isVisible, isCollapsed)

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={isVisible ? 'box-none' : 'none'}
      importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!isVisible}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.banner,
          isCollapsed && !isExportComplete && styles.bannerCollapsed,
          pressed && commonStyles.pressed,
        ]}
      >
        {isExportComplete ? (
          <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_20} color={c.primary} />
        ) : isCollapsed && progressStatus.progress > 0 ? (
          <Text style={styles.collapsedPct}>{progressStatus.progress}%</Text>
        ) : (
          <ActivityIndicator size="small" color={c.primary} />
        )}

        {isExportComplete ? (
          <Animated.View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {t('backup.bannerReadyTitle')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('backup.bannerReadyAction')}
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View style={[styles.textContainer, textContainerStyle]}>
              <Text style={styles.title} numberOfLines={1}>
                {isExporting ? t('backup.title') : t('backup.restoreTitle')}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {message} {progressStatus.progress > 0 ? `(${progressStatus.progress}%)` : ''}
              </Text>
            </Animated.View>

            <Animated.View style={[actionsContainerStyle, styles.actionsContainer]}>
              <Pressable
                onPress={toggleCollapse}
                style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
              >
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={UI_ICON_SIZE_20}
                  color={c.onSurfaceVariant}
                />
              </Pressable>
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (_theme, { md3, insets, pathname }) => {
    const c = md3.colors as ExtendedColors
    const isMainTab = pathname.startsWith('/(tabs)') || pathname === '/'
    const bottomOffset = isMainTab ? insets.bottom + 65 : insets.bottom + 16

    const styles = StyleSheet.create({
      container: {
        position: 'absolute',
        zIndex: 9999,
        overflow: 'hidden',
        bottom: bottomOffset,
        left: Space.lg,
        right: Space.lg,
      },
      banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
        padding: Space.md,
        borderRadius: UI_SIZE_16,
        elevation: 3,
      },
      bannerCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: Space.sm,
        width: 50,
        height: 50,
        borderRadius: UI_SIZE_9999,
      },
      collapsedPct: {
        fontSize: FontSize.caption,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.primary,
      },
      textContainer: {
        marginLeft: Space.md,
        flex: 1,
        overflow: 'hidden',
      },
      title: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.onSurface,
        marginBottom: 2,
      },
      subtitle: {
        fontSize: FontSize.caption,
        fontFamily: FontFamily.regular,
        color: c.onSurfaceVariant,
      },
      actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      actionBtn: {
        padding: Space.xs,
        marginLeft: Space.xs,
      },
    })
    return styles
  },
  () => ({
    md3: useMD3Theme(),
    insets: useSafeAreaInsets(),
    pathname: usePathname(),
  }),
)
