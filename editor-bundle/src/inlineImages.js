import { Fragment, Slice } from '@tiptap/pm/model'

const INLINE_IMAGE_SRC = /^(data:|blob:|webkit-fake-url:)/i

let pendingInlineSrcs = []

function stripInlineImages(fragment, found) {
  let changed = false
  const nodes = []
  fragment.forEach((node) => {
    if (node.type.name === 'image' && INLINE_IMAGE_SRC.test(node.attrs.src || '')) {
      found.push(node.attrs.src)
      changed = true
      return
    }
    if (!node.isLeaf && node.content.size) {
      const inner = stripInlineImages(node.content, found)
      if (inner !== node.content) {
        changed = true
        const kept = node.type.validContent(inner)
          ? node.copy(inner)
          : node.type.createAndFill(node.attrs, inner, node.marks)
        if (kept) nodes.push(kept)
        return
      }
    }
    nodes.push(node)
  })
  return changed ? Fragment.from(nodes) : fragment
}

function maxOpenDepth(fragment, side) {
  let depth = 0
  let node = side === 'start' ? fragment.firstChild : fragment.lastChild
  while (node && !node.isLeaf) {
    depth += 1
    node = side === 'start' ? node.firstChild : node.lastChild
  }
  return depth
}

export function transformPastedInlineImages(slice, view) {
  pendingInlineSrcs = []
  if (view.dragging) return slice
  const found = []
  const content = stripInlineImages(slice.content, found)
  if (!found.length) return slice
  pendingInlineSrcs = found
  if (!content.size) return Slice.empty
  return new Slice(
    content,
    Math.min(slice.openStart, maxOpenDepth(content, 'start')),
    Math.min(slice.openEnd, maxOpenDepth(content, 'end')),
  )
}

export function takePendingInlineImages() {
  const srcs = pendingInlineSrcs
  pendingInlineSrcs = []
  return srcs
}

export function imageFilesFrom(transfer) {
  if (!transfer) return []
  const files = transfer.files?.length
    ? Array.from(transfer.files)
    : Array.from(transfer.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter(Boolean)
  return files.filter((file) => file.type?.startsWith('image/'))
}

function readAsDataUri(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

async function srcToDataUri(src) {
  if (/^data:image\//i.test(src)) return src
  if (!/^blob:/i.test(src)) return null
  try {
    const blob = await (await fetch(src)).blob()
    return blob.type.startsWith('image/') ? readAsDataUri(blob) : null
  } catch {
    return null
  }
}

export async function collectPastedImages(files, srcs) {
  const fromFiles = await Promise.all(
    files.map(async (file) => ({ dataUri: await readAsDataUri(file), fileName: file.name || '' })),
  )
  const fromSrcs = await Promise.all(
    srcs.map(async (src) => ({ dataUri: await srcToDataUri(src), fileName: '' })),
  )
  return [...fromFiles, ...fromSrcs].filter((image) => image.dataUri)
}
