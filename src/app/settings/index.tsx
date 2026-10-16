import { Fragment, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Pressable, ScrollView, StyleSheet, View as RNView, View } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, Stack, usePathname } from 'expo-router'

import { Divider } from '@/components/Divider'
import { MotionView } from '@/components/MotionView'
import { VaultSettingsCard } from '@/components/settings/VaultSettingsCard'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { FAQ_URL } from '@/constants/constants'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'
import { type SettingsSection, useSettingsSectionGroups } from '@/hooks/useSettingsSections'
import { getAppVersionLabel } from '@/lib/appVersion'

const SETTINGS_ROOT_PATH = '/settings'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const isLargeScreen = useIsLargeScreen()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLargeScreen || pathname !== SETTINGS_ROOT_PATH) return
    router.push('/settings/general' as never)
  }, [isLargeScreen, pathname])
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const handleClose = useCallback(() => {
    router.back()
  }, [])

  const sectionGroups = useSettingsSectionGroups()

  const renderGroup = useCallback(
    (group: SettingsSection[]) => (
      <RNView key={group[0].group} style={commonThemedStyles.card}>
        {group.map(({ key, iosIcon, label, route }, i) => (
          <Fragment key={key}>
            <Pressable
              onPress={() => router.push(route as never)}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <RNView style={commonStyles.settingsRowLeft}>
                <RNView style={commonThemedStyles.iconBox34}>
                  <SymbolIcon name={iosIcon} size={UI_SIZE_20} color={colors.primary} />
                </RNView>
                <Text style={styles.rowLabel}>{label}</Text>
              </RNView>
              <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_16} color={colors.textMuted} />
            </Pressable>
            {i < group.length - 1 && (
              <RNView style={styles.dividerWrap}>
                <Divider />
              </RNView>
            )}
          </Fragment>
        ))}
      </RNView>
    ),
    [colors.primary, colors.textMuted, commonThemedStyles, styles.dividerWrap, styles.rowLabel],
  )

  return (
    <RNView style={commonThemedStyles.modalContainer}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerRight: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
              style={({ pressed }) => [styles.closeBtn, pressed && commonStyles.pressed]}
            >
              <Text style={styles.closeLabel}>{t('common.done')}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scroll}>
          <MotionView
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.groups}
          >
            <VaultSettingsCard />
            {sectionGroups.map(renderGroup)}
          </MotionView>
        </View>
        <RNView style={styles.footerContainer}>
          <Text style={styles.version}>{getAppVersionLabel()}</Text>
          <Pressable
            onPress={() => Linking.openURL(FAQ_URL).catch(() => {})}
            hitSlop={UI_SIZE_8}
            accessibilityRole="link"
            style={({ pressed }) => [styles.faqLink, pressed && commonStyles.pressed]}
          >
            <Text style={styles.faqLabel}>{t('settings.helpAndFaq')}</Text>
          </Pressable>
        </RNView>
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    footerContainer: {
      marginTop: UI_SIZE_20,
      marginBottom: insets.bottom + UI_SIZE_12,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
    },
    groups: {
      gap: UI_SIZE_20,
    },
    dividerWrap: {
      marginHorizontal: 18,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    version: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    faqLink: {
      alignSelf: 'center',
      marginTop: UI_SIZE_12,
    },
    faqLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
    closeBtn: {
      ...commonStyles.centered,
      minWidth: UI_SIZE_44,
      minHeight: UI_SIZE_44,
      paddingHorizontal: Space.sm,
    },
    closeLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
  })

  return styles
}, useSafeAreaInsets)
