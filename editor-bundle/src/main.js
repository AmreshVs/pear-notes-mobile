import { Editor, Extension, Node, mergeAttributes } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { buildNoteEditsTransaction } from '@pear-notes/core/store/services/localAiNoteEdits.js'
import langBash from 'highlight.js/lib/languages/bash'
import langCSS from 'highlight.js/lib/languages/css'
import langJS from 'highlight.js/lib/languages/javascript'
import langJSON from 'highlight.js/lib/languages/json'
import langPy from 'highlight.js/lib/languages/python'
import langTS from 'highlight.js/lib/languages/typescript'
import langXML from 'highlight.js/lib/languages/xml'
import { createLowlight } from 'lowlight'

const HYPERDRIVE_URL_PREFIX = 'http://hyperdrive'
const TAP_SLOP = 10
const SYNTHETIC_CLICK_WINDOW = 700
let hyperdriveServerAddress = null

function resolveHyperdriveUrl(url) {
  if (!url || !hyperdriveServerAddress || !url.startsWith(HYPERDRIVE_URL_PREFIX)) return url
  return url.replace(HYPERDRIVE_URL_PREFIX, hyperdriveServerAddress.replace(/\/$/, ''))
}

function isHyperdriveUrl(url) {
  return typeof url === 'string' && url.startsWith(HYPERDRIVE_URL_PREFIX)
}

const LOOPBACK_MEDIA_URL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//

function isDriveMediaUrl(url) {
  return isHyperdriveUrl(url) || (typeof url === 'string' && LOOPBACK_MEDIA_URL.test(url))
}

// Media pointing at the drive can fail to load for a moment: before the worklet
// has reported the server address, or while the blob server is reopening its
// socket after a suspend. The Android photo picker is a separate activity, so
// picking an image backgrounds the app, suspends the worklet and closes that
// socket; the upload then lands and the image is inserted before resume has
// finished. Every such element is registered here, retried on error and
// reloaded when the address lands.
const hyperdriveMedia = new Set()

function registerHyperdriveMedia(reload) {
  hyperdriveMedia.add(reload)
  return () => hyperdriveMedia.delete(reload)
}

function reloadHyperdriveMedia() {
  for (const reload of hyperdriveMedia) {
    try {
      reload()
    } catch (e) {
      console.error('Failed to reload drive media', e)
    }
  }
}

const MEDIA_RETRY_DELAYS = [300, 800, 1500, 3000, 5000]

function sendToRN(msg) {
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg))
    }
  } catch (_) {}
}

function blockEndAfter(doc, pos) {
  const $pos = doc.resolve(Math.max(0, Math.min(Number(pos) || 0, doc.content.size)))
  return $pos.depth > 0 ? $pos.after(1) : doc.content.size
}

function textLines(text) {
  return String(text ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function paragraphNodes(lines) {
  return lines.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] }))
}

const SELECTION_MEMORY_MS = 10000
let lastSelection = null

document.addEventListener('selectionchange', () => {
  setTimeout(() => {
    try {
      if (!editor || editor.isDestroyed) return
      const { from, to, empty } = editor.state.selection
      if (empty) return
      lastSelection = {
        from,
        to,
        text: editor.state.doc.textBetween(from, to, '\n', ' '),
        at: Date.now(),
      }
    } catch (_) {}
  }, 0)
})

const FONT_FAMILY_MAP = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  Outfit: "'Outfit', -apple-system, sans-serif",
  Lora: "'Lora', Georgia, 'Times New Roman', serif",
  Newsreader: "'Newsreader', Georgia, 'Times New Roman', serif",
  'IBM Plex Mono':
    "'IBM Plex Mono', 'SF Mono', SFMono-Regular, ui-monospace, 'Courier New', monospace",
  System: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Helvetica Neue', Arial, sans-serif",
  Serif: "Georgia, 'Times New Roman', serif",
  Mono: "'SF Mono', SFMono-Regular, ui-monospace, 'Courier New', monospace",
}

function applyFontSettings(fontSize, fontFamily) {
  const r = document.documentElement.style
  if (fontSize != null) {
    r.setProperty('--editor-font-size', `${fontSize}px`)
  }
  if (fontFamily != null) {
    const resolved = FONT_FAMILY_MAP[fontFamily] || FONT_FAMILY_MAP.System
    r.setProperty('--editor-font-family', resolved)
  }
}

const CODE_BLOCK_BACKGROUND = '#141414'
const CODE_BLOCK_TEXT = '#A8FF78'

function applyTheme(colors, isDark) {
  const r = document.documentElement.style
  r.setProperty('--c-text', colors.text)
  r.setProperty('--c-text-secondary', colors.textSecondary)
  const editorBg = colors.editorBackground || colors.background
  r.setProperty('--c-bg', editorBg)
  r.setProperty('--c-surface', colors.surface)
  r.setProperty('--c-attachment-bg', colors.attachmentSurface || colors.surface)
  r.setProperty('--c-attachment-inset', colors.attachmentInset || colors.background)
  r.setProperty('--c-primary', colors.primary)
  r.setProperty('--c-border', colors.border)
  document.body.style.background = editorBg

  r.setProperty('color-scheme', isDark ? 'dark' : 'light')
  r.setProperty('--c-highlight', isDark ? '#854D0E' : '#FEF08A')
  r.setProperty('--c-placeholder', isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)')
  r.setProperty('--c-code-bg', isDark ? '#1C1C1E' : '#E4E4EA')
  r.setProperty('--c-code', isDark ? '#A8FF78' : '#2D5016')
  r.setProperty('--c-codeblock-bg', CODE_BLOCK_BACKGROUND)
  r.setProperty('--c-codeblock-text', CODE_BLOCK_TEXT)
  r.setProperty('--hl-keyword', '#FF79C6')
  r.setProperty('--hl-string', '#F1FA8C')
  r.setProperty('--hl-comment', '#6272A4')
  r.setProperty('--hl-number', '#BD93F9')
  r.setProperty('--hl-fn', '#50FA7B')
  r.setProperty('--hl-var', '#FFB86C')
  r.setProperty('--hl-builtin', '#8BE9FD')
}

const lowlight = createLowlight()
lowlight.register('javascript', langJS)
lowlight.register('js', langJS)
lowlight.register('typescript', langTS)
lowlight.register('ts', langTS)
lowlight.register('python', langPy)
lowlight.register('py', langPy)
lowlight.register('css', langCSS)
lowlight.register('html', langXML)
lowlight.register('xml', langXML)
lowlight.register('bash', langBash)
lowlight.register('sh', langBash)
lowlight.register('json', langJSON)

// Tiptap's stock task-item node view toggles the checkbox with
// `editor.chain().focus()`, which focuses the contenteditable and pops the
// on-screen keyboard every time a box is ticked. On iOS the caret is placed
// straight from the touch sequence, so cancelling the synthesised mousedown is
// not enough - the tap has to be answered on touchend and the document updated
// by hand.
const TaskItemNoFocusSteal = TaskItem.extend({
  addNodeView() {
    const renderTaskItem = this.parent?.()
    if (!renderTaskItem) return renderTaskItem

    return (props) => {
      const nodeView = renderTaskItem(props)
      const label = nodeView?.dom?.querySelector?.('label')
      if (!label) return nodeView

      const input = label.querySelector('input[type="checkbox"]')
      const { editor, getPos } = props

      const applyChecked = (checked) => {
        if (!editor.isEditable || typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const { state } = editor.view
        const taskItem = state.doc.nodeAt(pos)
        if (!taskItem) return
        if (input) input.checked = checked
        editor.view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, { ...taskItem.attrs, checked }),
        )
      }

      const toggle = () => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const taskItem = editor.view.state.doc.nodeAt(pos)
        if (!taskItem) return
        applyChecked(!taskItem.attrs.checked)
      }

      let touchStartX = 0
      let touchStartY = 0
      let touchMoved = false
      let lastTouchToggle = 0

      label.addEventListener(
        'touchstart',
        (e) => {
          touchMoved = false
          touchStartX = e.touches[0].clientX
          touchStartY = e.touches[0].clientY
        },
        { passive: true },
      )

      label.addEventListener(
        'touchmove',
        (e) => {
          if (Math.hypot(e.touches[0].clientX - touchStartX, e.touches[0].clientY - touchStartY) > TAP_SLOP) {
            touchMoved = true
          }
        },
        { passive: true },
      )

      // Cancelling touchend suppresses the synthetic click WebKit would send
      // next, and with it the caret placement that raises the keyboard.
      label.addEventListener(
        'touchend',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (touchMoved) return
          lastTouchToggle = Date.now()
          toggle()
        },
        { passive: false },
      )

      label.addEventListener('touchcancel', () => {
        touchMoved = true
      })

      // Pointer path, for a trackpad or a mouse in the dev preview.
      label.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })

      label.addEventListener(
        'click',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (Date.now() - lastTouchToggle < SYNTHETIC_CLICK_WINDOW) return
          toggle()
        },
        true,
      )

      // Assistive technology activates the input itself, which does fire a
      // native change. Keep that working, minus the stock focus-stealing
      // handler further down the capture chain.
      label.addEventListener(
        'change',
        (e) => {
          e.stopPropagation()
          applyChecked(e.target.checked)
        },
        true,
      )

      return nodeView
    }
  },
})

