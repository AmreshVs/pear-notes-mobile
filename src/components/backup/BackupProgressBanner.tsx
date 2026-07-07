import { usePathname } from 'expo-router'
import { ChevronDown, Moon, Sun } from 'lucide-react-native'
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBackupProgressBanner } from './useBackupProgressBanner'

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

const isAndroid = Platform.OS === 'android'

export function BackupProgressBanner() {
  const theme = useTheme()
  const styles = useStyles()

  const {
    t,
    isExporting,
    progressStatus,
    message,
    isCollapsed,
    isKeepAwake,
    isActive,
    isVisible,
    isIOS,
    handlePress,
    toggleCollapse,
    toggleKeepAwake,
  } = useBackupProgressBanner()

  const fadeAnim = useDerivedValue(() => {
    return withTiming(isVisible ? 1 : 0, { duration: Durations.fade })
  }, [isVisible])

  const collapseAnim = useDerivedValue(() => {
    return withTiming(isCollapsed ? 0 : 1, { duration: Durations.fade })
  }, [isCollapsed])

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [
        {
          translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]),
        },
      ],
    }
  })

  const textContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: collapseAnim.value,
      width: interpolate(collapseAnim.value, [0, 1], [0, 200]),
    }
  })

  const actionsContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: collapseAnim.value,
    }
  })

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={isActive ? 'box-none' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.banner,
          isCollapsed && styles.bannerCollapsed,
          pressed && commonStyles.pressed,
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />

        <Animated.View style={[styles.textContainer, textContainerStyle]}>
          <Text style={styles.title} numberOfLines={1}>
            {isExporting ? t('backup.title') : t('backup.restoreTitle')}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {message} {progressStatus.progress > 0 ? `(${progressStatus.progress}%)` : ''}
          </Text>
        </Animated.View>

        <Animated.View style={[actionsContainerStyle, styles.actionsContainer]}>
          {isIOS && (
            <Pressable
              onPress={toggleKeepAwake}
              style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
            >
              {isKeepAwake ? (
                <Sun size={UI_ICON_SIZE_20} color={theme.colors.primary} />
              ) : (
                <Moon size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
              )}
            </Pressable>
          )}

          <Pressable
            onPress={toggleCollapse}
            style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
          >
            <ChevronDown size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { insets, pathname }) => {
    const isMainTab = pathname.startsWith('/(tabs)') || pathname === '/'
    const bottomOffset = isMainTab ? insets.bottom + (isAndroid ? 65 : 85) : insets.bottom + 16

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
        backgroundColor: theme.colors.surface,
        padding: Space.md,
        borderRadius: Radii.lg,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderColor: theme.colors.borderSecondary,
      },
      bannerCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: Space.sm,
        width: 50,
        height: 50,
        borderRadius: 25,
      },
      textContainer: {
        marginLeft: Space.md,
        flex: 1,
        overflow: 'hidden',
      },
      title: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        color: theme.colors.text,
        marginBottom: 2,
      },
      subtitle: {
        fontSize: FontSize.caption,
        color: theme.colors.textSecondary,
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
    insets: useSafeAreaInsets(),
    pathname: usePathname(),
  }),
)
