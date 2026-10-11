import { StyleSheet } from 'react-native'

import { createThemedStylesheet } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_2,
  UI_SIZE_4,
} from '@/constants/commonStyles'

export const useExtrasStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.lg,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.base,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.base,
    },
    toggleInfo: {
      flex: 1,
    },
    titleRow: {
      ...commonStyles.row,
      gap: Space.xs,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      textAlign: 'right',
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    indexRow: {
      ...commonStyles.rowBetween,
      gap: Space.base,
      padding: Space.lg,
    },
    indexButton: {
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    indexButtonText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    progressBlock: {
      gap: Space.sm,
      paddingHorizontal: Space.lg,
      paddingBottom: Space.lg,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
    captionRow: {
      ...commonStyles.rowBetween,
      gap: Space.base,
    },
    caption: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    footnote: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginTop: Space.sm,
      marginHorizontal: Space.sm,
      lineHeight: FontSize.caption * 1.45,
    },
  })
  return styles
})
