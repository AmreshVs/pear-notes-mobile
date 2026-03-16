import { Platform, StyleSheet } from 'react-native'

import type { Theme } from '@/components/Themed'
import { useThemedStyles } from '@/components/Themed'

export const FontSize = {
  micro: 10,
  caption: 11,
  small: 12,
  body: 14,
  base: 16,
  subtitle: 17,
  title: 18,
  heading: 24,
  hero: 32,
} as const

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
}

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 18,
  xl: 24,
  pill: 9999,
} as const

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  scrollBottom: 120,
} as const

export const LetterSpacing = {
  tight: -0.4,
  caps: 1.5,
  wide: 1.2,
} as const
export const MonoFontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace'

export const createCommonStyles = (theme: Theme) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    scrollContent: {
      paddingBottom: Space.scrollBottom,
      paddingTop: Space.sm,
    },

    flex1: { flex: 1 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    centered: {
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingTop: Space.scrollBottom,
      paddingHorizontal: Space.xxxl,
    },

    emptyTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.3,
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

    pressed: { opacity: 0.5 },

    headerBtn: { padding: Space.sm },

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
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
    },

    iconBox32: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    iconBox34: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },

    iconBox44: {
      width: 44,
      height: 44,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    iconRing80: {
      width: 80,
      height: 80,
      borderRadius: Radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
    },

    modalCard: {
      width: '100%',
      maxWidth: 384,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 20,
    },

    modalInner: {
      padding: Space.xxxl,
      alignItems: 'center',
      width: '100%',
    },

    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },

    primaryBtn: {
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelBtn: {
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },

    inputLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },

    monoText: {
      fontFamily: MonoFontFamily,
    },

    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: Space.base,
      minHeight: 52,
    },

    settingsRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    settingsRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
  })

export const useCommonStyles = () => useThemedStyles(createCommonStyles)
