import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, useWindowDimensions, View as RNView } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  GlassIntensity,
  Radii,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_50,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import type { RemovalDetails, RemovalIcon, RemovalItem } from '@/lib/removal.types'

interface ClearStorageBottomSheetProps {
  visible: boolean
  details: RemovalDetails
  onConfirm: () => void
  onCancel: () => void
}

const DESTRUCTIVE_TINT_ALPHA = 0.14

const REMOVAL_ICONS: Record<RemovalIcon, IconName> = {
  vaults: 'square.stack.3d.up',
  ai: 'sparkles',
  data: 'gearshape',
  notes: 'note.text',
  media: 'photo',
  devices: 'laptopcomputer.and.iphone',
  backups: 'doc.zipper',
}

export function ClearStorageBottomSheet({
  visible,
  details,
  onConfirm,
  onCancel,
}: ClearStorageBottomSheetProps) {
  const { t } = useTranslation()
  const { isDark, colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value * 1,
  }))

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - sheetProgress.value) * windowHeight,
      },
    ],
  }))

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, {
      duration: Durations.sheetOpen,
      easing: Easing.out(Easing.cubic),
    })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }

    sheetProgress.value = withTiming(
      0,
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
        }
      },
    )
  }, [sheetProgress, visible])

  const handleCancel = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onCancel)()
        }
      },
    )
  }, [sheetProgress, onCancel])

  const handleConfirm = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onConfirm)()
        }
      },
    )
  }, [sheetProgress, onConfirm])

  const bottomInsetStyle = useMemo(
    () => ({ height: Math.max(insets.bottom, UI_SIZE_16) }),
    [insets.bottom],
  )

  const renderItem = (item: RemovalItem, index: number) => (
    <RNView key={item.key} style={[styles.itemRow, index > 0 && styles.itemBorder]}>
      <RNView style={commonThemedStyles.iconBox34}>
        <SymbolIcon name={REMOVAL_ICONS[item.icon]} size={UI_SIZE_20} color={colors.primary} />
      </RNView>
      <Text style={styles.itemLabel} numberOfLines={2}>
        {item.label}
      </Text>
      {item.value ? <Text style={styles.itemValue}>{item.value}</Text> : null}
    </RNView>
  )

  if (!isPresented) return null

  const content = (
    <>
      <RNView style={styles.content}>
        <RNView style={styles.header}>
          <Text style={styles.title}>{details.title}</Text>
          <Pressable
            onPress={handleCancel}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => pressed && commonStyles.pressed}
          >
            <GlassView
              intensity={GlassIntensity.low}
              borderRadius={Radii.pill}
              style={styles.closeBtn}
            >
              <SymbolIcon name="xmark" size={UI_ICON_SIZE_14} color={colors.textSecondary} />
            </GlassView>
          </Pressable>
        </RNView>
        <RNView style={styles.group}>
          <Text style={styles.removedLabel}>{t('storage.removal.removed')}</Text>
          <RNView style={styles.card}>{details.removed.map(renderItem)}</RNView>
        </RNView>
        <RNView style={styles.group}>
          <Text style={styles.keptLabel}>{t('storage.removal.kept')}</Text>
          <RNView style={styles.card}>{details.kept.map(renderItem)}</RNView>
        </RNView>
        <Text style={styles.note}>{details.note}</Text>
        <Pressable
          onPress={handleConfirm}
          accessibilityRole="button"
          style={({ pressed }) => [styles.confirmBtn, pressed && commonStyles.pressed]}
        >
          <Text style={styles.confirmBtnText}>{details.confirmLabel}</Text>
        </Pressable>
      </RNView>
      <RNView style={bottomInsetStyle} />
    </>
  )

  return (
    <Modal
      visible={isPresented}
      transparent
      allowSwipeDismissal
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleCancel}
    >
      <RNView style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView intensity={GlassIntensity.low} borderRadius={34} style={styles.sheet}>
              {content}
            </GlassView>
          ) : (
            <RNView style={[styles.sheet, styles.sheetLight]}>{content}</RNView>
          )}
        </Animated.View>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      ...commonStyles.flex1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheetWrap: {
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    sheet: {
      paddingHorizontal: UI_SIZE_24,
      paddingTop: UI_SIZE_20,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_18,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.isDark
        ? `0 -${UI_SIZE_10}px ${UI_SIZE_32}px ${theme.colors.sheetShadow}`
        : `0 -${UI_SIZE_12}px ${UI_SIZE_40}px ${theme.colors.sheetShadow}`,
    },
    sheetLight: {
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.sheetBorder,
    },
    content: {
      gap: UI_SIZE_16,
    },
    group: {
      gap: UI_SIZE_8,
    },
    removedLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
      marginLeft: UI_SIZE_4,
    },
    keptLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
      marginLeft: UI_SIZE_4,
    },
    card: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: theme.colors.cardSurface,
    },
    itemRow: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
    },
    itemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    itemLabel: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    itemValue: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    note: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
      marginLeft: UI_SIZE_4,
    },
    header: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
      paddingLeft: UI_SIZE_4,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    closeBtn: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      ...commonStyles.centered,
    },
    confirmBtn: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_50,
      marginTop: UI_SIZE_4,
      borderRadius: Radii.md,
      borderCurve: 'continuous',
      backgroundColor: hexWithAlpha(theme.colors.error, DESTRUCTIVE_TINT_ALPHA),
    },
    confirmBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
  })

  return styles
})
