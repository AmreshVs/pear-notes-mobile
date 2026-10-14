import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, SectionList, StyleSheet, View as RNView } from 'react-native'
import { Stack } from 'expo-router'

import { Divider } from '@/components/Divider'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { createThemedStylesheet, Text, View } from '@/components/Themed'
import { UpcomingBirthdayRow } from '@/components/upcoming/UpcomingBirthdayRow'
import { commonStyles, FontSize, FontWeight, Radii, Space } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { type UpcomingTask, upcomingTaskKey, useUpcomingTasks } from '@/hooks/useUpcomingTasks'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { type BirthdayMonth, birthdaysByMonth } from '@/utils/upcomingFormat'

export function BirthdaysPane() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { openNote } = useNoteEditor()
  const { yearly, loaded, refreshing, refresh } = useUpcomingTasks()
  const months = useMemo(() => birthdaysByMonth(yearly, i18n.language), [yearly, i18n.language])

  const handleOpenTask = useCallback((task: UpcomingTask) => openNote(task.noteKey), [openNote])

  const screenOptions = useMemo(() => ({ title: t('upcoming.birthdayList.title') }), [t])

  const renderItem = useCallback(
    ({ item, index, section }: { item: UpcomingTask; index: number; section: BirthdayMonth }) => (
      <View
        style={[
          styles.cardRow,
          index === 0 && styles.cardTop,
          index === section.data.length - 1 && styles.cardBottom,
        ]}
      >
        {index > 0 && (
          <RNView style={styles.divider}>
            <Divider />
          </RNView>
        )}
        <UpcomingBirthdayRow task={item} language={i18n.language} onOpen={handleOpenTask} />
      </View>
    ),
    [
      i18n.language,
      handleOpenTask,
      styles.cardRow,
      styles.cardTop,
      styles.cardBottom,
      styles.divider,
    ],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: BirthdayMonth }) => (
      <View style={styles.sectionHeader}>
        <Text style={commonThemedStyles.sectionCamelCase}>{section.title}</Text>
        <Text style={styles.sectionNote}>{section.data.length}</Text>
      </View>
    ),
    [commonThemedStyles.sectionCamelCase, styles.sectionHeader, styles.sectionNote],
  )

  const listHeader = useMemo(
    () =>
      yearly.length > 0 ? (
        <Text style={styles.status}>
          {t('upcoming.birthdayList.subtitle', { count: yearly.length })}
        </Text>
      ) : null,
    [yearly.length, t, styles.status],
  )

  const listEmpty = useMemo(
    () =>
      loaded ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('upcoming.birthdayList.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('upcoming.birthdayList.emptyBody')}</Text>
        </View>
      ) : null,
    [loaded, t, styles.empty, styles.emptyTitle, styles.emptyBody],
  )

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={refresh} />,
    [refreshing, refresh],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <SectionList
        sections={months}
        keyExtractor={upcomingTaskKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={refreshControl}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
      <ScreenEdgeFades />
    </View>
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
      paddingBottom: Space.scrollBottom,
    },
    status: {
      marginHorizontal: Space.base,
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    sectionHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'baseline',
      marginHorizontal: Space.base,
      marginTop: Space.lg,
    },
    sectionNote: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    cardRow: {
      marginHorizontal: Space.base,
      backgroundColor: theme.colors.cardSurface,
    },
    cardTop: {
      borderTopLeftRadius: Radii.card,
      borderTopRightRadius: Radii.card,
      borderCurve: 'continuous',
    },
    cardBottom: {
      borderBottomLeftRadius: Radii.card,
      borderBottomRightRadius: Radii.card,
      borderCurve: 'continuous',
    },
    divider: {
      marginLeft: Space.base,
    },
    empty: {
      alignItems: 'center',
      paddingHorizontal: Space.xxxl,
      paddingTop: Space.huge,
      gap: Space.sm,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  })
  return styles
})
