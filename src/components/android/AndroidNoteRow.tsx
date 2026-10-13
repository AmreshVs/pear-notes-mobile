import { type ComponentProps, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { FadeIn } from 'react-native-reanimated'
import { useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { parseHighlight } from '@pear-notes/core/store/slices/searchSlice.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { HighlightedText } from '@/components/HighlightedText'
import { MotionView } from '@/components/MotionView'
import { type MatchReason, MatchReasonBadge } from '@/components/search/MatchReasonBadge'
import { createThemedStylesheetWithHooks, Text, useFontScale } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  ListMotion,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_MATERIAL, FOLDER_ICON_MATERIAL } from '@/constants/folderIcons'
import { NOTE_ACTION } from '@/constants/noteActions'
import { useAndroidColorTheme } from '@/hooks/useAndroidColorTheme'
import type { NoteSearchHit } from '@/hooks/useNoteSearch'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import { useCachedImageThumbnail } from '@/lib/useCachedImageThumbnail'
import { useCachedPdfThumbnail } from '@/lib/useCachedPdfThumbnail'
import {
  isAccessibilityTextSize,
  MAX_FONT_SCALE_CHROME,
  scaledLineCount,
} from '@/utils/dynamicType'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'
import { getNoteMetadata, isSameNoteRow } from '@/utils/noteMetadata'
import { formatTimeOfDay } from '@/utils/noteSections'
import { type AttachmentKind } from '@/utils/noteUtils'

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ATTACHMENT_ICONS: Record<AttachmentKind, MaterialIconName> = {
  image: 'image-outline',
  video: 'video-outline',
  audio: 'microphone-outline',
  file: 'paperclip',
  mixed: 'paperclip',
}

type NoteRowProps = {
  note: any
  index: number
  isLast: boolean
  folderName?: string
  folderIconToken?: string
  sectionTitle?: string
  selecting?: boolean
  checked?: boolean
  searchHit?: NoteSearchHit | null
  meaningSnippet?: string | null
  matchReason?: MatchReason | null
  titleHighlight?: string
  onPress: (noteKey: string) => void
  onLongPress: (noteKey: string) => void
}

function areNoteRowPropsEqual(prev: NoteRowProps, next: NoteRowProps) {
  return (
    prev.note.key === next.note.key &&
    isSameNoteRow(prev.note.value, next.note.value) &&
    prev.folderName === next.folderName &&
    prev.folderIconToken === next.folderIconToken &&
    prev.sectionTitle === next.sectionTitle &&
    prev.selecting === next.selecting &&
    prev.checked === next.checked &&
    prev.searchHit === next.searchHit &&
    prev.meaningSnippet === next.meaningSnippet &&
    prev.matchReason === next.matchReason &&
    prev.titleHighlight === next.titleHighlight &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress
  )
}

export const AndroidNoteRow = memo(function AndroidNoteRow({
  note,
  index,
  folderName,
  folderIconToken,
  sectionTitle,
  selecting,
  checked,
  searchHit,
  meaningSnippet,
  matchReason,
  titleHighlight,
  onPress,
  onLongPress,
}: NoteRowProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  const isUnlocked = useIsNoteUnlocked(note.key)
  const uploadQueue = useNoteUploadQueue(note.key)
  const upload = uploadQueue.activeItem
  const locked = note.value?.locked === true
  const pinned = note.value?.pinned === true
  const masked = locked && !isUnlocked

  const title = note.value?.title || t('noteCard.untitled')
  const metadata = getNoteMetadata(note.value)
  const previewText = masked
    ? t('noteCard.lockedSummary')
    : meaningSnippet || metadata.preview
  const attachment = masked ? null : metadata.attachment
  const searchSnippet = !masked && !meaningSnippet && searchHit?.snippet ? searchHit : null
  const titleRanges = useMemo(() => parseHighlight(titleHighlight), [titleHighlight])
  const showAttachment = !searchSnippet && !previewText && !!attachment
  const displayPreview = previewText || t('noteCard.noAdditionalText')
  const rawImageUrl = metadata.imageUrl
  const hasChecklist = !masked && !meaningSnippet && !searchSnippet && metadata.isChecklist
  const previewContent = searchSnippet ? (
    <HighlightedText
      text={searchSnippet.snippet}
      ranges={searchSnippet.ranges}
      highlightStyle={styles.searchMatch}
    />
  ) : (
    displayPreview
  )
  const timestamp = note.value?.updatedAt || note.value?.createdAt
  const relativeLabel = formatDate(timestamp) || ''
  const dateLabel =
    sectionTitle && relativeLabel && relativeLabel.toLowerCase() === sectionTitle.toLowerCase()
      ? formatTimeOfDay(timestamp)
      : relativeLabel
  const accessibilityLabel = useMemo(() => {
    const parts = [title]
    if (pinned) parts.push(t('noteCard.a11y.pinned'))
    if (locked) parts.push(t('noteCard.a11y.locked'))
    parts.push(dateLabel)
    return parts.join(', ')
  }, [title, pinned, locked, dateLabel, t])

  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  const resolvedImageUrl = useMemo(
    () => resolveHyperdriveUrl(rawImageUrl, hyperdriveServerAddress),
    [rawImageUrl, hyperdriveServerAddress],
  )
  const isPearTheme = useAndroidColorTheme() === 'pear'
  const [thumbError, setThumbError] = useState(false)
  const fontScale = useFontScale()

  useEffect(() => {
    setThumbError(false)
  }, [resolvedImageUrl])

  const titleLines = scaledLineCount(1, fontScale)
  const previewLines = scaledLineCount(1, fontScale)

  const canShowThumb = !masked && !isAccessibilityTextSize(fontScale)
  const showThumb = !!resolvedImageUrl && !thumbError && canShowThumb
  // Prefer our own downscaled copy; the original is only ever a fallback, and never disk-cached.
  const imageThumbUri = useCachedImageThumbnail(resolvedImageUrl, showThumb)
  // A PDF only fills the slot when there is no image to show there.
  const pdfThumbUri = useCachedPdfThumbnail(
    metadata.pdf,
    canShowThumb && (!resolvedImageUrl || thumbError),
  )

  const entering = useMemo(
    () =>
      index <= ListMotion.enterMaxIndex
        ? FadeIn.duration(ListMotion.enterDuration).delay(index * ListMotion.enterStagger)
        : undefined,
    [index],
  )

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const handleThumbError = useCallback(() => setThumbError(true), [])
  const handlePress = useCallback(() => onPress(note.key), [onPress, note.key])
  const handleLongPress = useCallback(() => onLongPress(note.key), [onLongPress, note.key])
  const accessibilityActions = useMemo(
    () => [{ name: NOTE_ACTION.options, label: t('noteCard.actions.options') }],
    [t],
  )

  return (
    <MotionView entering={entering}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleLongPress}
        accessibilityState={selecting ? { selected: checked } : undefined}
        style={[styles.row, selecting && checked && styles.rowChecked]}
      >
        {selecting && (
          <MaterialCommunityIcons
            name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={UI_ICON_SIZE_24}
            color={checked ? c.primary : c.outline}
            style={styles.selectionIcon}
          />
        )}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={titleLines}>
              {note.value?.title && titleRanges.length ? (
                <HighlightedText
                  text={note.value.title}
                  ranges={titleRanges}
                  highlightStyle={styles.searchMatch}
                />
              ) : (
                title
              )}{' '}
              {pinned && (
                <MaterialCommunityIcons
                  name="pin"
                  size={UI_ICON_SIZE_14}
                  color={c.primary}
                  style={styles.lockIcon}
                />
              )}
              {locked && (
                <MaterialCommunityIcons
                  name={masked ? 'lock' : 'lock-open-variant'}
                  size={UI_ICON_SIZE_14}
                  color={c.primary}
                  style={styles.lockIcon}
                />
              )}
            </Text>
          </View>

          {showAttachment && attachment ? (
            <View style={styles.checklistRow}>
              <MaterialCommunityIcons
                name={ATTACHMENT_ICONS[attachment.kind]}
                size={UI_ICON_SIZE_14}
                color={c.onSurfaceVariant}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.preview, styles.rowPreview]} numberOfLines={previewLines}>
                {t(`noteCard.attachment.${attachment.kind}`, { count: attachment.count })}
              </Text>
            </View>
          ) : hasChecklist && displayPreview ? (
            <View style={styles.checklistRow}>
              <MaterialCommunityIcons
                name="checkbox-blank-outline"
                size={UI_ICON_SIZE_14}
                color={c.onSurfaceVariant}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.preview, styles.rowPreview]} numberOfLines={previewLines}>
                {previewContent}
              </Text>
            </View>
          ) : (
            <Text style={styles.preview} numberOfLines={previewLines}>
              {previewContent}
            </Text>
          )}

          {matchReason && <MatchReasonBadge reason={matchReason} />}

          {upload && (
            <View style={styles.uploadRow}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={styles.uploadLabel} numberOfLines={1}>
                {t('noteCard.uploading', { progress: upload.progress })}
              </Text>
            </View>
          )}

          <View style={styles.meta}>
            {folderName && (
              <>
                <MaterialCommunityIcons
                  name={
                    (FOLDER_ICON_MATERIAL[folderIconToken ?? ''] ??
                      FALLBACK_FOLDER_MATERIAL) as never
                  }
                  size={UI_ICON_SIZE_14}
                  color={c.onSurfaceVariant}
                  style={styles.folderIcon}
                />
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME}
                  style={[styles.metaTag, isPearTheme && styles.metaTagPear]}
                >
                  {folderName}
                </Text>
              </>
            )}
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME} style={styles.metaDate}>
              {dateLabel}
            </Text>
          </View>
        </View>

        {showThumb && (
          <Image
            source={imageThumbUri || resolvedImageUrl}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory"
            recyclingKey={note.key}
            transition={0}
            onError={handleThumbError}
          />
        )}

        {!showThumb && !!pdfThumbUri && (
          <Image
            source={pdfThumbUri}
            style={styles.thumbnail}
            contentFit="cover"
            contentPosition="top"
            cachePolicy="memory"
            recyclingKey={note.key}
            transition={0}
          />
        )}
      </Pressable>
    </MotionView>
  )
}, areNoteRowPropsEqual)

const useRowHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    row: {
      overflow: 'hidden',
      borderRadius: Radii.xl,
      padding: UI_SIZE_16,
      marginBottom: UI_SIZE_12,
      ...commonStyles.row,
      gap: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    rowChecked: {
      backgroundColor: hexWithAlpha(c.primary, 0.16),
    },
    selectionIcon: {
      alignSelf: 'center',
    },
    rowPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.6),
    },
    content: {
      ...commonStyles.flex1,
      paddingRight: UI_SIZE_8,
    },
    titleRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
      marginBottom: UI_SIZE_4,
    },
    lockIcon: {
      marginTop: 1,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    preview: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      marginBottom: UI_SIZE_4,
      lineHeight: UI_SIZE_20,
      color: c.onSurfaceVariant,
    },
    searchMatch: {
      color: c.onPrimaryContainer,
      backgroundColor: c.primaryContainer,
    },
    checklistRow: {
      ...commonStyles.row,
      marginBottom: UI_SIZE_10,
    },
    rowPreview: {
      flexShrink: 1,
      marginBottom: 0,
    },
    folderIcon: {
      marginRight: Space.xs,
    },
    checkboxIcon: {
      marginRight: UI_SIZE_6,
    },
    uploadRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
      marginBottom: UI_SIZE_4,
    },
    uploadLabel: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    meta: {
      ...commonStyles.row,
    },
    metaDate: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 0.5,
      color: c.onSurfaceVariant,
      opacity: 0.6,
      marginLeft: UI_SIZE_8,
    },
    metaDot: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    metaTag: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 0.5,
      color: c.onSurfaceVariant,
    },
    metaTagPear: {
      color: c.onSurfaceVariant,
    },
    thumbnail: {
      width: UI_SIZE_60,
      height: UI_SIZE_60,
      borderRadius: UI_SIZE_14,
    },
  })
  return styles
}, useRowHooks)
