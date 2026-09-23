import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, usePathname } from 'expo-router'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_36,
  UI_SIZE_56,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { type SettingsSection, useSettingsSections } from '@/hooks/useSettingsSections'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

export function SettingsMenuColumn() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors
  const pathname = usePathname()
  const sections = useSettingsSections()

  const handleClose = useCallback(() => {
    router.dismissAll()
    router.back()
  }, [])

  const renderSection = useCallback(
    (section: SettingsSection) => (
      <SettingsMenuRow
        key={section.key}
        section={section}
        active={pathname.startsWith(section.route)}
      />
    ),
    [pathname],
  )

  return (
    <View style={styles.container}>
      <AndroidSettingsAppBar
        title={t('settings.title')}
        showBack
        onBack={handleClose}
        backTint={c.onSurface}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sections.map(renderSection)}
      </ScrollView>
    </View>
  )
}

function SettingsMenuRow({ section, active }: { section: SettingsSection; active: boolean }) {
  const pathname = usePathname()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const handlePress = useCallback(() => {
    if (pathname === SETTINGS_ROOT_PATH) {
      router.push(section.route as never)
      return
    }
    router.replace(section.route as never)
  }, [pathname, section.route])

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      style={[styles.row, active && styles.rowActive]}
      accessibilityRole="button"
      accessibilityState={active ? activeState : inactiveState}
      accessibilityLabel={section.label}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={section.androidIcon}
          size={UI_ICON_SIZE_20}
          color={c.primary}
        />
      </View>
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
        {section.label}
      </Text>
    </Pressable>
  )
}

const SETTINGS_ROOT_PATH = '/settings'

const activeState = { selected: true }
const inactiveState = { selected: false }

const useMenuHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3 }: ReturnType<typeof useMenuHooks>) => {
    const c = md3.colors
    const styles = StyleSheet.create({
      container: {
        ...commonStyles.flex1,
        backgroundColor: c.background,
      },
      scrollContent: {
        paddingHorizontal: Space.sm,
        paddingBottom: Space.scrollBottom,
      },
      row: {
        overflow: 'hidden',
        ...commonStyles.row,
        gap: Space.md,
        height: UI_SIZE_56,
        paddingHorizontal: Space.base,
        borderRadius: UI_SIZE_9999,
      },
      rowActive: {
        backgroundColor: c.secondaryContainer,
      },
      iconWrap: {
        ...commonStyles.centered,
        width: UI_SIZE_36,
        height: UI_SIZE_36,
        borderRadius: UI_SIZE_9999,
        backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      },
      rowLabel: {
        ...commonStyles.flex1,
        fontSize: FontSize.subtitle,
        fontFamily: FontFamily.medium,
        color: c.onSurface,
      },
      rowLabelActive: {
        color: c.onSecondaryContainer,
        fontFamily: FontFamily.bold,
      },
    })
    return styles
  },
  useMenuHooks,
)
