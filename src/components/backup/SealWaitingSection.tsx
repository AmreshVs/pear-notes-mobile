import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'

import { groupTransfersByNote } from '@pear-notes/core/utils.js'

import { Divider } from '@/components/Divider'
import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  TRANSFER_LIST_MAX_HEIGHT,
  UI_ICON_SIZE_16,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

export type SealWaitingItem = {
  noteKey: string
  link: string
  fileName: string
  size: number
}

type SealWaitingSectionProps = {
  files: SealWaitingItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
}

export function SealWaitingSection({ files, noteTitles, formatBytes }: SealWaitingSectionProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const renderItem = (file: SealWaitingItem, index: number) => (
    <Fragment key={file.link}>
      {index > 0 && (
        <RNView style={styles.dividerWrap}>
          <Divider />
        </RNView>
      )}
      <RNView style={styles.row}>
        <RNView style={styles.rowMeta}>
          <SymbolIcon name="lock" size={UI_ICON_SIZE_16} color={colors.textMuted} weight="medium" />
          <Text style={styles.fileName} numberOfLines={1}>
            {file.fileName || t('storage.attachment')}
          </Text>
        </RNView>
        <Text style={styles.sizeLabel}>{formatBytes(file.size)}</Text>
      </RNView>
    </Fragment>
  )

  const renderGroup = (group: { noteKey: string; title: string; items: SealWaitingItem[] }) => (
    <RNView key={group.noteKey} style={commonThemedStyles.card}>
      <Text style={styles.groupTitle} numberOfLines={1}>
        {group.title || t('noteCard.untitled')}
      </Text>
      {group.items.map(renderItem)}
    </RNView>
  )

  if (!files.length) return null

  const groups = groupTransfersByNote(files, noteTitles, t('noteCard.untitled'))

  return (
    <MotionView entering={FadeInDown.duration(Durations.slide)} style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>
        {t('storage.waitingToEncrypt')} ({files.length})
      </Text>
      <Text style={styles.sectionDesc}>{t('storage.waitingToEncryptDesc')}</Text>
      <ScrollView
        style={styles.groupScroll}
        contentContainerStyle={styles.groupList}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {groups.map(renderGroup)}
      </ScrollView>
    </MotionView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginBottom: Space.lg,
    },
    sectionDesc: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      paddingHorizontal: Space.lg,
      marginBottom: Space.sm,
    },
    groupScroll: {
      maxHeight: TRANSFER_LIST_MAX_HEIGHT,
    },
    groupList: {
      gap: Space.md,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
    },
    row: {
      ...commonStyles.rowBetween,
      alignItems: 'center',
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
    },
    dividerWrap: {
      marginHorizontal: Space.lg,
    },
    rowMeta: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: Space.sm,
      flex: 1,
      marginRight: Space.sm,
    },
    fileName: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
      flexShrink: 1,
    },
    sizeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
