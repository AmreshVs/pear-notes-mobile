import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { groupTransfersByNote } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { SealWaitingItem } from '@/components/backup/SealWaitingSection'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_18,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  outlineVariant?: string
}

type AndroidSealWaitingSectionProps = {
  files: SealWaitingItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
}

export function AndroidSealWaitingSection({
  files,
  noteTitles,
  formatBytes,
}: AndroidSealWaitingSectionProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  const renderItem = (file: SealWaitingItem, index: number) => (
    <View key={file.link} style={[styles.row, index > 0 && styles.rowBorder]}>
      <View style={styles.rowMeta}>
        <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_18} color={c.onSurfaceVariant} />
        <Text style={styles.fileName} numberOfLines={1}>
          {file.fileName || t('storage.attachment')}
        </Text>
      </View>
      <Text style={styles.sizeLabel}>{formatBytes(file.size)}</Text>
    </View>
  )

  const renderGroup = (group: { noteKey: string; title: string; items: SealWaitingItem[] }) => (
    <View key={group.noteKey} style={styles.card}>
      <Text style={styles.groupTitle} numberOfLines={1}>
        {group.title || t('noteCard.untitled')}
      </Text>
      {group.items.map(renderItem)}
    </View>
  )

  if (!files.length) return null

  const groups = groupTransfersByNote(files, noteTitles, t('noteCard.untitled'))

  return (
    <MotionView entering={FadeInDown.duration(Durations.slide)} style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('storage.waitingToEncrypt')} ({files.length})
      </Text>
      <Text style={styles.sectionDesc}>{t('storage.waitingToEncryptDesc')}</Text>
      <View style={styles.groupList}>{groups.map(renderGroup)}</View>
    </MotionView>
  )
}

const useSealWaitingHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      marginBottom: UI_SIZE_24,
    },
    sectionTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      letterSpacing: 0.5,
    },
    sectionDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
    },
    groupList: {
      gap: UI_SIZE_12,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
    },
    row: {
      ...commonStyles.rowBetween,
      alignItems: 'center',
      padding: Space.base,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.outlineVariant ?? c.onSurface,
    },
    rowMeta: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: UI_SIZE_8,
      flex: 1,
      marginRight: UI_SIZE_8,
    },
    fileName: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
      flexShrink: 1,
    },
    sizeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useSealWaitingHooks)
