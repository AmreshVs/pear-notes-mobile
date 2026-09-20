import { StyleSheet } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  SHEET_MAX_WIDTH,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_44,
  UI_SIZE_62,
  UI_SIZE_76,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceContainerLowest: string
}

export const SHEET_ICON_CHIP_ALPHA = 0.15

export const useSheetStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors

  const styles = StyleSheet.create({
    sheetBackground: {
      backgroundColor: c.surfaceContainerLow ?? c.surface,
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
    },
    handleIndicator: {
      width: UI_SIZE_36,
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
      alignSelf: 'center',
      backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.5),
    },
    sheetContainer: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
    },
    content: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: UI_SIZE_20,
    },
    header: {
      paddingHorizontal: UI_SIZE_4,
      paddingTop: UI_SIZE_4,
      paddingBottom: UI_SIZE_16,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      letterSpacing: -0.3,
      color: c.onSurface,
    },
    subtitle: {
      marginTop: UI_SIZE_8,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: UI_SIZE_20,
      color: c.onSurfaceVariant,
    },
    card: {
      borderRadius: UI_SIZE_20,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_14,
      gap: UI_SIZE_16,
      minHeight: UI_SIZE_62,
    },
    iconCircle: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
    },
    rowLabel: {
      flex: 1,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: UI_SIZE_76,
      marginRight: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.14),
    },
    bottomPad: {
      height: UI_SIZE_28,
    },
  })
  return styles
}, useMD3Theme)
