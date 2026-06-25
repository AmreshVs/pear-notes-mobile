export function getPreview(html: string, fallback: string): string {
  if (!html) return fallback
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 100 ? text.substring(0, 100) + '…' : text || fallback
}

export function getFirstImageUrl(html: string): string | undefined {
  if (!html) return undefined
  const divMatch =
    html.match(/<div[^>]*filetype="image\/[^"]*"[^>]*url="([^"]+)"[^>]*>/) ||
    html.match(/<div[^>]*url="([^"]+)"[^>]*filetype="image\/[^"]*"[^>]*>/)
  if (divMatch?.[1]) return divMatch[1].replace(/&amp;/g, '&')
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/)
  if (imgMatch?.[1]) return imgMatch[1].replace(/&amp;/g, '&')
  return undefined
}