const ImageWithSize = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), width: { default: null }, height: { default: null } }
  },
  addNodeView() {
    return ({ node, getPos, view }) => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText =
        'display: block; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-user-drag: none;'
      wrapper.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })
      wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })

      const blockDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      wrapper.addEventListener('dragstart', blockDrag)
      wrapper.addEventListener('drag', blockDrag)

      let longPressTimer = null
      let didLongPress = false
      let startX = 0,
        startY = 0

      wrapper.addEventListener(
        'touchstart',
        (e) => {
          startX = e.touches[0].clientX
          startY = e.touches[0].clientY
          didLongPress = false
          longPressTimer = setTimeout(() => {
            didLongPress = true
            const src = node.attrs.src
            if (src) {
              const rect = wrapper.getBoundingClientRect()
              window.editorBridge.imageLongPress(src, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              })
            }
          }, 500)
        },
        { passive: true },
      )
      wrapper.addEventListener('touchend', () => {
        clearTimeout(longPressTimer)
      })
      wrapper.addEventListener(
        'touchmove',
        (e) => {
          if (Math.hypot(e.touches[0].clientX - startX, e.touches[0].clientY - startY) > 10) {
            clearTimeout(longPressTimer)
          }
        },
        { passive: true },
      )
      wrapper.addEventListener('touchcancel', () => {
        clearTimeout(longPressTimer)
      })

      wrapper.addEventListener('click', () => {
        if (didLongPress) return
        const src = node.attrs.src
        if (!src) return
        const fileName = src.startsWith('data:')
          ? `image_${Date.now()}.jpg`
          : src.split('/').pop()?.split('?')[0] || `image_${Date.now()}.jpg`
        window.editorBridge.previewAttachment(src, fileName)
      })

      const inner = document.createElement('div')
      inner.style.cssText = 'display: inline-block; position: relative;'

      const img = document.createElement('img')

      let retryIndex = 0
      let retryTimer = null

      const loadImage = () => {
        const raw = node.attrs.src
        if (!raw) return
        const resolved = resolveHyperdriveUrl(raw)
        if (!resolved || (isHyperdriveUrl(resolved) && !hyperdriveServerAddress)) return
        clearTimeout(retryTimer)
        img.removeAttribute('src')
        img.src = resolved
      }

      img.addEventListener('load', () => {
        retryIndex = 0
        img.style.visibility = 'visible'
      })

      // Keep the broken-image glyph off screen while a retry is still pending;
      // it only shows once every attempt has failed.
      img.addEventListener('error', () => {
        if (!isDriveMediaUrl(node.attrs.src) || retryIndex >= MEDIA_RETRY_DELAYS.length) {
          img.style.visibility = 'visible'
          return
        }
        img.style.visibility = 'hidden'
        const delay = MEDIA_RETRY_DELAYS[retryIndex]
        retryIndex += 1
        clearTimeout(retryTimer)
        retryTimer = setTimeout(loadImage, delay)
      })

      const unregisterMedia = registerHyperdriveMedia(() => {
        if (!isDriveMediaUrl(node.attrs.src)) return
        retryIndex = 0
        loadImage()
      })

      loadImage()
      if (node.attrs.width)
        img.style.width =
          typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width
      if (node.attrs.height)
        img.style.height =
          typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height
      img.style.cssText +=
        'display: block; max-width: 100%; height: auto; border-radius: 8px; -webkit-user-drag: none;'
      const ratioW = parseFloat(node.attrs.width)
      const ratioH = parseFloat(node.attrs.height)
      if (ratioW > 0 && ratioH > 0) img.style.aspectRatio = `${ratioW} / ${ratioH}`
      img.draggable = false

      inner.appendChild(img)
      wrapper.appendChild(inner)
      wrapper.draggable = false
      return {
        dom: wrapper,
        stopEvent: () => true,
        ignoreMutation: () => true,
        destroy: () => {
          clearTimeout(retryTimer)
          clearTimeout(longPressTimer)
          unregisterMedia()
        },
      }
    }
  },
}).configure({ inline: false, allowBase64: true })

let contentTimer = null
// Serializing the document is the expensive half of a content change, so the
// debounce has to cover it too. Taking getHTML()/getText() up front — once per
// transaction — makes a burst of small edits (live dictation emits one every
// few hundred ms) pay for a full serialization per tick and then throw all but
// the last result away.
function scheduleContentChange(editor) {
  clearTimeout(contentTimer)
  contentTimer = setTimeout(() => {
    if (!editor || editor.isDestroyed) return
    sendToRN({ type: 'contentChange', html: editor.getHTML(), text: editor.getText() })
  }, 500)
}
function flushContentChange(html, text) {
  clearTimeout(contentTimer)
  sendToRN({ type: 'contentChange', html, text })
}

const CARET_AUTOSCROLL_ENABLED = true

const CARET_BOTTOM_OBSTRUCTION = 96
const CARET_SCROLL_MARGIN = 12
const CARET_RECHECK_DELAY_MS = 120
const CARET_RESCROLL_DELAY_MS = 250
const PROGRAMMATIC_SCROLL_GRACE_MS = 150
let programmaticScrollUntil = 0
let caretAutoscrollSuspended = false
let lastSelectionFrom = null

let caretBottomInset = CARET_BOTTOM_OBSTRUCTION
let hostBottomInset = null

function applyBottomInset() {
  if (!hostBottomInset) return
  // Everything below is measured in *layout* viewport coordinates, which is what
  // getBoundingClientRect returns and what window.innerHeight reports. visualViewport is
  // deliberately not consulted: WKWebView does not shrink it for the keyboard the way
  // Safari does, so anything derived from it is unreliable here.
  const obstructed = hostBottomInset.keyboardHeight + hostBottomInset.toolbarHeight
  caretBottomInset = obstructed
  document.documentElement.style.setProperty('--bottom-inset', `${obstructed}px`)
}

// For a range selection the only edge worth keeping clear of the keyboard is the one the user is
// moving, which is the DOM focus. range.getBoundingClientRect() is the union of both edges, so its
// bottom sits at the far end of the selection and a correction measured from it scrolls away from
// the edge being dragged rather than towards it.
function getSelectionFocusRect(selection) {
  if (!selection.focusNode) return null
  try {
    const focusRange = document.createRange()
    focusRange.setStart(selection.focusNode, selection.focusOffset)
    focusRange.collapse(true)
    const focusRect = focusRange.getBoundingClientRect()
    if (focusRect && (focusRect.height || focusRect.top || focusRect.bottom)) return focusRect
  } catch (_) {}
  return null
}

function getCaretRect() {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!range.collapsed) {
    const focusRect = getSelectionFocusRect(selection)
    if (focusRect) return focusRect
  }
  const rangeRect = range.getBoundingClientRect()
  if (rangeRect && (rangeRect.height || rangeRect.top || rangeRect.bottom)) return rangeRect
  let node = range.startContainer
  if (node && node.nodeType === 3) node = node.parentElement
  return node && node.getBoundingClientRect ? node.getBoundingClientRect() : null
}

function scrollDocumentToTop() {
  programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS
  caretAutoscrollSuspended = false
  window.scrollTo(0, 0)
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}

