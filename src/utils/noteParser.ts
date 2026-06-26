export interface ExtractedAttachment {
  url: string
  defaultExt: string
  tag: string
}

export function parseNoteAttachmentsAndText(html: string): {
  attachments: ExtractedAttachment[]
  plainText: string
} {
  const attachments: ExtractedAttachment[] = []

  const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      attachments.push({
        url: match[1],
        defaultExt: 'jpg',
        tag: match[0],
      })
    }
  }

  const attachmentRegex = /<div[^>]+url="([^">]+)"[^>]*>/g
  while ((match = attachmentRegex.exec(html)) !== null) {
    if (match[1]) {
      attachments.push({
        url: match[1],
        defaultExt: 'bin',
        tag: match[0],
      })
    }
  }

  const plainText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  return { attachments, plainText }
}

export function resolveAttachmentFilename(
  link: string,
  defaultExt: string,
  tagContent: string,
): string {
  const nameMatch = tagContent.match(/filename="([^">]+)"/i)
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].replace(/&amp;/g, '&')
  }
  let filename = `file_${Date.now()}`
  const urlFilename = link.split('/').pop()?.split('?')[0]
  if (urlFilename && urlFilename.length > 0) {
    filename = urlFilename
    const matchType = link.match(/type=([^&]+)/)
    if (!filename.includes('.') && matchType) {
      const mime = decodeURIComponent(matchType[1])
      if (mime.includes('png')) filename += '.png'
      else if (mime.includes('jpeg') || mime.includes('jpg')) filename += '.jpg'
      else if (mime.includes('video/mp4')) filename += '.mp4'
      else if (mime.includes('audio/x-m4a')) filename += '.m4a'
      else if (mime.includes('audio/mpeg')) filename += '.mp3'
    }
  }
  if (!filename.includes('.')) {
    filename += `.${defaultExt}`
  }
  return filename
}

export function formatAttachmentSize(size?: number): string {
  if (!size) return ''
  if (size < 1048576) {
    return `${(size / 1024).toFixed(0)} KB`
  }
  return `${(size / 1048576).toFixed(1)} MB`
}
