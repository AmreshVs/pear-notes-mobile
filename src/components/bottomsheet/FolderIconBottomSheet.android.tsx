import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, useTheme } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_36,
} from '@/constants/commonStyles'
import {
  FALLBACK_FOLDER_MATERIAL,
  FOLDER_ICON_MATERIAL,
  FOLDER_ICON_ROWS,
} from '@/constants/folderIcons'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

const SHEET_CHROME_HEIGHT = 200

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainerHigh: string
}

interface FolderIconBottomSheetProps {
  visible: boolean
  folderName: string
  selectedIcon: string
  onSelect: (icon: string) => void
  onCancel: () => void
}

export function FolderIconBottomSheet({
  visible,
  folderName,
  selectedIcon,
  onSelect,
  onCancel,
}: FolderIconBottomSheetProps) {
  const { t } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const { height: windowHeight } = useWindowDimensions()
  const styles = useStyles()
  const { colors } = useMD3Theme()

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const backgroundStyle = useMemo(() => styles.sheetBackground, [styles.sheetBackground])
  const gridScrollStyle = useMemo(
    () => ({ maxHeight: Math.max(windowHeight - SHEET_CHROME_HEIGHT, SHEET_CHROME_HEIGHT) }),
    [windowHeight],
  )
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  const renderIconRow = useCallback(
    (row: (string | null)[], rowIndex: number) => (
      <View key={rowIndex} style={styles.gridRow}>
        {row.map((icon, cellIndex) =>
          icon === null ? (
            <View key={cellIndex} style={styles.cellSpacer} />
          ) : (
            <FolderIconCell
              key={icon}
              icon={icon}
              label={t(`folders.icons.${icon}`)}
              selected={icon === selectedIcon}
              ripple={ripple}
              onSelect={onSelect}
            />
          ),
        )}
      </View>
    ),
    [selectedIcon, ripple, onSelect, t, styles.gridRow, styles.cellSpacer],
  )

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onCancel}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('folders.iconPickerTitle', { name: folderName })}</Text>
        </View>
        <BottomSheetScrollView
          style={gridScrollStyle}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {FOLDER_ICON_ROWS.map(renderIconRow)}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

interface FolderIconCellProps {
  icon: string
  label: string
  selected: boolean
  ripple: ReturnType<typeof androidRipple>
  onSelect: (icon: string) => void
}

function FolderIconCell({ icon, label, selected, ripple, onSelect }: FolderIconCellProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const handlePress = useCallback(() => onSelect(icon), [icon, onSelect])

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={selected ? styles.cellSelected : styles.cell}
    >
      <MaterialCommunityIcons
        name={(FOLDER_ICON_MATERIAL[icon] ?? FALLBACK_FOLDER_MATERIAL) as never}
        size={UI_ICON_SIZE_22}
        color={selected ? colors.primary : colors.text}
      />
    </Pressable>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors

  const cellBase = {
    flex: 1,
    aspectRatio: 1,
    borderRadius: UI_SIZE_16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.transparent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  }

  const styles = StyleSheet.create({
    sheetBackground: {
      backgroundColor: c.surfaceContainerLow ?? c.surface,
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
    },
    handleIndicator: {
      width: UI_SIZE_36,
      height: UI_SIZE_4,
      borderRadius: 9999,
      alignSelf: 'center',
      backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.5),
    },
    container: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_4,
      paddingBottom: UI_SIZE_24,
    },
    header: {
      paddingHorizontal: UI_SIZE_4,
      paddingBottom: UI_SIZE_20,
    },
    title: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    grid: {
      gap: UI_SIZE_8,
    },
    gridRow: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
    },
    cellSpacer: {
      flex: 1,
    },
    cell: {
      ...cellBase,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    cellSelected: {
      ...cellBase,
      backgroundColor: theme.colors.cardSelected,
      borderColor: theme.colors.primary,
    },
  })

  return styles
}, useMD3Theme)