function scrollEditorBy(delta) {
  programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS
  const scrollers = [document.scrollingElement, document.documentElement, document.body]
  for (const scroller of scrollers) {
    if (scroller && scroller.scrollHeight - scroller.clientHeight > 1) {
      scroller.scrollTop += delta
      return
    }
  }
  window.scrollBy(0, delta)
}

function adjustCaretScroll() {
  if (!CARET_AUTOSCROLL_ENABLED) return
  if (caretAutoscrollSuspended) return
  if (!editor || !editor.isFocused) return
  const rect = getCaretRect()
  if (!rect) return
  // rect is layout-viewport relative, so compare against window.innerHeight. caretBottomInset
  // already covers the keyboard plus the floating toolbar above it.
  const overflow = rect.bottom - (window.innerHeight - caretBottomInset)
  if (overflow <= 0) return
  // A real correction only ever nudges the caret out from behind the keyboard, so it is
  // bounded by the obstructed height. Anything larger means the caret is off-screen entirely
  // because the view was scrolled away from it, and scrolling back would be a jump, not a nudge.
  if (overflow > window.innerHeight) return
  scrollEditorBy(overflow + CARET_SCROLL_MARGIN)
}

let caretScrollFrame = null
let caretScrollTimer = null

// A correction is only ever queued in response to a real change — the document, the caret
// position, or the keyboard. Plain scrolling triggers nothing, and a scroll also cancels
// anything already pending.
//
// Scrolling away from the caret additionally *suspends* corrections. Without that, any later
// trigger that is not a real edit — a visualViewport resize, the host re-sending the keyboard
// inset — would find the caret far below the viewport and yank the reader back down. Typing,
// moving the caret, or focusing the editor resumes it, which is what keeps the keyboard-open
// and Enter-at-the-bottom cases working.
function cancelPendingCaretScroll() {
  if (caretScrollFrame) {
    cancelAnimationFrame(caretScrollFrame)
    caretScrollFrame = null
  }
  clearTimeout(caretScrollTimer)
}

function resumeCaretAutoscroll() {
  caretAutoscrollSuspended = false
}

let dictation = null
let dictationCaretEl = null

function moveDictationCaret() {
  if (!dictation || !editor || editor.isDestroyed) return
  if (!dictationCaretEl) {
    dictationCaretEl = document.createElement('div')
    dictationCaretEl.className = 'dictation-caret'
    document.body.appendChild(dictationCaretEl)
  }
  try {
    const pos = Math.min(dictation.from + dictation.length, editor.state.doc.content.size)
    const coords = editor.view.coordsAtPos(pos)
    dictationCaretEl.style.left = coords.left + 'px'
    dictationCaretEl.style.top = coords.top + 'px'
    dictationCaretEl.style.height = Math.max(14, coords.bottom - coords.top) + 'px'
  } catch (_) {}
}

function removeDictationCaret() {
  if (!dictationCaretEl) return
  dictationCaretEl.remove()
  dictationCaretEl = null
}

function beginDictation() {
  if (!editor || editor.isDestroyed) return
  const { doc, selection } = editor.state
  const size = doc.content.size
  const raw = selection.empty ? selection.from : selection.to
  const at = Number.isFinite(raw) && raw > 0 ? Math.min(raw, size) : size
  const before = at > 0 ? doc.textBetween(Math.max(0, at - 1), at) : ''
  dictation = { from: at, length: 0, prefix: before.trim() ? ' ' : '' }
  moveDictationCaret()
  keepCaretVisible()
}

function dictationRange() {
  const size = editor.state.doc.content.size
  const from = Math.max(0, Math.min(dictation.from, size))
  const to = Math.max(from, Math.min(from + dictation.length, size))
  return { from, to }
}

function keepCaretVisible() {
  if (!caretScrollFrame) {
    caretScrollFrame = requestAnimationFrame(() => {
      caretScrollFrame = null
      adjustCaretScroll()
    })
  }
  clearTimeout(caretScrollTimer)
  caretScrollTimer = setTimeout(adjustCaretScroll, CARET_RECHECK_DELAY_MS)
}

window.addEventListener('scroll', () => dictation && moveDictationCaret(), {
  passive: true,
  capture: true,
})

window.addEventListener(
  'scroll',
  () => {
    if (Date.now() < programmaticScrollUntil) return
    caretAutoscrollSuspended = true
    cancelPendingCaretScroll()
  },
  { passive: true, capture: true },
)

let styleTimer = null
let lastStyleJSON = ''
function hasTextSelection(ed) {
  // A kept range still counts: the toolbar has to keep offering Edit, and the
  // AI button passes this flag back as `allowRemembered` when it reopens.
  if (keptSelectionRange(ed.state)) return true
  const { from, to, empty } = ed.state.selection
  if (empty) return false
  return ed.state.doc.textBetween(from, to, '\n', ' ').trim().length > 0
}

function broadcastStyleState(ed) {
  if (styleTimer) return
  styleTimer = requestAnimationFrame(() => {
    styleTimer = null
    const state = {
      bold: { isActive: ed.isActive('bold') },
      italic: { isActive: ed.isActive('italic') },
      underline: { isActive: ed.isActive('underline') },
      strike: { isActive: ed.isActive('strike') },
      h1: { isActive: ed.isActive('heading', { level: 1 }) },
      h2: { isActive: ed.isActive('heading', { level: 2 }) },
      h3: { isActive: ed.isActive('heading', { level: 3 }) },
      unorderedList: { isActive: ed.isActive('bulletList') },
      orderedList: { isActive: ed.isActive('orderedList') },
      checkboxList: { isActive: ed.isActive('taskList') },
      blockQuote: { isActive: ed.isActive('blockquote') },
      codeBlock: { isActive: ed.isActive('codeBlock') },
      link: { isActive: ed.isActive('link') },
      highlight: { isActive: ed.isActive('highlight') },
      subscript: { isActive: ed.isActive('subscript') },
      superscript: { isActive: ed.isActive('superscript') },
      alignLeft: { isActive: ed.isActive({ textAlign: 'left' }) },
      alignCenter: { isActive: ed.isActive({ textAlign: 'center' }) },
      alignRight: { isActive: ed.isActive({ textAlign: 'right' }) },
      alignJustify: { isActive: ed.isActive({ textAlign: 'justify' }) },
      undo: { isActive: ed.can().undo() },
      redo: { isActive: ed.can().redo() },
      hasSelection: { isActive: hasTextSelection(ed) },
    }
    const json = JSON.stringify(state)
    if (json === lastStyleJSON) return
    lastStyleJSON = json
    sendToRN({ type: 'styleState', state })
  })
}

