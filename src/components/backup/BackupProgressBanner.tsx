import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname } from 'expo-router'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_50,
} from '@/constants/commonStyles'

import { useBackupProgressBanner } from './useBackupProgressBanner'
import { useBackupProgressBannerAnimation } from './useBackupProgressBannerAnimation'

export function BackupProgressBanner() {
  const theme = useTheme()
  const styles = useStyles()

  const {
    t,
    isExporting,
    isComplete,
    isCollapsedCircle,
    showCollapsedProgress,
    progressStatus,
    message,
    completeTitle,
    completeAction,
    isKeepAwake,
    isVisible,
    isIOS,
    handlePress,
    toggleCollapse,
    toggleKeepAwake,
  } = useBackupProgressBanner()

  const { containerStyle, textContainerStyle, actionsContainerStyle } =
    useBackupProgressBannerAnimation(isVisible, isCollapsedCircle)

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
          isCollapsedCircle && styles.bannerCollapsed,
          pressed && commonStyles.pressed,
        ]}
      >
        {isComplete ? (
          <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={theme.colors.primary} />
        ) : showCollapsedProgress ? (
          <Text style={styles.collapsedPct} numberOfLines={1}>
            {progressStatus.progress}%
          </Text>
        ) : (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}

        {isCollapsedCircle ? null : isComplete ? (
          <Animated.View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {completeTitle}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {completeAction}
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
                  <SymbolIcon
                    name="hourglass"
                    size={UI_ICON_SIZE_20}
                    color={isKeepAwake ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </Pressable>
              )}

              <Pressable
                onPress={toggleCollapse}
                style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="chevron.down"
                  size={UI_ICON_SIZE_20}
                  color={theme.colors.textSecondary}
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
        borderRadius: Radii.card,
        boxShadow: theme.colors.cardShadow,
        borderWidth: 1,
        borderColor: theme.colors.borderSecondary,
      },
      bannerCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: Space.xs,
        width: UI_SIZE_50,
        height: UI_SIZE_50,
        borderRadius: Radii.pill,
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
