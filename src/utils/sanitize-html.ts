export function sanitizeTipTapHtml(html: string): string {
  if (!html || html.trim().length === 0) return html

  let result = html

  result = result.replace(/<div[^>]*data-file-attachment[^>]*>[\s\S]*?<\/div>/gi, '')
  result = result.replace(/<div[^>]*data-audio-attachment[^>]*>[\s\S]*?<\/div>/gi, '')

  result = result.replace(/\s+class="[^"]*"/gi, '')
  result = result.replace(/\s+draggable="[^"]*"/gi, '')
  result = result.replace(/\s+contenteditable="[^"]*"/gi, '')

  result = result.replace(/<strong([^>]*)>/gi, '<b$1>')
  result = result.replace(/<\/strong>/gi, '</b>')
  result = result.replace(/<em([^>]*)>/gi, '<i$1>')
  result = result.replace(/<\/em>/gi, '</i>')

  result = result.replace(/<ul[^>]*data-type="taskList"[^>]*>/gi, '<ul data-type="checkbox">')
  result = result.replace(
    /<li[^>]*data-type="taskItem"\s+data-checked="true"[^>]*>/gi,
    '<li checked>',
  )
  result = result.replace(
    /<li[^>]*data-checked="true"\s+data-type="taskItem"[^>]*>/gi,
    '<li checked>',
  )
  result = result.replace(/<li[^>]*data-type="taskItem"[^>]*>/gi, '<li>')
  result = result.replace(/<label><input[^>]*type="checkbox"[^>]*><\/label>/gi, '')
  result = result.replace(/<label><input[^>]*type="checkbox"[^>]*>/gi, '')
  result = result.replace(/<\/label>/gi, '')
  result = result.replace(/<label>/gi, '')

  result = result.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    '<codeblock><p>$1</p></codeblock>',
  )

  result = result.replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1/>')
  result = result.replace(/\s+alt="[^"]*"/gi, '')
  result = result.replace(/\s+title="[^"]*"/gi, '')

  result = result.replace(/<a\s+([^>]*?)>/gi, (_match, attrs) => {
    const hrefMatch = attrs.match(/href="([^"]*)"/)
    if (hrefMatch) return `<a href="${hrefMatch[1]}">`
    return '<a>'
  })

  result = result.replace(/&amp;/g, '&')

  if (!result.startsWith('<html>')) {
    result = `<html>${result}</html>`
  }

  return result
}