function createAudioPlayerDOM(src, titleText, initialDuration, fileExt) {
  const container = document.createElement('div')
  container.className = 'audio-player-container'
  container.style.cssText =
    'display: flex; flex-direction: column; background: var(--c-attachment-bg); border: 1px solid var(--c-border); border-radius: 12px; transition: all 0.3s ease; position: relative; overflow: hidden; margin: 12px 0; font-family: sans-serif; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;'
  container.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })

  const topRow = document.createElement('div')
  topRow.style.cssText =
    'display: flex; align-items: center; gap: 16px; padding: 16px; width: 100%; box-sizing: border-box;'

  const playBtn = document.createElement('button')
  playBtn.className = 'play-btn'
  playBtn.style.cssText =
    'flex-shrink: 0; width: 48px; height: 48px; border-radius: 24px; background-color: var(--c-primary); display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: transform 0.2s; padding: 0;'

  const playIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none" style="margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
  const pauseIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'

  playBtn.innerHTML = playIcon

  const audio = document.createElement('audio')
  audio.preload = 'metadata'
  audio.src = resolveHyperdriveUrl(src) || ''
  registerHyperdriveMedia(() => {
    if (!isHyperdriveUrl(src) || audio.readyState !== 0) return
    audio.src = resolveHyperdriveUrl(src) || ''
  })
  audio.style.display = 'none'
  playBtn.appendChild(audio)

  const info = document.createElement('div')
  info.style.cssText = 'flex: 1; min-width: 0;'

  const titleTextSafe = titleText || 'Audio Recording'
  const titleParts = titleTextSafe.split('.')
  const titleBase = titleParts.length > 1 ? titleParts.slice(0, -1).join('.') : titleTextSafe
  const titleExt = titleParts.length > 1 ? '.' + titleParts[titleParts.length - 1] : ''

  const title = document.createElement('div')
  title.style.cssText =
    'display: flex; font-weight: 600; font-size: 14px; color: var(--c-text); margin: 0 0 4px 0; overflow: hidden; width: 100%;'

  const titleBaseSpan = document.createElement('span')
  titleBaseSpan.style.cssText =
    'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;'
  titleBaseSpan.textContent = titleBase

  const titleExtSpan = document.createElement('span')
  titleExtSpan.style.cssText = 'white-space: nowrap; flex-shrink: 0;'
  titleExtSpan.textContent = titleExt

  title.appendChild(titleBaseSpan)
  title.appendChild(titleExtSpan)

  const meta = document.createElement('div')
  meta.style.cssText = 'display: flex; align-items: center; gap: 8px;'

  const badge = document.createElement('span')
  badge.style.cssText =
    'font-size: 12px; font-weight: 500; color: var(--c-text-secondary); background-color: var(--c-attachment-inset); padding: 2px 8px; border-radius: 6px;'
  badge.textContent = fileExt || 'AUDIO'

  const dotSpan = document.createElement('span')
  dotSpan.style.cssText = 'font-size: 12px; color: var(--c-text-secondary);'
  dotSpan.textContent = '•'

  const timeLabel = document.createElement('span')
  timeLabel.style.cssText =
    'font-size: 12px; color: var(--c-text-secondary); font-family: monospace;'

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs === Infinity) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  let durationObj = initialDuration || 0
  let currentObj = 0
  timeLabel.textContent = `${formatTime(currentObj)} / ${formatTime(durationObj)}`

  meta.appendChild(badge)
  meta.appendChild(dotSpan)
  meta.appendChild(timeLabel)

  info.appendChild(title)
  info.appendChild(meta)

  topRow.appendChild(playBtn)
  topRow.appendChild(info)

  const actionsContainer = document.createElement('div')
  actionsContainer.style.cssText = 'display: flex; align-items: center; gap: 6px;'
  topRow.appendChild(actionsContainer)

  const bottomRow = document.createElement('div')
  bottomRow.style.cssText = 'padding: 0 16px 16px 16px; width: 100%; box-sizing: border-box;'

  const sliderTrack = document.createElement('div')
  sliderTrack.style.cssText =
    'position: relative; height: 6px; background-color: var(--c-attachment-inset); width: 100%; border-radius: 3px;'

  const sliderFill = document.createElement('div')
  sliderFill.style.cssText =
    'position: absolute; top: 0; left: 0; height: 100%; background-color: var(--c-primary); border-radius: 3px; width: 0%; pointer-events: none;'

  const sliderThumb = document.createElement('div')
  sliderThumb.style.cssText =
    'position: absolute; top: 50%; left: 0%; width: 12px; height: 12px; background-color: white; border: 2px solid var(--c-primary); border-radius: 6px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 2;'

  const rangeInput = document.createElement('input')
  rangeInput.type = 'range'
  rangeInput.min = '0'
  rangeInput.max = durationObj || 100
  rangeInput.step = 'any'
  rangeInput.value = '0'
  rangeInput.style.cssText =
    'position: absolute; top: -6px; left: 0; width: 100%; height: 18px; opacity: 0; cursor: pointer; z-index: 3; margin: 0;'

  sliderTrack.appendChild(sliderFill)
  sliderTrack.appendChild(sliderThumb)
  sliderTrack.appendChild(rangeInput)
  bottomRow.appendChild(sliderTrack)

  container.appendChild(topRow)
  container.appendChild(bottomRow)

  let isPlaying = false

  const updateProgress = () => {
    durationObj = audio.duration && audio.duration !== Infinity ? audio.duration : durationObj
    currentObj = audio.currentTime
    timeLabel.textContent = `${formatTime(currentObj)} / ${formatTime(durationObj)}`
    rangeInput.max = durationObj || 100
    rangeInput.value = currentObj

    const pct = durationObj > 0 ? (currentObj / durationObj) * 100 : 0
    sliderFill.style.width = `${pct}%`
    sliderThumb.style.left = `${pct}%`
  }

  audio.addEventListener('timeupdate', updateProgress)
  audio.addEventListener('loadedmetadata', updateProgress)
  audio.addEventListener('ended', () => {
    isPlaying = false
    playBtn.innerHTML = playIcon
    playBtn.appendChild(audio)
    audio.currentTime = 0
    updateProgress()
  })

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (isPlaying) {
      audio.pause()
      playBtn.innerHTML = playIcon
    } else {
      audio.play()
      playBtn.innerHTML = pauseIcon
    }
    playBtn.appendChild(audio)
    isPlaying = !isPlaying
  })

  rangeInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value)
    audio.currentTime = val
    updateProgress()
  })

  rangeInput.addEventListener('mouseenter', () => {
    sliderThumb.style.opacity = '1'
  })
  rangeInput.addEventListener('mouseleave', () => {
    sliderThumb.style.opacity = '0'
  })

  const stopEvent = (e) => e.stopPropagation()
  playBtn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
  })
  playBtn.addEventListener('touchstart', stopEvent)
  rangeInput.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
  })
  rangeInput.addEventListener('touchstart', stopEvent)

  return { container, actionsContainer }
}

let _attachmentIdCounter = 0

const PDF_MIME_TYPE = 'application/pdf'
const PDF_PREVIEW_MAX_HEIGHT = 220

function isPdfAttachment(fileName, fileType) {
  if (fileType === PDF_MIME_TYPE) return true
  return typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')
}

function createPdfPreviewDOM() {
  const wrapper = document.createElement('div')
  wrapper.className = 'pdf-preview'
  wrapper.style.cssText =
    'display: none; align-items: center; justify-content: center; padding: 12px 12px 0 12px; background: transparent;'

  const image = document.createElement('img')
  image.className = 'pdf-preview-image'
  image.draggable = false
  image.style.cssText =
    'display: block; max-width: 100%; max-height: ' +
    PDF_PREVIEW_MAX_HEIGHT +
    'px; width: auto; height: auto; border-radius: 8px; border: 1px solid var(--c-border);'
  wrapper.appendChild(image)

  return wrapper
}

function applyPdfThumbnail(el, thumbnail, pageCount, pageCountLabel) {
  const wrapper = el.querySelector('.pdf-preview')
  if (!wrapper) return
  const image = wrapper.querySelector('.pdf-preview-image')
  if (image && thumbnail) {
    image.src = thumbnail
    wrapper.style.display = 'flex'
  }
  if (!pageCount || !pageCountLabel) return
  const meta = el.querySelector('.attachment-meta')
  if (!meta || meta.querySelector('.attachment-pages')) return
  const dot = document.createElement('span')
  dot.className = 'attachment-pages-dot'
  dot.style.cssText = 'font-size: 12px; color: var(--c-text-secondary);'
  dot.textContent = '\u2022'
  const pages = document.createElement('span')
  pages.className = 'attachment-pages'
  pages.style.cssText = 'font-size: 12px; color: var(--c-text-secondary);'
  pages.textContent = pageCountLabel
  meta.appendChild(dot)
  meta.appendChild(pages)
}

