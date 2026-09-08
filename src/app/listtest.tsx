import { useCallback, useMemo } from 'react'
import { SectionList, StyleSheet, View } from 'react-native'

import { NoteCard } from '@/components/NoteCard'
import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_SIZE_2,
  UI_SIZE_42,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'

const IMAGES = [
  'http://127.0.0.1:8907/img1.jpg',
  'http://127.0.0.1:8907/img2.jpg',
  'http://127.0.0.1:8907/img3.jpg',
  'http://127.0.0.1:8907/img4.jpg',
  'http://127.0.0.1:8907/img5.jpg',
  'http://127.0.0.1:8907/img6.jpg',
]

const TITLES = [
  'Marriage expenses',
  'Emergency',
  'KMCH REGISTRATION',
  'Thekkady Estimate 2024',
  'Abu Dhabi Khalifa city home budget 2025',
  'Amresh silver watch bill',
  'Malabar Gold Receipt 31/03/23',
  'Kalyan jewel 11/10/25 - Daily use bangle set',
  'UAE wet grinder bill',
  'Notes app issues checklist',
]

const SUMMARIES = [
  'Total - 4,00,000 Jewellery 13/05 - 40,000 Sowmya jewel - 28,000 Naina - 40,000 Paint - 16,000 Balance',
  'Sowmya - 321894 Amresh - 280230',
  'Room - 11,500 Petrol - 6000 Breakfast - 1 - 7 x 250 = 1800 1300 Lunch - 3 - 7 x 400 = 8500 (2800/day',
  'KMCH: 24 HOURS EMERGENCY AND AMBULANCE SERVICES Phone :+91 0422 - 2627999, 4323999, 432310',
  '',
]

function buildSection(title: string, sectionIndex: number, count: number) {
  return {
    title,
    sectionIndex,
    data: Array.from({ length: count }, (_, i) => {
      const withImage = i % 3 === 0
      return {
        key: `${title}-${i}`,
        title: `${TITLES[i % TITLES.length]} ${i + 1}`,
        summary: withImage ? '' : SUMMARIES[i % SUMMARIES.length],
        date: `${(i % 12) + 1}H AGO`,
        imageUrl: withImage ? IMAGES[i % IMAGES.length] : null,
        attachment: withImage ? { kind: 'image', count: 1 } : null,
        folderName: 'SOWMYAMRESH',
        locked: i % 11 === 0,
        pinned: i % 9 === 0,
      }
    }),
  }
}

const MOVE_FOLDERS = [
  { id: 'f1', name: 'Personal' },
  { id: 'f2', name: 'Work' },
  { id: 'f3', name: 'Recipes' },
]

export default function ListTestScreen() {
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const sections = useMemo(
    () => [
      buildSection('PINNED', 0, 6),
      buildSection('TODAY', 1, 30),
      buildSection('YESTERDAY', 2, 30),
      buildSection('LAST 7 DAYS', 3, 30),
      buildSection('OLDER', 4, 30),
    ],
    [],
  )

  const totalCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.data.length, 0),
    [sections],
  )

  const noop = useCallback(() => {}, [])

  const renderItem = useCallback(
    ({ item, index, section }: any) => (
      <NoteCard
        id={item.key}
        title={item.title}
        date={item.date}
        summary={item.summary}
        attachment={item.attachment}
        rawImageUrl={item.imageUrl}
        folderName={item.folderName}
        locked={item.locked}
        pinned={item.pinned}
        grouped
        isFirst={index === 0}
        isLast={index === section.data.length - 1}
        animationIndex={index}
        onPress={noop}
        onDelete={noop}
        onToggleLock={noop}
        onTogglePin={noop}
        moveFolders={MOVE_FOLDERS}
        onMoveTo={noop}
      />
    ),
    [noop],
  )

  const renderSectionHeader = useCallback(
    ({ section }: any) => (
      <View style={section.sectionIndex === 0 ? styles.sectionHeader : styles.sectionHeaderSpaced}>
        <Text style={commonThemedStyles.sectionCap}>{section.title}</Text>
      </View>
    ),
    [styles.sectionHeader, styles.sectionHeaderSpaced, commonThemedStyles.sectionCap],
  )

  const listHeader = useMemo(
    () => (
      <>
        <Text style={styles.pageTitle} numberOfLines={2}>
          All Notes
        </Text>
        <View style={styles.headerInfo}>
          <Text style={commonThemedStyles.sectionCap}>{totalCount} NOTES</Text>
        </View>
      </>
    ),
    [styles.pageTitle, styles.headerInfo, commonThemedStyles.sectionCap, totalCount],
  )

  const noteKey = useCallback((item: any) => item.key, [])

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={noteKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
      />
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
      paddingHorizontal: 0,
      paddingTop: Space.lg,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      marginBottom: Space.xs,
      paddingRight: Space.base,
    },
    headerInfo: {
      marginLeft: Space.base,
      marginBottom: Space.sm,
    },
    sectionHeader: {
      marginLeft: Space.base,
      paddingVertical: Space.xs,
      marginBottom: UI_SIZE_2,
    },
    sectionHeaderSpaced: {
      marginLeft: Space.base,
      paddingVertical: Space.xs,
      marginBottom: UI_SIZE_2,
      marginTop: Space.sm,
    },
  })
  return styles
})
