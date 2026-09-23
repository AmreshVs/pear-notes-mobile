import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, usePathname } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'
import { useSettingsSections } from '@/hooks/useSettingsSections'
import { androidRipple } from '@/lib/androidRipple'

type AndroidSettingsAppBarProps = {
  title: string
  showBack?: boolean
  onBack?: () => void
  backTint?: string
}

export const AndroidSettingsAppBar = memo(function AndroidSettingsAppBar({
  title,
  showBack,
  onBack,
  backTint,
}: AndroidSettingsAppBarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors
  const compact = useIsLargeScreen()
  const pathname = usePathname()
  const sections = useSettingsSections()

  const isMenuSectionRoot = useMemo(
    () => sections.some((section) => section.route === pathname),
    [sections, pathname],
  )
  const backVisible = showBack ?? !(compact && isMenuSectionRoot)

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
      return
    }
    router.back()
  }, [onBack])

  const barStyle = useMemo(() => {
    if (!compact) return styles.bar
    return backVisible ? styles.barCompact : styles.barCompactNoBack
  }, [compact, backVisible, styles.bar, styles.barCompact, styles.barCompactNoBack])

  return (
    <View style={barStyle}>
      {backVisible && (
        <Pressable
          onPress={handleBack}
          android_ripple={ripple}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={UI_ICON_SIZE_24}
            color={backTint ?? c.primary}
          />
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  )
})

const useAppBarHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3, insets }: ReturnType<typeof useAppBarHooks>) => {
    const c = md3.colors
    const compactBar = {
      ...commonStyles.row,
      minHeight: UI_SIZE_40,
      paddingTop: insets.top + UI_SIZE_4,
      paddingBottom: UI_SIZE_4,
    }
    const styles = StyleSheet.create({
      bar: {
        ...commonStyles.row,
        paddingTop: insets.top + UI_SIZE_16,
        paddingHorizontal: UI_SIZE_16,
        paddingBottom: UI_SIZE_16,
      },
      barCompact: {
        ...compactBar,
        paddingHorizontal: UI_SIZE_16,
      },
      barCompactNoBack: {
        ...compactBar,
        paddingHorizontal: UI_SIZE_20,
      },
      iconBtn: {
        width: UI_SIZE_40,
        height: UI_SIZE_40,
        ...commonStyles.centered,
        overflow: 'hidden',
        borderRadius: UI_SIZE_9999,
      },
      title: {
        ...commonStyles.flex1,
        fontSize: FontSize.title,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.onSurface,
        textAlign: 'left',
      },
    })
    return styles
  },
  useAppBarHooks,
)
