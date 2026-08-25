export type FontPreviewVariant = 'sans' | 'serif' | 'mono'

const PREVIEW_VARIANTS: Record<string, FontPreviewVariant> = {
  System: 'sans',
  Inter: 'sans',
  Outfit: 'sans',
  Serif: 'serif',
  Lora: 'serif',
  Newsreader: 'serif',
  Mono: 'mono',
  'IBM Plex Mono': 'mono',
}

export function getFontPreviewVariant(value: string): FontPreviewVariant {
  return PREVIEW_VARIANTS[value] ?? 'sans'
}
