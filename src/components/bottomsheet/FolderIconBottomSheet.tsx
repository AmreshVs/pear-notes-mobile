import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View as RNView,
} from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  GlassIntensity,
  Layout,
  Radii,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_52,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_ROWS, FOLDER_ICON_SF } from '@/constants/folderIcons'

interface FolderIconBottomSheetProps {
  visible: boolean
  folderName: string
  selectedIcon: string
  onSelect: (icon: string) => void
  onCancel: () => void
}

const SHEET_TRAVEL = 450
const SHEET_CHROME_HEIGHT = 240

export function FolderIconBottomSheet({
  visible,
  folderName,
  selectedIcon,
  onSelect,
  onCancel,
}: FolderIconBottomSheetProps) {
  const { t } = useTranslation()
  const { isDark, colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const styles = useStyles()

  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value,
  }))

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * SHEET_TRAVEL }],
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
      { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setIsPresented)(false)
      },
    )
  }, [sheetProgress, visible])

  const handleCancel = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onCancel)()
        }
      },
    )
  }, [sheetProgress, onCancel])

  const handleSelect = useCallback(
    (icon: string) => {
      sheetProgress.value = withTiming(
        0,
        { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setIsPresented)(false)
            runOnJS(onSelect)(icon)
          }
        },
      )
    },
    [sheetProgress, onSelect],
  )

  const renderIconRow = useCallback(
    (row: (string | null)[], rowIndex: number) => (
      <RNView key={rowIndex} style={styles.gridRow}>
        {row.map((icon, cellIndex) =>
          icon === null ? (
            <RNView key={cellIndex} style={styles.cellSpacer} />
          ) : (
            <FolderIconCell
              key={icon}
              icon={icon}
              selected={icon === selectedIcon}
              label={t(`folders.icons.${icon}`)}
              color={icon === selectedIcon ? colors.primary : colors.text}
              onSelect={handleSelect}
            />
          ),
        )}
      </RNView>
    ),
    [selectedIcon, handleSelect, styles.gridRow, styles.cellSpacer, t, colors.primary, colors.text],
  )

  const gridScrollStyle = useMemo(
    () => ({ maxHeight: Math.max(windowHeight - SHEET_CHROME_HEIGHT, SHEET_CHROME_HEIGHT) }),
    [windowHeight],
  )

  const bottomInsetStyle = useMemo(
    () => [styles.bottomInset, { height: Math.max(insets.bottom, UI_SIZE_16) }],
    [styles.bottomInset, insets.bottom],
  )

  if (!isPresented) return null

  const content = (
    <>
      <RNView style={styles.grabber} />
      <RNView style={styles.content}>
        <Text style={styles.title}>{t('folders.iconPickerTitle', { name: folderName })}</Text>
        <ScrollView
          style={gridScrollStyle}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {FOLDER_ICON_ROWS.map(renderIconRow)}
        </ScrollView>
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
        >
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
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
            <GlassView
              intensity={GlassIntensity.low}
              borderRadius={Radii.sheet}
              style={styles.sheet}
            >
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

interface FolderIconCellProps {
  icon: string
  selected: boolean
  label: string
  color: string
  onSelect: (icon: string) => void
}

const FolderIconCell = memo(function FolderIconCell({
  icon,
  selected,
  label,
  color,
  onSelect,
}: FolderIconCellProps) {
  const styles = useStyles()
  const handlePress = useCallback(() => onSelect(icon), [icon, onSelect])
  const accessibilityState = useMemo(() => ({ selected }), [selected])

  const cellStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.cell,
      selected && styles.cellSelected,
      pressed && commonStyles.pressed,
    ],
    [styles.cell, styles.cellSelected, selected],
  )

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      style={cellStyle}
    >
      <SymbolIcon
        name={FOLDER_ICON_SF[icon] ?? FALLBACK_FOLDER_SF}
        size={UI_ICON_SIZE_22}
        color={color}
      />
    </Pressable>
  )
})

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
    },
    sheet: {
      paddingHorizontal: UI_SIZE_24,
      paddingTop: UI_SIZE_12,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_16,
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
    grabber: {
      alignSelf: 'center',
      width: Layout.grabberWidth,
      height: Layout.grabberHeight,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.sheetGrabber,
      marginBottom: UI_SIZE_8,
    },
    content: {
      gap: UI_SIZE_16,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },
    grid: {
      gap: UI_SIZE_8,
    },
    gridRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    cellSpacer: {
      ...commonStyles.flex1,
    },
    cell: {
      ...commonStyles.centered,
      ...commonStyles.flex1,
      aspectRatio: 1,
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.transparent,
      backgroundColor: theme.colors.controlBackground,
    },
    cellSelected: {
      backgroundColor: theme.colors.cardSelected,
      borderColor: theme.colors.primary,
    },
    cancelBtn: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_52,
      borderRadius: Radii.btn,
      backgroundColor: theme.colors.sheetCancelBackground,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    bottomInset: {
      backgroundColor: theme.colors.transparent,
    },
  })

  return styles
})
