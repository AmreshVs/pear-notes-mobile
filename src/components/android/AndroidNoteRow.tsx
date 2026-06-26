import { getColorTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontWeight,
  UI_FONT_SIZE_10,
  UI_FONT_SIZE_14,
  UI_FONT_SIZE_17,
  UI_ICON_SIZE_13,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getFirstImageUrl, getPreview, isChecklistNote } from '@/utils/noteUtils'

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

  const title = note.value?.title || t('noteCard.untitled')
  const html = note.value?.note || ''
  const preview = getPreview(html, t('noteCard.noAdditionalText'))
  const rawImageUrl = getFirstImageUrl(html)
  const hasChecklist = isChecklistNote(html)
  const dateLabel = (formatDate(note.value?.updatedAt || note.value?.createdAt) || '').toUpperCase()

  const resolvedImageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const colorTheme = useSelector(getColorTheme)
  const isPearTheme = colorTheme === 'pear'
  const [thumbError, setThumbError] = useState(false)
  const showThumb = !!resolvedImageUrl && !thumbError

  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = useCallback(() => onPress(note.key), [onPress, note.key])
  const handleLongPress = useCallback(() => onLongPress(note.key), [onLongPress, note.key])
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 400 })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 300 })
  }, [scale])

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(Math.min(index, 10) * 30)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {hasChecklist && preview ? (
            <View style={styles.checklistRow}>
              <MaterialCommunityIcons
                name="checkbox-blank-outline"
                size={UI_ICON_SIZE_13}
                color={c.onSurfaceVariant}
                style={styles.checkboxIcon}
              />
              <Text style={styles.preview} numberOfLines={1}>
                {preview}
              </Text>
            </View>
          ) : (
            <Text style={styles.preview} numberOfLines={1}>
              {preview}
            </Text>
          )}

          <View style={styles.meta}>
            <Text style={styles.metaDate}>{dateLabel}</Text>
            {folderName && (
              <>
                <Text style={styles.metaDot}>{'  •  '}</Text>
                <Text style={[styles.metaTag, isPearTheme && styles.metaTagPear]}>
                  {folderName.toUpperCase()}
                </Text>
              </>
            )}
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
    title: {
      fontSize: UI_FONT_SIZE_17,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginBottom: UI_SIZE_4,
      letterSpacing: -0.2,
      color: c.onSurface,
    },
    preview: {
      fontSize: UI_FONT_SIZE_14,
      fontFamily: FontFamily.regular,
      marginBottom: UI_SIZE_10,
      lineHeight: UI_SIZE_20,
      color: c.onSurfaceVariant,
    },
    checklistRow: {
      ...commonStyles.row,
      marginBottom: UI_SIZE_10,
    },
    checkboxIcon: {
      marginRight: UI_SIZE_6,
      marginTop: 1,
    },
    meta: {
      ...commonStyles.row,
    },
    metaDate: {
      fontSize: UI_FONT_SIZE_10,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 0.5,
      color: c.onSurfaceVariant,
    },
    metaDot: {
      fontSize: UI_FONT_SIZE_10,
      color: c.onSurfaceVariant,
    },
    metaTag: {
      fontSize: UI_FONT_SIZE_10,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 0.5,
      color: c.onSurfaceVariant,
    },
    metaTagPear: {
      color: c.primary,
    },
    thumbnail: {
      width: UI_SIZE_60,
      height: UI_SIZE_60,
      borderRadius: UI_SIZE_14,
      borderWidth: 1,
      borderColor: hexWithAlpha(c.outlineVariant, 0.2),
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
  })
  return styles
}, useRowHooks)
