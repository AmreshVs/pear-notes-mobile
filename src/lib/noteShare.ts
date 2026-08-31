import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

import { downloadToCache } from '@/lib/noteAttachmentManager'
import { parseNoteAttachmentsAndText, resolveAttachmentFilename } from '@/utils/noteParser'

type ResolveHyperdriveUrl = (url: string) => string

type BuildNoteSharePayloadOptions = {
  title: string
  html: string
  resolveHyperdriveUrl?: ResolveHyperdriveUrl
}

export type NoteSharePayload = {
  message: string
  urls: string[]
}

function stripAttachmentLinks(text: string, resolveHyperdriveUrl?: ResolveHyperdriveUrl) {
  let plainText = text
  if (resolveHyperdriveUrl) {
    const serverBase = resolveHyperdriveUrl(HYPERDRIVE_URL_PREFIX)
    const serverRegex = new RegExp(
      `${serverBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`,
      'gi',
    )
    plainText = plainText.replace(serverRegex, '')
  }
  return plainText
    .replace(new RegExp(`${HYPERDRIVE_URL_PREFIX}[^\\s]*`, 'gi'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function buildNoteSharePayload({
  title,
  html,
  resolveHyperdriveUrl,
}: BuildNoteSharePayloadOptions): Promise<NoteSharePayload> {
  const { attachments, plainText: rawPlainText } = parseNoteAttachmentsAndText(html || '')
  const urls: string[] = []

  for (const attachment of attachments) {
    let cleanLink = attachment.url.replace(/&amp;/g, '&')
    if (resolveHyperdriveUrl) cleanLink = resolveHyperdriveUrl(cleanLink)
    try {
      const filename = resolveAttachmentFilename(cleanLink, attachment.defaultExt, attachment.tag)
      urls.push(await downloadToCache(cleanLink, filename))
    } catch {
      continue
    }
  }

  const plainText = stripAttachmentLinks(rawPlainText, resolveHyperdriveUrl)
  return { message: title ? `${title}\n\n${plainText}` : plainText, urls }
}
