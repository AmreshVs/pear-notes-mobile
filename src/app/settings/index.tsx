import Constants from 'expo-constants'
import { router, Stack } from 'expo-router'
import {
  ChevronRight,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View as RNView, StyleSheet, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_17,
  UI_SIZE_12,
  UI_SIZE_15,
  UI_SIZE_20,
  UI_SIZE_30,
  UI_SIZE_40,
  UI_SIZE_60,
  UI_SIZE_8,
  UI_STROKE_WIDTH_1_8,
  UI_STROKE_WIDTH_2_5,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const handleClose = useCallback(() => {
    router.back()
  }, [])

  const sections = useMemo(
    () => [
      {
        key: 'general',
        Icon: SlidersHorizontal,
        label: t('layouts.general'),
        onPress: () => router.push('/settings/general' as any),
      },
      {
        key: 'privacy',
        Icon: ShieldCheck,
        label: t('settings.privacy.rowTitle'),
        onPress: () => router.push('/settings/privacy' as any),
      },
      {
        key: 'sync',
        Icon: RefreshCw,
        label: t('settings.sync.linkAndSync'),
        onPress: () => router.push('/settings/sync'),
      },
      {
        key: 'backup',
        Icon: Download,
        label: t('settings.backup.backupAndRestore'),
        onPress: () => router.push('/settings/backup' as any),
      },
      {
        key: 'storage',
        Icon: Database,
        label: t('settings.storage.storageTitle'),
        onPress: () => router.push('/settings/storage' as any),
      },
    ],
    [t],
  )

  return (
    <RNView style={commonThemedStyles.screenContainer}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerRight: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && commonStyles.pressed]}
            >
              <X size={UI_ICON_SIZE_16} color={colors.text} strokeWidth={UI_STROKE_WIDTH_2_5} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.scroll}>
        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            {sections.map(({ key, Icon, label, onPress }, i) => (
              <Pressable
                key={key}
                onPress={onPress}
                style={({ pressed }) => [
                  i < sections.length - 1 ? styles.rowUnderline : commonStyles.settingsRow,
                  pressed && commonStyles.pressed,
                ]}
              >
                <RNView style={commonStyles.settingsRowLeft}>
                  <RNView style={commonThemedStyles.iconBox34}>
                    <Icon
                      size={UI_ICON_SIZE_17}
                      color={colors.primary}
                      strokeWidth={UI_STROKE_WIDTH_1_8}
                    />
                  </RNView>
                  <Text style={styles.rowLabel}>{label}</Text>
                </RNView>
                <ChevronRight size={UI_ICON_SIZE_16} color={colors.textMuted} />
              </Pressable>
            ))}
          </RNView>
        </Animated.View>
      </View>
      <View style={commonStyles.flex1} />
      <Animated.View
        style={styles.footerContainer}
        entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}
      >
        <Text style={styles.footer}>{t('settings.footer')}</Text>
        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Animated.View>
    </RNView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    footerContainer: {
      marginBottom: insets.bottom + UI_SIZE_12,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: UI_SIZE_12,
    },
    rowUnderline: {
      ...commonStyles.settingsRow,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_40,
      fontStyle: 'italic',
      color: theme.colors.textMuted,
    },
    version: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_8,
      color: theme.colors.textMuted,
    },
    closeBtn: {
      ...commonStyles.centered,
      width: UI_SIZE_30,
      height: UI_SIZE_30,
      borderRadius: UI_SIZE_15,
    },
  })

  return styles
}, useSafeAreaInsets)
