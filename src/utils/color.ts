const HEX_SHORT_LENGTH = 4
const HEX_FULL_LENGTH = 7
const RGB_CHANNELS_PATTERN = /^rgba?\(([^)]+)\)$/i

function expandShortHex(hex: string): string {
  return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
}

export function colorWithAlpha(color: string, alpha: number): string {
  if (!color) return color
  if (color.startsWith('#')) {
    const hex =
      color.length === HEX_SHORT_LENGTH ? expandShortHex(color) : color.slice(0, HEX_FULL_LENGTH)
    if (hex.length !== HEX_FULL_LENGTH) return color
    const red = parseInt(hex.slice(1, 3), 16)
    const green = parseInt(hex.slice(3, 5), 16)
    const blue = parseInt(hex.slice(5, 7), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }
  const channels = color.match(RGB_CHANNELS_PATTERN)
  if (!channels) return color
  const [red, green, blue] = channels[1].split(',').map((channel) => channel.trim())
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
