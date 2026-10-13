import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Switch } from 'react-native-paper'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { IMAGE_DETAILS_TYPE } from '@pear-notes/core/store/services/imageDetails.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import type { ImageDetails } from '@/components/useVoiceTypingSheet'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_96,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

interface ImageDetailsPreviewProps {
  details: ImageDetails
  imageUri: string | null
  keepPhoto: boolean
  maxHeight: number
  onToggleKeepPhoto: () => void
}

type DetailsItem = ImageDetails['items'][number]

export function ImageDetailsPreview({
  details,
  imageUri,
  keepPhoto,
  maxHeight,
  onToggleKeepPhoto,
}: ImageDetailsPreviewProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const md3 = useMD3Theme()
  const styles = useStyles()
  const scrollStyle = useMemo(() => ({ maxHeight }), [maxHeight])
  const isNotes = details.type === IMAGE_DETAILS_TYPE.NOTES
  const fields = details.fields as [string, string][]
  const lastField = fields.length - 1

  const renderField = useCallback(
    ([key, value]: [string, string], index: number) => (
      <View key={key} style={[styles.fieldRow, index === lastField && styles.fieldRowLast]}>
        <Text style={styles.fieldLabel}>{t(`localAi.details.fields.${key}`)}</Text>
        <Text style={styles.fieldValue} selectable>
          {value}
        </Text>
      </View>
    ),
    [lastField, styles, t],
  )

  const renderItem = useCallback(
    (item: DetailsItem, index: number) => (
      <View key={index} style={styles.itemRow}>
        <Text style={[styles.itemText, item.charge && styles.itemCharge]} selectable>
          {item.label}
        </Text>
        {!!item.amount && (
          <Text style={[styles.itemAmount, item.charge && styles.itemCharge]}>{item.amount}</Text>
        )}
      </View>
    ),
    [styles],
  )

  return (
    <ScrollView style={scrollStyle} contentContainerStyle={styles.content}>
      {fields.length > 0 && (
        <View style={styles.topRow}>
          {!!imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.thumbnail}
              contentFit="cover"
              accessibilityLabel={t('localAi.details.photoAlt')}
            />
          )}
          <View style={styles.fieldsCard}>{fields.map(renderField)}</View>
        </View>
      )}

      {details.items.length > 0 && (
        <View style={styles.itemsCard}>
          {!isNotes && <Text style={styles.itemsHeading}>{t('localAi.details.fields.items')}</Text>}
          {details.items.map(renderItem)}
          {!!details.check && (
            <View style={styles.checkRow}>
              <Text style={[styles.checkText, !details.check.addsUp && styles.checkWarning]}>
                {details.check.addsUp
                  ? t('localAi.details.check.addsUp')
                  : t('localAi.details.check.mismatch', { amount: details.check.itemsTotal })}
              </Text>
              <MaterialCommunityIcons
                name={details.check.addsUp ? 'check' : 'alert-outline'}
                size={UI_ICON_SIZE_20}
                color={details.check.addsUp ? colors.success : colors.warning}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.photoRow}>
        <Text style={styles.photoLabel}>{t('localAi.details.keepPhoto')}</Text>
        <Switch
          value={keepPhoto}
          onValueChange={onToggleKeepPhoto}
          color={md3.colors.primary}
          accessibilityLabel={t('localAi.details.keepPhoto')}
        />
      </View>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const card = {
    borderRadius: UI_SIZE_20,
    backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
  }
  const mutedText = c.onSurfaceVariant ?? c.onSurface
  const styles = StyleSheet.create({
    content: {
      gap: UI_SIZE_12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: UI_SIZE_12,
    },
    thumbnail: {
      width: UI_SIZE_96,
      minHeight: UI_SIZE_96,
      borderRadius: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    fieldsCard: {
      ...card,
      flex: 1,
      overflow: 'hidden',
    },
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
    },
    fieldRowLast: {
      borderBottomWidth: 0,
    },
    fieldLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: mutedText,
    },
    fieldValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    itemsCard: {
      ...card,
      paddingVertical: UI_SIZE_6,
    },
    itemsHeading: {
      paddingHorizontal: UI_SIZE_16,
      paddingTop: UI_SIZE_4,
      paddingBottom: UI_SIZE_6,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: mutedText,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_6,
    },
    itemText: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    itemAmount: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
      fontVariant: ['tabular-nums'],
    },
    itemCharge: {
      color: mutedText,
    },
    checkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: UI_SIZE_12,
      marginHorizontal: UI_SIZE_16,
      marginTop: UI_SIZE_6,
      paddingTop: UI_SIZE_12,
      paddingBottom: UI_SIZE_2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.onSurface, 0.12),
    },
    checkText: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    checkWarning: {
      color: theme.colors.warning,
    },
    photoRow: {
      ...card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
    },
    photoLabel: {
      flex: 1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
  })
  return styles
}, useMD3Theme)
