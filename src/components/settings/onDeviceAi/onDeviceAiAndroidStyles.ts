import { StyleSheet } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const useExtrasHooks = () => ({ md3: useMD3Theme() })

export const useExtrasStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    groupCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      marginBottom: UI_SIZE_12,
      overflow: 'hidden',
    },
    toggleRow: {
      ...commonStyles.rowBetween,
      padding: Space.base,
      gap: Space.base,
    },
    toggleInfo: {
      ...commonStyles.flex1,
    },
    titleRow: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_20,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'right',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      marginHorizontal: Space.base,
    },
    indexButton: {
      overflow: 'hidden',
      paddingHorizontal: Space.base,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
      ...commonStyles.centered,
    },
    indexButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
    progressBlock: {
      gap: UI_SIZE_8,
      paddingHorizontal: Space.base,
      paddingBottom: Space.base,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    captionRow: {
      ...commonStyles.rowBetween,
      gap: Space.base,
    },
    caption: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    footnote: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_20,
      marginHorizontal: UI_SIZE_8,
      marginBottom: UI_SIZE_12,
    },
  })
  return styles
}, useExtrasHooks)