const FileAttachment = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      fileName: { default: null },
      fileSize: { default: null },
      fileType: { default: null },
      fileData: { default: null },
      url: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-file-attachment]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-file-attachment': '' })]
  },
  addNodeView() {
    return ({ node, view, getPos }) => {
      const isVideo = node.attrs.fileType?.startsWith('video/')
      const isAudio = node.attrs.fileType?.startsWith('audio/')
      const isPdf = isPdfAttachment(node.attrs.fileName, node.attrs.fileType)

      if (isAudio) {
        const parts = (node.attrs.fileName || '').split('.')
        const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'AUDIO'
        const player = createAudioPlayerDOM(
          node.attrs.url || node.attrs.fileData,
          node.attrs.fileName,
          0,
          ext,
        )
        const dom = player.container
        dom.setAttribute('data-file-attachment', '')

        let longPressTimer = null
        let startX = 0,
          startY = 0
        dom.addEventListener(
          'touchstart',
          (e) => {
            startX = e.touches[0].clientX
            startY = e.touches[0].clientY
            longPressTimer = setTimeout(() => {
              const rect = dom.getBoundingClientRect()
              const attachmentId = dom.dataset.attachmentId || ''
              window.editorBridge.attachmentLongPress(
                node.attrs.url || node.attrs.fileData,
                node.attrs.fileName,
                { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                attachmentId,
              )
            }, 500)
          },
          { passive: true },
        )
        dom.addEventListener('touchend', () => clearTimeout(longPressTimer))
        dom.addEventListener('touchmove', (e) => {
          if (Math.hypot(e.touches[0].clientX - startX, e.touches[0].clientY - startY) > 10) {
            clearTimeout(longPressTimer)
          }
        })

        dom.style.userSelect = 'none'
        dom.style.webkitUserSelect = 'none'
        dom.addEventListener('mousedown', (e) => {
          e.preventDefault()
        })
        dom.addEventListener('contextmenu', (e) => {
          e.preventDefault()
        })

        return {
          dom,
          stopEvent: () => true,
          ignoreMutation: () => true,
        }
      }

      const dom = document.createElement('div')
      dom.setAttribute('data-file-attachment', '')
      dom.dataset.url = node.attrs.url || ''
      dom.dataset.attachmentId = 'att-' + ++_attachmentIdCounter
      dom.className = 'file-attachment-container'
      dom.style.cssText =
        'display: flex; flex-direction: column; margin: 12px 0; background: var(--c-attachment-bg); border: 1px solid var(--c-border); border-radius: 12px; position: relative; overflow: hidden; font-family: sans-serif; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer;'

      const loadingOverlay = document.createElement('div')
      loadingOverlay.className = 'attachment-loading-overlay'
      loadingOverlay.style.cssText =
        'display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.35); border-radius: 12px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; z-index: 10;'
      const spinner = document.createElement('div')
      spinner.style.cssText =
        'width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: attachment-spin 0.6s linear infinite;'
      loadingOverlay.appendChild(spinner)
      const loadingPercent = document.createElement('div')
      loadingPercent.className = 'attachment-loading-percent'
      loadingPercent.style.cssText =
        'display: none; color: #fff; font-size: 12px; font-weight: 600; font-family: sans-serif;'
      loadingOverlay.appendChild(loadingPercent)
      dom.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })
      dom.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })
      dom.addEventListener('click', (e) => {
        if (window.didFileAttachmentLongPress) return
        if (!e.target.closest('button')) {
          window.editorBridge.previewAttachment(
            node.attrs.url,
            node.attrs.fileName,
            dom.dataset.attachmentId,
          )
        }
      })

      const preview = isPdf ? createPdfPreviewDOM() : null
      if (preview) {
        dom.dataset.pdfPreview = ''
        dom.appendChild(preview)
      }

      const content = document.createElement('div')
      content.style.cssText =
        'position: relative; display: flex; align-items: center; gap: 16px; padding: 16px;'

      const iconContainer = document.createElement('div')
      iconContainer.style.cssText =
        'flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px; background-color: var(--c-attachment-inset); display: flex; align-items: center; justify-content: center; color: var(--c-text-secondary); border: 1px solid var(--c-border);'
      const iconType = isVideo
        ? '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'
        : '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'
      iconContainer.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconType}</svg>`
      content.appendChild(iconContainer)

      const info = document.createElement('div')
      info.style.cssText = 'flex: 1; min-width: 0;'

      const fileName = node.attrs.fileName || 'Untitled File'
      const parts = fileName.split('.')
      const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
      const baseName = parts.length > 1 ? parts.slice(0, -1).join('.') : fileName
      const extWithDot = parts.length > 1 ? '.' + parts[parts.length - 1] : ''

      const label = document.createElement('div')
      label.style.cssText =
        'display: flex; font-weight: 600; font-size: 14px; color: var(--c-text); margin: 0 0 4px 0; overflow: hidden; width: 100%;'

      const baseSpan = document.createElement('span')
      baseSpan.style.cssText =
        'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;'
      baseSpan.textContent = baseName

      const extSpanTail = document.createElement('span')
      extSpanTail.style.cssText = 'white-space: nowrap; flex-shrink: 0;'
      extSpanTail.textContent = extWithDot

      label.appendChild(baseSpan)
      label.appendChild(extSpanTail)
      info.appendChild(label)

      const meta = document.createElement('div')
      meta.className = 'attachment-meta'
      meta.style.cssText = 'display: flex; align-items: center; gap: 8px;'

      const extSpan = document.createElement('span')
      extSpan.style.cssText =
        'font-size: 12px; font-weight: 500; color: var(--c-text-secondary); background-color: var(--c-attachment-inset); padding: 2px 8px; border-radius: 6px;'
      extSpan.textContent = ext
      meta.appendChild(extSpan)

      if (node.attrs.fileSize) {
        const dotSpan = document.createElement('span')
        dotSpan.style.cssText = 'font-size: 12px; color: var(--c-text-secondary);'
        dotSpan.textContent = '•'
        meta.appendChild(dotSpan)

        const sizeSpan = document.createElement('span')
        sizeSpan.style.cssText = 'font-size: 12px; color: var(--c-text-secondary);'
        const size = node.attrs.fileSize
        sizeSpan.textContent =
          size < 1024
            ? `${size} B`
            : size < 1048576
              ? `${(size / 1024).toFixed(1)} KB`
              : `${(size / 1048576).toFixed(1)} MB`
        meta.appendChild(sizeSpan)
      }
      info.appendChild(meta)

      const actions = document.createElement('div')
      actions.style.cssText = 'display: flex; align-items: center; gap: 6px;'

      let longPressTimer = null
      let startX = 0,
        startY = 0
      dom.addEventListener(
        'touchstart',
        (e) => {
          startX = e.touches[0].clientX
          startY = e.touches[0].clientY
          window.didFileAttachmentLongPress = false
          longPressTimer = setTimeout(() => {
            window.didFileAttachmentLongPress = true
            const rect = dom.getBoundingClientRect()
            const attachmentId = dom.dataset.attachmentId || ''
            window.editorBridge.attachmentLongPress(
              node.attrs.url || node.attrs.fileData,
              node.attrs.fileName,
              { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              attachmentId,
            )
          }, 500)
        },
        { passive: true },
      )
      dom.addEventListener('touchend', () => clearTimeout(longPressTimer))
      dom.addEventListener('touchmove', (e) => {
        if (Math.hypot(e.touches[0].clientX - startX, e.touches[0].clientY - startY) > 10) {
          clearTimeout(longPressTimer)
        }
      })

      const genericBtnStyle =
        'padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; background: transparent; border: none;'

      if (isVideo) {
        const playBtn = document.createElement('button')
        playBtn.className = 'play-btn'
        playBtn.style.cssText = genericBtnStyle
        playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--c-text-secondary)"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
        playBtn.addEventListener('mousedown', (e) => {
          e.preventDefault()
          e.stopPropagation()
        })
        playBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })
        playBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          window.editorBridge.previewAttachment(
            node.attrs.url,
            node.attrs.fileName,
            dom.dataset.attachmentId,
          )
        }
        actions.appendChild(playBtn)
      }
      content.appendChild(info)
      content.appendChild(actions)
      dom.appendChild(content)
      dom.appendChild(loadingOverlay)

      if (preview) {
        window.editorBridge.requestPdfThumbnail(
          node.attrs.url,
          node.attrs.fileName,
          dom.dataset.attachmentId,
        )
      }

      return {
        dom,
        stopEvent: () => true,
        ignoreMutation: () => true,
      }
    }
  },
})

const AudioAttachment = Node.create({
  name: 'audioAttachment',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      audioData: { default: null },
      duration: { default: 0 },
      url: { default: null },
      fileName: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-audio-attachment]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-audio-attachment': '' })]
  },
  addNodeView() {
    return ({ node, view, getPos }) => {
      const parts = (node.attrs.fileName || '').split('.')
      const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'AUDIO'
      const player = createAudioPlayerDOM(
        node.attrs.url || node.attrs.audioData,
        node.attrs.fileName,
        node.attrs.duration,
        ext,
      )
      const dom = player.container
      dom.setAttribute('data-audio-attachment', '')

      let longPressTimer = null
      let startX = 0,
        startY = 0
      dom.addEventListener(
        'touchstart',
        (e) => {
          startX = e.touches[0].clientX
          startY = e.touches[0].clientY
          longPressTimer = setTimeout(() => {
            const rect = dom.getBoundingClientRect()
            const attachmentId = dom.dataset.attachmentId || ''
            window.editorBridge.attachmentLongPress(
              node.attrs.url || node.attrs.audioData,
              node.attrs.fileName,
              { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              attachmentId,
            )
          }, 500)
        },
        { passive: true },
      )
      dom.addEventListener('touchend', () => clearTimeout(longPressTimer))
      dom.addEventListener('touchmove', (e) => {
        if (Math.hypot(e.touches[0].clientX - startX, e.touches[0].clientY - startY) > 10) {
          clearTimeout(longPressTimer)
        }
      })

      dom.style.userSelect = 'none'
      dom.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })

      return {
        dom,
        stopEvent: () => true,
        ignoreMutation: () => true,
      }
    }
  },
})

let editor = null
let currentNoteId = null


function clearEditorHistory() {
  if (!editor) return
  const { state, view } = editor
  const historyPlugin = state.plugins.find(
    (plugin) => typeof plugin.key === 'string' && plugin.key.startsWith('history$'),
  )
  if (!historyPlugin || !historyPlugin.spec || !historyPlugin.spec.state) return
  view.dispatch(
    state.tr.setMeta(historyPlugin, { historyState: historyPlugin.spec.state.init({}, state) }),
  )
}


// --- Kept selection -------------------------------------------------------
//
// Opening the AI tools has to drop the real selection: leaving one live keeps
// the iOS grab handles and the keyboard on screen over the sheet. That used to
// leave the user with no idea what the tool was about to act on, so the range
// is re-drawn as a decoration instead. It survives until the user taps
// somewhere else in the note, which is also what cancels it.
const keptSelectionKey = new PluginKey('keptSelection')

const KeptSelection = Extension.create({
  name: 'keptSelection',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: keptSelectionKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const meta = tr.getMeta(keptSelectionKey)
            if (meta === null) return DecorationSet.empty
            if (meta) {
              const from = Math.max(0, Math.min(meta.from, tr.doc.content.size))
              const to = Math.max(from, Math.min(meta.to, tr.doc.content.size))
              if (to === from) return DecorationSet.empty
              return DecorationSet.create(tr.doc, [
                Decoration.inline(from, to, { class: 'kept-selection' }),
              ])
            }
            return value.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return keptSelectionKey.getState(state)
          },
          handleDOMEvents: {
            // Any tap in the note cancels it. pointerdown fires before the
            // selection moves, so the range is still the one being dismissed.
            pointerdown(view) {
              if (!keptSelectionRange(view.state)) return false
              clearKeptSelection(view)
              return false
            },
            // Belt and braces for WebKit, where pointer events have been the
            // flakier of the two. Clearing twice is a no-op.
            touchstart(view) {
              if (!keptSelectionRange(view.state)) return false
              clearKeptSelection(view)
              return false
            },
          },
        },
      }),
    ]
  },
})

function keptSelectionRange(state) {
  const decorations = keptSelectionKey.getState(state)
  if (!decorations) return null
  const found = decorations.find()
  return found.length > 0 ? { from: found[0].from, to: found[0].to } : null
}

function clearKeptSelection(view) {
  if (!view) return
  lastSelection = null
  view.dispatch(view.state.tr.setMeta(keptSelectionKey, null))
  sendToRN({ type: 'keptSelectionCleared' })
}

function deleteEmptyFirstLine(editor) {
  const { state, view } = editor
  const { selection, doc } = state
  const { $from, empty } = selection
  if (!empty || $from.depth !== 1 || $from.index(0) !== 0 || doc.childCount < 2) return false
  const block = $from.parent
  if (block.type.name !== 'paragraph' || block.content.size > 0) return false
  const tr = state.tr.delete(0, block.nodeSize)
  tr.setSelection(Selection.near(tr.doc.resolve(0), 1))
  view.dispatch(tr.scrollIntoView())
  return true
}

// ProseMirror's joinBackward has nothing to join into at the start of the doc, so an empty
// first line above an image or attachment could never be removed with backspace.
const EmptyFirstLine = Extension.create({
  name: 'emptyFirstLine',
  priority: 1000,
  addKeyboardShortcuts() {
    return { Backspace: () => deleteEmptyFirstLine(this.editor) }
  },
})

function createEditorSession(html) {
  const commonExtensions = [
    EmptyFirstLine,
    Underline,
    Strike,
    TaskList,
    TaskItemNoFocusSteal.configure({ nested: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({ openOnClick: false }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Placeholder.configure({ placeholder: 'Start writing...' }),
    ImageWithSize,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
    FileAttachment,
    AudioAttachment,
    KeptSelection,
  ]

  editor = new Editor({
    element: document.querySelector('#editor'),
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        strike: false,
        codeBlock: false,
      }),
      ...commonExtensions,
    ],
    content: html || '',

    onUpdate: ({ editor }) => {
      scheduleContentChange(editor)
      broadcastStyleState(editor)
      resumeCaretAutoscroll()
      keepCaretVisible()
    },
    onSelectionUpdate: ({ editor }) => {
      broadcastStyleState(editor)
      // WebKit fires selectionchange while a focused contenteditable is scrolled, which would
      // otherwise drag the view back to the caret. Only react when the caret actually moved.
      const from = editor.state.selection.from
      if (from === lastSelectionFrom) return
      lastSelectionFrom = from
      // A range selection means the user is working the drag handles, and correcting the scroll
      // fights them. Dragging the start handle up moves `from`, which used to resume autoscroll
      // and pull the view back down to the far end of the range, so the selection could never be
      // extended past the top of the screen. The platform already scrolls a handle drag that
      // reaches a viewport edge.
      if (!editor.state.selection.empty) return
      resumeCaretAutoscroll()
      keepCaretVisible()
    },
    onTransaction: ({ editor }) => broadcastStyleState(editor),
    onFocus: () => {
      resumeCaretAutoscroll()
      sendToRN({ type: 'focus' })
    },
    onBlur: ({ editor }) => {
      flushContentChange(editor.getHTML(), editor.getText())
      sendToRN({ type: 'blur' })
    },
  })
}

window.editorBridge = {
  openAttachment(url, fileName) {
    sendToRN({ type: 'openAttachment', url, fileName })
  },
  previewAttachment(url, fileName, attachmentId) {
    if (url) sendToRN({ type: 'previewAttachment', url, fileName, attachmentId })
  },
  deleteAttachment(url) {
    if (url) sendToRN({ type: 'deleteAttachment', url })
  },
  imageLongPress(src, rect) {
    if (src) sendToRN({ type: 'imageLongPress', src, rect })
  },
  attachmentLongPress(url, fileName, rect, attachmentId) {
    if (url) sendToRN({ type: 'attachmentLongPress', url, fileName, rect, attachmentId })
  },
  requestPdfThumbnail(url, fileName, attachmentId) {
    if (url) sendToRN({ type: 'requestPdfThumbnail', url, fileName, attachmentId })
  },
  handleMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const ch = () => editor.chain().focus(null, { scrollIntoView: false })

    switch (msg.type) {
      case 'setHyperdriveAddress': {
        const nextAddress = msg.address || null
        const changed = nextAddress !== hyperdriveServerAddress
        hyperdriveServerAddress = nextAddress
        if (changed && nextAddress) reloadHyperdriveMedia()
        break
      }

      case 'init': {
        if (msg.hyperdriveAddress) hyperdriveServerAddress = msg.hyperdriveAddress
        if (!editor) {
          createEditorSession(msg.html)
          currentNoteId = msg.noteId
        }

        applyTheme(msg.colors, msg.isDark)
        applyFontSettings(msg.fontSize, msg.fontFamily)
        if (msg.safeAreaTop != null) {
          document.documentElement.style.setProperty('--title-top-pad', `${msg.safeAreaTop}px`)
        }
        {
          const titleEl = document.getElementById('note-title')
          if (titleEl && msg.title != null) titleEl.value = msg.title
        }
        sendToRN({ type: 'initialized' })
        break
      }

      case 'loadNote': {
        currentNoteId = msg.noteId
        if (msg.html != null) editor.commands.setContent(msg.html, false)
        // Undo history is per note: the editor is reused across notes, and loading one
        // is itself an undoable step, so undo would otherwise walk back into the note
        // that was open before.
        clearEditorHistory()
        // The WebView is reused across notes, so a freshly loaded note would otherwise
        // inherit the previous note's scroll offset. Reset once layout has settled.
        requestAnimationFrame(scrollDocumentToTop)
        break
      }

      case 'setTitle': {
        const titleEl = document.getElementById('note-title')
        if (titleEl) titleEl.value = msg.title || ''
        break
      }

      case 'setTheme':
        applyTheme(msg.colors, msg.isDark)
        break

      case 'setFontSettings':
        applyFontSettings(msg.fontSize, msg.fontFamily)
        break

      case 'setContent':
        if (msg.html !== undefined && msg.html !== null) {
          editor.commands.setContent(msg.html, false)
        }
        break

      case 'getHTML':
        sendToRN({ type: 'htmlResponse', requestId: msg.requestId, html: editor.getHTML() })
        break

      case 'setBottomInset': {
        hostBottomInset = {
          keyboardHeight: Number(msg.keyboardHeight) || 0,
          toolbarHeight: Number(msg.toolbarHeight) || CARET_BOTTOM_OBSTRUCTION,
        }
        applyBottomInset()
        keepCaretVisible()
        setTimeout(keepCaretVisible, CARET_RESCROLL_DELAY_MS)
        break
      }

      case 'scrollToTop':
        scrollDocumentToTop()
        break

      case 'toggleBold':
        ch().toggleBold().run()
        break
      case 'toggleItalic':
        ch().toggleItalic().run()
        break
      case 'toggleUnderline':
        ch().toggleUnderline().run()
        break
      case 'toggleSubscript':
        ch().toggleSubscript().run()
        break
      case 'toggleSuperscript':
        ch().toggleSuperscript().run()
        break
      case 'setHorizontalRule':
        ch().setHorizontalRule().run()
        break
      case 'toggleStrike':
        ch().toggleStrike().run()
        break
      case 'toggleH1':
        ch().toggleHeading({ level: 1 }).run()
        break
      case 'toggleH2':
        ch().toggleHeading({ level: 2 }).run()
        break
      case 'toggleH3':
        ch().toggleHeading({ level: 3 }).run()
        break
      case 'toggleUnorderedList':
        ch().toggleBulletList().run()
        break
      case 'toggleOrderedList':
        ch().toggleOrderedList().run()
        break
      case 'toggleCheckboxList':
        ch().toggleTaskList().run()
        break
      case 'toggleBlockQuote':
        ch().toggleBlockquote().run()
        break
      case 'toggleCodeBlock':
        ch().toggleCodeBlock().run()
        break
      case 'toggleHighlight':
        ch().toggleHighlight().run()
        break
      case 'setTextAlign':
        ch().setTextAlign(msg.align).run()
        break
      case 'undo':
        ch().undo().run()
        break
      case 'redo':
        ch().redo().run()
        break

      case 'insertImage':
        editor.commands.setImage({ src: msg.url, width: msg.width, height: msg.height })
        if (editor.state.selection.node) {
          editor.commands.setTextSelection(editor.state.selection.to)
        }
        break

      case 'insertFileAttachment':
        editor.commands.insertContent({
          type: 'fileAttachment',
          attrs: {
            fileName: msg.fileName || 'Untitled',
            fileSize: msg.fileSize || null,
            fileType: msg.fileType || null,
            url: msg.url || null,
          },
        })
        if (editor.state.selection.node) {
          editor.commands.setTextSelection(editor.state.selection.to)
        }
        break

      case 'insertAudioAttachment':
        editor.commands.insertContent({
          type: 'audioAttachment',
          attrs: {
            url: msg.url || null,
            fileName: msg.fileName || 'Audio',
            duration: msg.duration || 0,
          },
        })
        if (editor.state.selection.node) {
          editor.commands.setTextSelection(editor.state.selection.to)
        }
        break

      case 'moveCursorToEnd': {
        const lastNode = editor.state.doc.lastChild
        if (!lastNode || lastNode.type.name !== 'paragraph' || lastNode.content.size > 0) {
          editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph' })
        }
        editor.view.dispatch(editor.state.tr.setSelection(Selection.atEnd(editor.state.doc)))
        break
      }

      case 'appendParagraphs': {
        const paragraphs = Array.isArray(msg.paragraphs) ? msg.paragraphs : []
        const content = paragraphs.map((paragraph) => {
          const text = typeof paragraph?.text === 'string' ? paragraph.text : ''
          if (!text) return { type: 'paragraph' }
          const isWebLink =
            typeof paragraph.link === 'string' && /^https?:\/\//i.test(paragraph.link)
          const textNode = isWebLink
            ? { type: 'text', text, marks: [{ type: 'link', attrs: { href: paragraph.link } }] }
            : { type: 'text', text }
          return { type: 'paragraph', content: [textNode] }
        })
        if (content.length > 0) editor.commands.insertContent(content)
        break
      }

      case 'insertTranscript': {
        const lines = Array.isArray(msg.paragraphs)
          ? msg.paragraphs
              .map((paragraph) =>
                typeof paragraph?.text === 'string' ? paragraph.text.trim() : '',
              )
              .filter(Boolean)
          : []
        const heading = (text) => ({
          type: 'paragraph',
          content: [{ type: 'text', text, marks: [{ type: 'bold' }] }],
        })
        const cleanList = (items) =>
          Array.isArray(items) ? items.map((item) => String(item ?? '').trim()).filter(Boolean) : []
        const bulletList = (items) => ({
          type: 'bulletList',
          content: items.map((text) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          })),
        })
        const summaryText = typeof msg.summary === 'string' ? msg.summary.trim() : ''
        const actionItems = cleanList(msg.actionItems)
        const bullets = cleanList(msg.bullets)
        if (
          lines.length === 0 &&
          bullets.length === 0 &&
          !summaryText &&
          actionItems.length === 0
        ) {
          break
        }
        const quote = {
          type: 'blockquote',
          content: [
            heading(msg.title || 'Transcript'),
            ...lines.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
            ...(bullets.length > 0 ? [bulletList(bullets)] : []),
            ...(summaryText
              ? [
                  heading(msg.summaryTitle || 'Summary'),
                  { type: 'paragraph', content: [{ type: 'text', text: summaryText }] },
                ]
              : []),
            ...(actionItems.length > 0
              ? [heading(msg.actionItemsTitle || 'Action items'), bulletList(actionItems)]
              : []),
          ],
        }
        let insertAt = null
        if (msg.url) {
          editor.state.doc.descendants((node, pos) => {
            if (insertAt !== null) return false
            const isAttachment =
              node.type.name === 'audioAttachment' || node.type.name === 'fileAttachment'
            if (isAttachment && (node.attrs.url === msg.url || node.attrs.fileData === msg.url)) {
              insertAt = pos + node.nodeSize
              return false
            }
          })
        }
        if (insertAt === null && Number.isFinite(msg.afterPos)) {
          insertAt = blockEndAfter(editor.state.doc, msg.afterPos)
        }
        if (insertAt === null) {
          const lastNode = editor.state.doc.lastChild
          if (lastNode && lastNode.type.name === 'paragraph' && lastNode.content.size === 0) {
            insertAt = editor.state.doc.content.size - lastNode.nodeSize
          } else {
            insertAt = editor.state.doc.content.size
          }
        }
        editor.chain().insertContentAt(insertAt, quote).run()
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'getSelection': {
        const { from, to, empty } = editor.state.selection
        const kept = keptSelectionRange(editor.state)
        const remembered =
          msg.allowRemembered && empty
            ? kept
              ? {
                  from: kept.from,
                  to: kept.to,
                  text: editor.state.doc.textBetween(kept.from, kept.to, '\n', ' '),
                }
              : lastSelection && Date.now() - lastSelection.at < SELECTION_MEMORY_MS
                ? lastSelection
                : null
            : null
        sendToRN({
          type: 'selectionResponse',
          requestId: msg.requestId,
          from: remembered ? remembered.from : from,
          to: remembered ? remembered.to : to,
          text: remembered
            ? remembered.text
            : empty
              ? ''
              : editor.state.doc.textBetween(from, to, '\n', ' '),
        })
        break
      }

      case 'replaceRange': {
        const lines = textLines(msg.text)
        if (lines.length === 0) break
        const { doc } = editor.state
        const size = doc.content.size
        const from = Math.max(0, Math.min(Number(msg.from) || 0, size))
        const to = Math.max(from, Math.min(Number(msg.to) || 0, size))
        const unchanged = doc.textBetween(from, to, '\n', ' ') === msg.expected
        if (unchanged) {
          const content =
            lines.length === 1 ? { type: 'text', text: lines[0] } : paragraphNodes(lines)
          editor.chain().insertContentAt({ from, to }, content).run()
        } else {
          editor.chain().insertContentAt(blockEndAfter(doc, to), paragraphNodes(lines)).run()
        }
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'applyEdits': {
        const edits = Array.isArray(msg.edits) ? msg.edits : []
        const range =
          Number.isFinite(msg.from) && Number.isFinite(msg.to) ? { from: msg.from, to: msg.to } : {}
        const { tr } = buildNoteEditsTransaction(editor.state, edits, range)
        if (!tr) break
        editor.view.dispatch(tr)
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'dictationStart': {
        beginDictation()
        break
      }

      case 'dictationUpdate': {
        // dictationStart can be missed — the command is injected into the
        // WebView a beat before the recorder is mounted, so a slow or
        // reloading editor never opens the session. Dropping the update here
        // loses the whole transcript silently, so open one at the caret
        // instead and carry on.
        if (!dictation) beginDictation()
        if (!dictation) break
        const spoken = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim() : ''
        const text = spoken ? dictation.prefix + spoken : ''
        const { from, to } = dictationRange()
        if (!text && to === from) break
        const tr = editor.state.tr
        if (text) tr.insertText(text, from, to)
        else tr.delete(from, to)
        dictation.length = text.length
        tr.setSelection(Selection.near(tr.doc.resolve(from + text.length)))
        editor.view.dispatch(tr)
        moveDictationCaret()
        resumeCaretAutoscroll()
        keepCaretVisible()
        break
      }

      case 'dictationEnd': {
        if (!dictation) {
          removeDictationCaret()
          break
        }
        if (msg.commit === false) {
          const { from, to } = dictationRange()
          if (to > from) {
            const tr = editor.state.tr.delete(from, to)
            tr.setSelection(Selection.near(tr.doc.resolve(from)))
            editor.view.dispatch(tr)
          }
        }
        dictation = null
        removeDictationCaret()
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'insertParagraphsAfter': {
        const lines = textLines(msg.text)
        if (lines.length === 0) break
        editor
          .chain()
          .insertContentAt(blockEndAfter(editor.state.doc, msg.pos), paragraphNodes(lines))
          .run()
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'insertCaption': {
        const captionText = typeof msg.text === 'string' ? msg.text.trim() : ''
        if (!captionText) break
        let captionAt = null
        if (msg.src) {
          editor.state.doc.descendants((node, pos) => {
            if (captionAt !== null) return false
            if (node.type.name === 'image' && node.attrs.src === msg.src) {
              captionAt = pos + node.nodeSize
              return false
            }
          })
        }
        if (captionAt === null) captionAt = editor.state.doc.content.size
        editor
          .chain()
          .insertContentAt(captionAt, {
            type: 'paragraph',
            content: [{ type: 'text', text: captionText, marks: [{ type: 'italic' }] }],
          })
          .run()
        flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'deleteImage': {
        const { src: srcToDelete } = msg
        let deleted = false
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === srcToDelete) {
            editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize))
            deleted = true
            return false
          }
        })
        if (deleted) flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'deleteAttachment': {
        const { url: urlToDelete } = msg
        let deleted = false
        editor.state.doc.descendants((node, pos) => {
          if (
            (node.type.name === 'fileAttachment' || node.type.name === 'audioAttachment') &&
            (node.attrs.url === urlToDelete ||
              node.attrs.fileData === urlToDelete ||
              node.attrs.audioData === urlToDelete)
          ) {
            editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize))
            deleted = true
            return false
          }
        })
        if (deleted) flushContentChange(editor.getHTML(), editor.getText())
        break
      }

      case 'updateImageSrc': {
        const { oldSrc, newSrc } = msg
        let pos = -1
        let nodeAttrs = null
        editor.state.doc.descendants((node, p) => {
          if (node.type.name === 'image' && node.attrs.src === oldSrc) {
            pos = p
            nodeAttrs = node.attrs
            return false
          }
        })
        if (pos !== -1 && nodeAttrs) {
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, null, {
              ...nodeAttrs,
              src: newSrc,
            }),
          )
        }
        break
      }

      case 'setAttachmentThumbnail': {
        const els = document.querySelectorAll('[data-file-attachment][data-pdf-preview]')
        els.forEach((el) => {
          const matches = msg.attachmentId
            ? el.dataset.attachmentId === msg.attachmentId
            : el.dataset.url === msg.url
          if (matches) {
            applyPdfThumbnail(el, msg.thumbnail, msg.pageCount, msg.pageCountLabel)
          }
        })
        break
      }

      case 'setAttachmentLoading': {
        const els = document.querySelectorAll('[data-file-attachment][data-url]')
        els.forEach((el) => {
          const matches = msg.attachmentId
            ? el.dataset.attachmentId === msg.attachmentId
            : el.dataset.url === msg.url
          if (matches) {
            const overlay = el.querySelector('.attachment-loading-overlay')
            if (overlay) {
              overlay.style.display = msg.loading ? 'flex' : 'none'
              const percentEl = overlay.querySelector('.attachment-loading-percent')
              if (percentEl) {
                const showPercent = msg.loading && typeof msg.progress === 'number'
                percentEl.textContent = showPercent ? `${msg.progress}%` : ''
                percentEl.style.display = showPercent ? 'block' : 'none'
              }
            }
          }
        })
        break
      }

      case 'focus':
        editor.view.dom.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        editor.commands.focus(null, { scrollIntoView: false })
        break

      case 'focusTitle': {
        const titleEl = document.getElementById('note-title')
        if (titleEl) {
          titleEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          titleEl.focus()
          const end = titleEl.value.length
          titleEl.setSelectionRange(end, end)
        }
        break
      }

      case 'blur':
        editor.commands.blur()
        break
      case 'collapseSelection': {
        lastSelection = null
        editor.view.dispatch(editor.state.tr.setMeta(keptSelectionKey, null))
        const { to, empty } = editor.state.selection
        if (!empty) editor.commands.setTextSelection(to)
        break
      }

      // Drop the real selection but keep it drawn, so the sheet that is about
      // to cover the note still shows what it will act on.
      case 'keepSelection': {
        const { from, to, empty } = editor.state.selection
        const range = empty ? keptSelectionRange(editor.state) || lastSelection : { from, to }
        if (!range || range.to <= range.from) break
        lastSelection = {
          from: range.from,
          to: range.to,
          text: editor.state.doc.textBetween(range.from, range.to, '\n', ' '),
          at: Date.now(),
        }
        const tr = editor.state.tr.setMeta(keptSelectionKey, { from: range.from, to: range.to })
        if (!empty) tr.setSelection(Selection.near(tr.doc.resolve(range.to)))
        editor.view.dispatch(tr)
        break
      }

      case 'clearKeptSelection':
        clearKeptSelection(editor.view)
        break
    }
  },
}

const titleInputEl = document.getElementById('note-title')
if (titleInputEl) {
  titleInputEl.addEventListener('input', () => {
    sendToRN({ type: 'titleChange', title: titleInputEl.value })
  })
  titleInputEl.addEventListener('focus', () => {
    sendToRN({ type: 'focus' })
  })
  titleInputEl.addEventListener('blur', () => {
    sendToRN({ type: 'blur' })
  })
  titleInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      editor.commands.focus()
    }
  })
}

document.addEventListener(
  'keydown',
  () => {
    isDirty = true
  },
  true,
)

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    applyBottomInset()
    keepCaretVisible()
  })
}

sendToRN({ type: 'ready' })
