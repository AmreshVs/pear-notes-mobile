import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname } from 'expo-router'
import { Check, ChevronDown, Coffee } from 'lucide-react-native'

import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'

import { useBackupProgressBanner } from './useBackupProgressBanner'
import { useBackupProgressBannerAnimation } from './useBackupProgressBannerAnimation'

export function BackupProgressBanner() {
  const theme = useTheme()
  const styles = useStyles()

  const {
    t,
    isExporting,
    isExportComplete,
    progressStatus,
    message,
    isCollapsed,
    isKeepAwake,
    isVisible,
    isIOS,
    handlePress,
    toggleCollapse,
    toggleKeepAwake,
  } = useBackupProgressBanner()

  const { containerStyle, textContainerStyle, actionsContainerStyle } =
    useBackupProgressBannerAnimation(isVisible, isCollapsed)

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={isVisible ? 'box-none' : 'none'}
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
          <Check size={UI_ICON_SIZE_20} color={theme.colors.primary} />
        ) : isCollapsed && progressStatus.progress > 0 ? (
          <Text style={styles.collapsedPct}>{progressStatus.progress}%</Text>
        ) : (
          <ActivityIndicator size="small" color={theme.colors.primary} />
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
              {isIOS && (
                <Pressable
                  onPress={toggleKeepAwake}
                  style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
                >
                  <Coffee
                    size={UI_ICON_SIZE_20}
                    color={isKeepAwake ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </Pressable>
              )}

              <Pressable
                onPress={toggleCollapse}
                style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
              >
                <ChevronDown size={UI_ICON_SIZE_20} color={theme.colors.textSecondary} />
              </Pressable>
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { insets, pathname }) => {
    const isMainTab = pathname.startsWith('/(tabs)') || pathname === '/'
    const bottomOffset = isMainTab ? insets.bottom + 85 : insets.bottom + 16

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
        boxShadow: theme.colors.cardShadow,
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
      collapsedPct: {
        fontSize: FontSize.caption,
        fontWeight: FontWeight.bold,
        color: theme.colors.primary,
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
