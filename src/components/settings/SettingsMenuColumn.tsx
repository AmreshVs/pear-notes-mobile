import React, { Fragment, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { router, usePathname } from 'expo-router'

import { Divider } from '@/components/Divider'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_8,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { type SettingsSection, useSettingsSections } from '@/hooks/useSettingsSections'

const SETTINGS_ROOT_PATH = '/settings'

export function SettingsMenuColumn() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const pathname = usePathname()
  const sections = useSettingsSections()

  const handleClose = useCallback(() => {
    router.dismissAll()
    router.back()
  }, [])

  const handleSelect = useCallback(
    (route: string) => {
      if (pathname === SETTINGS_ROOT_PATH) {
        router.push(route as never)
        return
      }
      router.replace(route as never)
    },
    [pathname],
  )

  const renderSection = useCallback(
    (section: SettingsSection, index: number) => (
      <Fragment key={section.key}>
        <SettingsMenuRow
          section={section}
          active={pathname.startsWith(section.route)}
          onSelect={handleSelect}
        />
        {index < sections.length - 1 && (
          <RNView style={styles.dividerWrap}>
            <Divider />
          </RNView>
        )}
      </Fragment>
    ),
    [pathname, handleSelect, sections.length, styles.dividerWrap],
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Pressable
          onPress={handleClose}
          hitSlop={UI_SIZE_8}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          style={closeBtnStyle}
        >
          <Text style={styles.closeLabel}>{t('common.done')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RNView style={commonThemedStyles.card}>{sections.map(renderSection)}</RNView>
      </ScrollView>
    </View>
  )
}

const closeBtnStyle = ({ pressed }: { pressed: boolean }) => [pressed && commonStyles.pressed]

type SettingsMenuRowProps = {
  section: SettingsSection
  active: boolean
  onSelect: (route: string) => void
}

function SettingsMenuRow({ section, active, onSelect }: SettingsMenuRowProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const handlePress = useCallback(() => onSelect(section.route), [onSelect, section.route])

  const rowStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      commonStyles.settingsRow,
      active && styles.rowActive,
      pressed && commonStyles.pressed,
    ],
    [active, styles.rowActive],
  )

  return (
    <Pressable
      onPress={handlePress}
      style={rowStyle}
      accessibilityRole="button"
      accessibilityState={active ? activeState : inactiveState}
      accessibilityLabel={section.label}
    >
      <RNView style={commonStyles.settingsRowLeft}>
        <RNView style={commonThemedStyles.iconBox34}>
          <SymbolIcon name={section.iosIcon} size={UI_SIZE_20} color={colors.primary} />
        </RNView>
        <Text style={styles.rowLabel}>{section.label}</Text>
      </RNView>
      <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_16} color={colors.textMuted} />
    </Pressable>
  )
}

const activeState = { selected: true }
const inactiveState = { selected: false }

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    header: {
      ...commonStyles.rowBetween,
      backgroundColor: theme.colors.backgroundElevated,
      paddingHorizontal: Space.base,
      paddingTop: Space.lg,
      paddingBottom: Space.base,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
    },
    closeLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    scrollContent: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    dividerWrap: {
      marginHorizontal: 18,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowActive: {
      backgroundColor: theme.colors.cardSelected,
    },
  })
  return styles
})
