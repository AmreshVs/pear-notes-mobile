import { type ComponentProps, memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Folder } from 'lucide-react-native'

import { getColorTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_13,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { isNoteUnlocked, useNoteLockVersion } from '@/lib/noteLock'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import {
  type AttachmentKind,
  getAttachmentInfo,
  getFirstImageUrl,
  getPreview,
  isChecklistNote,
} from '@/utils/noteUtils'

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
  onPress: (noteKey: string) => void
  onLongPress: (noteKey: string) => void
}

export const AndroidNoteRow = memo(function AndroidNoteRow({
  note,
  index,
  folderName,
  onPress,
  onLongPress,
}: NoteRowProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  useNoteLockVersion()
  const uploadQueue = useNoteUploadQueue(note.key)
  const upload = uploadQueue.activeItem
  const locked = note.value?.locked === true
  const pinned = note.value?.pinned === true
  const masked = locked && !isNoteUnlocked(note.key)

  const title = note.value?.title || t('noteCard.untitled')
  const html = note.value?.note || ''
  const previewText = masked ? t('noteCard.lockedSummary') : getPreview(html)
  const attachment = masked ? null : getAttachmentInfo(html)
  const showAttachment = !previewText && !!attachment
  const displayPreview = previewText || t('noteCard.noAdditionalText')
  const rawImageUrl = getFirstImageUrl(html)
  const hasChecklist = !masked && isChecklistNote(html)
  const dateLabel = (formatDate(note.value?.updatedAt || note.value?.createdAt) || '').toUpperCase()
  const accessibilityLabel = useMemo(() => {
    const parts = [title]
    if (pinned) parts.push(t('noteCard.a11y.pinned'))
    if (locked) parts.push(t('noteCard.a11y.locked'))
    parts.push(dateLabel)
    return parts.join(', ')
  }, [title, pinned, locked, dateLabel, t])

  const resolvedImageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const colorTheme = useSelector(getColorTheme)
  const isPearTheme = colorTheme === 'pear'
  const [thumbError, setThumbError] = useState(false)
  const showThumb = !!resolvedImageUrl && !thumbError && !masked

  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = useCallback(() => onPress(note.key), [onPress, note.key])
  const handleLongPress = useCallback(() => onLongPress(note.key), [onLongPress, note.key])
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.985, { duration: 120, easing: Easing.out(Easing.cubic) })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
  }, [scale])

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(Math.min(index, 10) * 30).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.titleRow}>
            {pinned && (
              <MaterialCommunityIcons
                name="pin"
                size={UI_ICON_SIZE_13}
                color={c.primary}
                style={styles.lockIcon}
              />
            )}
            {locked && (
              <MaterialCommunityIcons
                name={masked ? 'lock-outline' : 'lock-open-variant-outline'}
                size={UI_ICON_SIZE_13}
                color={c.primary}
                style={styles.lockIcon}
              />
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {showAttachment && attachment ? (
            <View style={styles.checklistRow}>
              <MaterialCommunityIcons
                name={ATTACHMENT_ICONS[attachment.kind]}
                size={UI_ICON_SIZE_13}
                color={c.onSurfaceVariant}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.preview, styles.rowPreview]} numberOfLines={1}>
                {t(`noteCard.attachment.${attachment.kind}`, { count: attachment.count })}
              </Text>
            </View>
          ) : hasChecklist && displayPreview ? (
            <View style={styles.checklistRow}>
              <MaterialCommunityIcons
                name="checkbox-blank-outline"
                size={UI_ICON_SIZE_13}
                color={c.onSurfaceVariant}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.preview, styles.rowPreview]} numberOfLines={1}>
                {displayPreview}
              </Text>
            </View>
          ) : (
            <Text style={styles.preview} numberOfLines={1}>
              {displayPreview}
            </Text>
          )}

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
                <Folder size={UI_ICON_SIZE_12} style={styles.folderIcon} />
                <Text style={[styles.metaTag, isPearTheme && styles.metaTagPear]}>
                  {folderName.toUpperCase()}
                </Text>
              </>
            )}
            <Text style={styles.metaDate}>{dateLabel}</Text>
          </View>
        </View>

        {showThumb && (
          <Image
            source={{ uri: resolvedImageUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setThumbError(true)}
          />
        )}
      </Pressable>
    </Animated.View>
  )
})

const useRowHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    row: {
      borderRadius: UI_SIZE_24,
      padding: UI_SIZE_20,
      marginBottom: UI_SIZE_12,
      ...commonStyles.row,
      gap: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    rowPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.6),
    },
    content: {
      ...commonStyles.flex1,
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
    checklistRow: {
      ...commonStyles.row,
      marginBottom: UI_SIZE_10,
    },
    rowPreview: {
      marginBottom: 0,
    },
    folderIcon: {
      marginRight: Space.xs,
      color: theme.colors.textSecondary,
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
      fontSize: FontSize.caption,
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
      fontSize: FontSize.caption,
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
