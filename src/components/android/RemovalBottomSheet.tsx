import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_36,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import type { RemovalDetails, RemovalIcon, RemovalItem } from '@/lib/removal.types'

type Props = {
  visible: boolean
  details: RemovalDetails
  onConfirm: () => void
  onCancel: () => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHighest?: string
}

const REMOVAL_ICONS: Record<RemovalIcon, string> = {
  vaults: 'layers-outline',
  ai: 'creation-outline',
  data: 'cog-outline',
  notes: 'note-text-outline',
  media: 'image-outline',
  devices: 'devices',
  backups: 'folder-zip-outline',
}

const DESTRUCTIVE_TINT_ALPHA = 0.14

export function RemovalBottomSheet({ visible, details, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const confirmedRef = useRef(false)
  const sheet = useSheetStyles()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.error), [colors.error])

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const backgroundStyle = useMemo(() => sheet.sheetBackground, [sheet.sheetBackground])

  const handleDismiss = useCallback(() => {
    if (confirmedRef.current) {
      confirmedRef.current = false
      onConfirm()
      return
    }
    onCancel()
  }, [onCancel, onConfirm])

  const handleConfirm = useCallback(() => {
    confirmedRef.current = true
    ref.current?.dismiss()
  }, [])

  const renderItem = useCallback(
    (item: RemovalItem, index: number) => (
      <View key={item.key}>
        {index > 0 && <View style={styles.separator} />}
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={REMOVAL_ICONS[item.icon] as never}
              size={UI_ICON_SIZE_20}
              color={colors.primary}
            />
          </View>
          <Text style={styles.rowLabel} numberOfLines={2}>
            {item.label}
          </Text>
          {item.value ? <Text style={styles.rowValue}>{item.value}</Text> : null}
        </View>
      </View>
    ),
    [colors.primary, styles],
  )

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicator}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={sheet.content}>
        <View style={sheet.header}>
          <Text style={sheet.title}>{details.title}</Text>
        </View>
        <Text style={styles.removedLabel}>{t('storage.removal.removed')}</Text>
        <View style={styles.card}>{details.removed.map(renderItem)}</View>
        <Text style={styles.keptLabel}>{t('storage.removal.kept')}</Text>
        <View style={styles.card}>{details.kept.map(renderItem)}</View>
        <Text style={styles.note}>{details.note}</Text>
        <Pressable
          onPress={handleConfirm}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.confirmButton}
        >
          <Text style={styles.confirmText}>{details.confirmLabel}</Text>
        </Pressable>
        <View style={sheet.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3) => {
  const c = md3.colors as ExtendedColors
  const labelBase = {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.semiBold,
    marginTop: UI_SIZE_16,
    marginBottom: UI_SIZE_8,
    marginLeft: UI_SIZE_4,
  }
  const styles = StyleSheet.create({
    card: {
      borderRadius: UI_SIZE_20,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    removedLabel: {
      ...labelBase,
      marginTop: 0,
      color: c.onSurfaceVariant,
    },
    keptLabel: {
      ...labelBase,
      color: c.onSurfaceVariant,
    },
    iconWrap: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.primaryContainer ?? c.primary, theme.isDark ? 0.18 : 0.22),
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: UI_SIZE_16 + UI_SIZE_36 + UI_SIZE_16,
      marginRight: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
    },
    rowLabel: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    rowValue: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_12,
      marginLeft: UI_SIZE_4,
    },
    confirmButton: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_48,
      marginTop: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.error, DESTRUCTIVE_TINT_ALPHA),
    },
    confirmText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useMD3Theme)
