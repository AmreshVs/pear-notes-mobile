import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_36,
  UI_SIZE_2,
  UI_SIZE_28,
  UI_SIZE_44,
  UI_SIZE_72,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { useDuplicates } from './useDuplicates'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export function DuplicatesPane() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { rows, checking, failed, checkedCount, dismissPair, openNote } = useDuplicates()

  return (
    <View style={styles.root}>
      <AndroidSettingsAppBar title={t('tools.duplicates')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>{t('settings.descriptions.duplicates')}</Text>

        {rows.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="content-copy"
                size={UI_ICON_SIZE_36}
                color={c.onSurfaceVariant}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {checking
                ? t('duplicates.checking')
                : failed
                  ? t('duplicates.failedTitle')
                  : t('duplicates.emptyTitle')}
            </Text>
            {!checking ? (
              <Text style={styles.emptyDesc}>
                {failed ? t('duplicates.failedDescription') : t('duplicates.emptyDescription')}
              </Text>
            ) : null}
          </View>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.titles}>
                <Text style={styles.noteTitle} onPress={() => openNote(row.a)}>
                  {row.titleA}
                </Text>
                {` ${t('duplicates.and')} `}
                <Text style={styles.noteTitle} onPress={() => openNote(row.b)}>
                  {row.titleB}
                </Text>
              </Text>
              <Text style={styles.meta}>
                {t('duplicates.alike', { percent: row.percent })}
                {row.folderName ? ` · ${row.folderName}` : ''}
              </Text>
              <Pressable
                onPress={() => dismissPair(row.a, row.b)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
              >
                <Text style={styles.dismissLabel}>{t('duplicates.notDuplicates')}</Text>
              </Pressable>
            </View>
          ))
        )}

        {checkedCount > 0 && rows.length > 0 ? (
          <Text style={styles.footer}>{t('duplicates.checked', { count: checkedCount })}</Text>
        ) : null}
      </ScrollView>
    </View>
  )
}

const useDuplicatesHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors

  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
      paddingBottom: Space.lg,
    },
    scrollContent: {
      padding: Space.base,
      gap: Space.md,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.body * 1.4,
      paddingHorizontal: Space.xs,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      gap: UI_SIZE_2,
      padding: Space.base,
      overflow: 'hidden',
    },
    titles: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.body * 1.4,
      color: c.onSurfaceVariant,
    },
    noteTitle: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    dismissBtn: {
      alignSelf: 'flex-start',
      marginTop: Space.md,
      paddingHorizontal: Space.base,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
      ...commonStyles.centered,
    },
    dismissBtnPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.16),
    },
    dismissLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
    footer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      paddingHorizontal: Space.xs,
    },
    empty: {
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: Space.xxl,
    },
    emptyIcon: {
      width: UI_SIZE_72,
      height: UI_SIZE_72,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
}, useDuplicatesHooks)
