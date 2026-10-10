import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { Stack } from 'expo-router'

import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_42,
  UI_SIZE_64,
} from '@/constants/commonStyles'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'

import { useDuplicates } from './useDuplicates'

export function DuplicatesPane() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const { rows, checking, failed, checkedCount, dismissPair, openNote } = useDuplicates()

  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const headerTitle = useCallback(() => <CollapsedNavTitle title={t('tools.duplicates')} />, [t])

  const screenOptions = useMemo(
    () => ({
      headerTitle: isTitleCollapsed ? headerTitle : '',
      headerLargeTitle: false,
      headerTransparent: true,
      scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
    }),
    [isTitleCollapsed, headerTitle],
  )

  return (
    <RNView style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        {...scrollProps}
        showsVerticalScrollIndicator={false}
      >
        <RNView onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {t('tools.duplicates')}
          </Text>
        </RNView>
        <RNView style={styles.screen}>
          <Text style={styles.description}>{t('settings.descriptions.duplicates')}</Text>

          {rows.length === 0 ? (
            <RNView style={styles.empty}>
              <RNView style={styles.emptyIcon}>
                <SymbolIcon name="doc.on.doc" size={UI_ICON_SIZE_20} color={colors.textMuted} />
              </RNView>
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
            </RNView>
          ) : (
            <RNView style={styles.list}>
              {rows.map((row) => (
                <RNView key={row.id} style={styles.card}>
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
                    style={({ pressed }) => [styles.dismissBtn, pressed && commonStyles.pressed]}
                  >
                    <Text style={styles.dismissLabel}>{t('duplicates.notDuplicates')}</Text>
                  </Pressable>
                </RNView>
              ))}
            </RNView>
          )}

          {checkedCount > 0 && rows.length > 0 ? (
            <Text style={styles.footer}>{t('duplicates.checked', { count: checkedCount })}</Text>
          ) : null}
        </RNView>
      </ScrollView>
      <ScreenEdgeFades />
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Space.sm,
      paddingBottom: Space.scrollBottom,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      paddingRight: Space.base,
      marginBottom: Space.sm,
    },
    screen: {
      paddingHorizontal: Space.base,
      gap: Space.lg,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: FontSize.body * 1.4,
    },
    list: {
      gap: Space.sm,
    },
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: Radii.card,
      borderColor: theme.colors.borderSecondary,
      gap: UI_SIZE_2,
      padding: Space.lg,
      overflow: 'hidden',
    },
    titles: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.body * 1.4,
      color: theme.colors.textMuted,
    },
    noteTitle: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    dismissBtn: {
      alignSelf: 'flex-start',
      marginTop: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    dismissLabel: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.caption,
      color: theme.colors.primary,
    },
    footer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginHorizontal: Space.sm,
    },
    empty: {
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: Space.xxl,
    },
    emptyIcon: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.controlBackground,
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
})
