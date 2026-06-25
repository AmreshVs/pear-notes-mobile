import { StyleSheet } from 'react-native'

import { FontSize, FontWeight, LetterSpacing, Radii, Space } from './commonStyles'

import { createThemedStylesheet, Theme } from '@/components/Themed'

export const createThemedStyles = (theme: Theme) => {
  const isDark = theme.isDark
  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      opacity: 0.5,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Space.xxxl,
    },
    emptyTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.3,
      textAlign: 'center',
      marginBottom: Space.sm,
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },
    emptySubtitle: {
      fontSize: FontSize.body,
      textAlign: 'center',
      opacity: 0.4,
      lineHeight: Space.lg,
      color: theme.colors.textSecondary,
    },
    pillDivider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: theme.colors.separator,
      marginHorizontal: Space.sm,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.borderSecondary,
    },
    card: {
      borderRadius: Radii.card,
      borderWidth: 1,
      overflow: 'hidden',
      borderColor: theme.colors.borderSecondary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
    },
    iconBox34: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },
    cancelBtn: {
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    inputLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },
  })
}

export const useCommonThemedStyles = createThemedStylesheet(createThemedStyles)
