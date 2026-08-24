const ACCESSIBILITY_FONT_SCALE = 1.35
const LARGEST_FONT_SCALE = 2

export const MAX_FONT_SCALE_CHROME = 1.5

export function scaledLineCount(base: number, fontScale: number): number {
  if (fontScale >= LARGEST_FONT_SCALE) return base + 2
  if (fontScale >= ACCESSIBILITY_FONT_SCALE) return base + 1
  return base
}

export function isAccessibilityTextSize(fontScale: number): boolean {
  return fontScale >= ACCESSIBILITY_FONT_SCALE
}
