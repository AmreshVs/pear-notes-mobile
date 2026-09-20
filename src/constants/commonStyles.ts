import { Platform, StyleSheet } from 'react-native'

export const FontSize = {
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  heading: 24,
  hero: 32,
} as const

export const UI_SIZE_2 = 2
export const UI_SIZE_4 = 4
export const UI_SIZE_6 = 6
export const UI_SIZE_8 = 8
export const UI_SIZE_10 = 10
export const UI_SIZE_12 = 12
export const UI_SIZE_14 = 14
export const UI_SIZE_15 = 15
export const UI_SIZE_16 = 16
export const UI_SIZE_17 = 17
export const UI_SIZE_18 = 18
export const UI_SIZE_20 = 20
export const UI_SIZE_22 = 22
export const UI_SIZE_24 = 24
export const UI_SIZE_27 = 27
export const UI_SIZE_30 = 30
export const UI_SIZE_32 = 32
export const UI_SIZE_40 = 40
export const UI_SIZE_48 = 48
export const UI_SIZE_50 = 50
export const UI_SIZE_52 = 52
export const UI_SIZE_54 = 54
export const UI_SIZE_56 = 56
export const UI_SIZE_60 = 60
export const UI_SIZE_64 = 64
export const UI_SIZE_72 = 72
export const UI_SIZE_80 = 80
export const UI_SIZE_88 = 88
export const UI_SIZE_28 = 28
export const UI_SIZE_36 = 36
export const UI_SIZE_42 = 42
export const UI_SIZE_44 = 44
export const UI_SIZE_62 = 62
export const UI_SIZE_76 = 76
export const UI_SIZE_96 = 96
export const UI_SIZE_120 = 120
export const UI_SIZE_150 = 150
export const UI_SIZE_180 = 180
export const UI_SIZE_200 = 200
export const UI_SIZE_280 = 280
export const UI_SIZE_9999 = 9999

export const SHEET_MAX_WIDTH = 640
export const LARGE_SCREEN_MIN_WIDTH = 768
export const SHORT_WINDOW_MAX_HEIGHT = 600
export const SIDEBAR_WIDTH = 360
export const SETTINGS_MENU_WIDTH = 300
export const SETTINGS_PANEL_WIDTH_RATIO = '88%'
export const SETTINGS_PANEL_HEIGHT_RATIO = '88%'
export const SETTINGS_PANEL_MAX_WIDTH = 1100

export const UI_ICON_SIZE_18 = 18
export const UI_ICON_SIZE_20 = 20
export const UI_ICON_SIZE_22 = 22
export const UI_ICON_SIZE_28 = 28
export const UI_ICON_SIZE_44 = 44
export const UI_ICON_SIZE_48 = 48

export const UI_ICON_SIZE_13 = 13
export const UI_ICON_SIZE_14 = 14
export const UI_ICON_SIZE_15 = 15
export const UI_ICON_SIZE_16 = 16
export const UI_ICON_SIZE_17 = 17
export const UI_ICON_SIZE_24 = 24
export const UI_ICON_SIZE_40 = 40
export const UI_ICON_SIZE_12 = 12
export const UI_ICON_SIZE_26 = 26
export const UI_ICON_SIZE_30 = 30
export const UI_ICON_SIZE_36 = 36
export const UI_ICON_SIZE_64 = 64

export const UI_STROKE_WIDTH_1_5 = 1.5
export const UI_STROKE_WIDTH_1_8 = 1.8
export const UI_STROKE_WIDTH_2_5 = 2.5

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
}

export const Layout = {
  grabberWidth: 38,
  grabberHeight: 5,
  btnHeight: 54,
  sheetGap: 18,
  shadowOffsetDark: -10,
  shadowOffsetLight: -12,
  shadowRadiusDark: 32,
  shadowRadiusLight: 40,
  closeBtnSize: 30,
  segCtrlPadding: 3,
  segPillPaddingVertical: 7,
  segPillBorderWidth: 1.5,
  buttonBorderWidth: 1,
  rowPaddingHorizontal: 18,
  settingsRowMinHeight: 52,
  scrollPaddingBottom: 60,
} as const

export const OPACITY_DISABLED = 0.4

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  xl: 24,
  sheet: 34,
  btn: 27,
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

export const ListMotion = {
  enterDuration: 220,
  enterStagger: 35,
  enterMaxIndex: 8,
  exitDuration: 180,
} as const

export const Durations = {
  overlayFade: 300,
  overlayFadeOut: 200,
  sheetOpen: 340,
  sheetClose: 260,
  fade: 220,
  slide: 240,
  delayShort: 40,
  delayMedium: 90,
  delayLong: 120,
  delayExtraLong: 150,
  delayReset: 180,
  delayFooter: 220,
  toast: 3000,
  debugHold: 3000,
} as const

export const GlassIntensity = {
  low: 10,
  medium: 20,
  high: 50,
} as const

export const IconSize = {
  xs: 15,
  sm: 16,
  md: 17,
  lg: 24,
} as const

export const StrokeWidth = {
  thin: 1.5,
  medium: 1.8,
  bold: 2.5,
} as const

export const TRANSFER_LIST_MAX_HEIGHT = 340

export const LetterSpacing = {
  tight: -0.4,
  caps: 1.5,
  wide: 1.2,
  loose: 3,
  code: 6,
} as const
export const MonoFontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace'

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular' as const,
  medium: 'PlusJakartaSans_500Medium' as const,
  semiBold: 'PlusJakartaSans_600SemiBold' as const,
  bold: 'PlusJakartaSans_700Bold' as const,
  extraBold: 'PlusJakartaSans_800ExtraBold' as const,
  mono: MonoFontFamily,
} as const

export const commonStyles = StyleSheet.create({
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

  pressed: { opacity: 0.5 },

  disabled: { opacity: OPACITY_DISABLED },

  headerBtn: { padding: Space.sm },

  iconBox32: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  primaryBtn: {
    minHeight: UI_SIZE_50,
    paddingVertical: Space.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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

  sectionHeader: {
    marginTop: UI_SIZE_14,
  },
})
