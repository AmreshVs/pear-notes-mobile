import { Editor, Node, mergeAttributes } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
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
import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import langBash from 'highlight.js/lib/languages/bash'
import langCSS from 'highlight.js/lib/languages/css'
import langJS from 'highlight.js/lib/languages/javascript'
import langJSON from 'highlight.js/lib/languages/json'
import langPy from 'highlight.js/lib/languages/python'
import langTS from 'highlight.js/lib/languages/typescript'
import langXML from 'highlight.js/lib/languages/xml'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { createLowlight } from 'lowlight'
import { prosemirrorToYXmlFragment } from 'y-prosemirror'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  writeSyncStep1,
} from 'y-protocols/sync'
import * as Y from 'yjs'

const HYPERDRIVE_URL_PREFIX = 'http://hyperdrive'
let hyperdriveServerAddress = null

function resolveHyperdriveUrl(url) {
  if (!url || !hyperdriveServerAddress || !url.startsWith(HYPERDRIVE_URL_PREFIX)) return url
  return url.replace(HYPERDRIVE_URL_PREFIX, hyperdriveServerAddress.replace(/\/$/, ''))
}

function sendToRN(msg) {
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg))
    }
  } catch (_) {}
}

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

function applyTheme(colors, isDark) {
  const r = document.documentElement.style
  r.setProperty('--c-text', colors.text)
  r.setProperty('--c-text-secondary', colors.textSecondary)
  r.setProperty('--c-bg', colors.background)
  r.setProperty('--c-surface', colors.surface)
  r.setProperty('--c-primary', colors.primary)
  r.setProperty('--c-border', colors.border)
  document.body.style.background = colors.background

  r.setProperty('--c-placeholder', isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)')
  r.setProperty('--c-code-bg', isDark ? '#1C1C1E' : '#F0F0F2')
  r.setProperty('--c-code', isDark ? '#A8FF78' : '#2D5016')
  r.setProperty('--c-codeblock-bg', isDark ? '#141414' : '#F4F4F5')
  r.setProperty('--hl-keyword', isDark ? '#FF79C6' : '#D73A49')
  r.setProperty('--hl-string', isDark ? '#F1FA8C' : '#032F62')
  r.setProperty('--hl-comment', isDark ? '#6272A4' : '#6A737D')
  r.setProperty('--hl-number', isDark ? '#BD93F9' : '#005CC5')
  r.setProperty('--hl-fn', isDark ? '#50FA7B' : '#6F42C1')
  r.setProperty('--hl-var', isDark ? '#FFB86C' : '#E36209')
  r.setProperty('--hl-builtin', isDark ? '#8BE9FD' : '#005CC5')
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

const ImageWithSize = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), width: { default: null }, height: { default: null } }
  },
  addNodeView() {
    return ({ node, getPos, view }) => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText =
        'display: block; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;'
      wrapper.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })
      wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })

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
      if (node.attrs.src) img.src = resolveHyperdriveUrl(node.attrs.src)
      if (node.attrs.width)
        img.style.width =
          typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width
      if (node.attrs.height)
        img.style.height =
          typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height
      img.style.cssText += 'display: block; max-width: 100%; height: auto; border-radius: 8px;'
      img.draggable = false

      inner.appendChild(img)
      wrapper.appendChild(inner)
      return {
        dom: wrapper,
        stopEvent: () => true,
        ignoreMutation: () => true,
      }
    }
  },
}).configure({ inline: false, allowBase64: true })

let contentTimer = null
function scheduleContentChange(html, text) {
  clearTimeout(contentTimer)
  contentTimer = setTimeout(() => sendToRN({ type: 'contentChange', html, text }), 500)
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

function getCaretRect() {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  const rangeRect = range.getBoundingClientRect()
  if (rangeRect && (rangeRect.height || rangeRect.top || rangeRect.bottom)) return rangeRect
  let node = range.startContainer
  if (node && node.nodeType === 3) node = node.parentElement
  return node && node.getBoundingClientRect ? node.getBoundingClientRect() : null
}

function scrollDocumentToTop() {
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
  if (!editor || !editor.isFocused) return
  const rect = getCaretRect()
  if (!rect) return
  // rect is layout-viewport relative, so compare against window.innerHeight. caretBottomInset
  // already covers the keyboard plus the floating toolbar above it.
  const overflow = rect.bottom - (window.innerHeight - caretBottomInset)
  if (overflow > 0) scrollEditorBy(overflow + CARET_SCROLL_MARGIN)
}

let caretScrollFrame = null
let caretScrollTimer = null

// A correction is only ever queued in response to a real change — the document, the caret
// position, or the keyboard. Plain scrolling triggers nothing. The one hazard left is a
// correction queued just before the user starts dragging, so a scroll cancels anything
// pending. It never blocks a *fresh* trigger, which is what keeps the keyboard-open and
// Enter-at-the-bottom cases working.
function cancelPendingCaretScroll() {
  if (caretScrollFrame) {
    cancelAnimationFrame(caretScrollFrame)
    caretScrollFrame = null
  }
  clearTimeout(caretScrollTimer)
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

window.addEventListener(
  'scroll',
  () => {
    if (Date.now() < programmaticScrollUntil) return
    cancelPendingCaretScroll()
  },
  { passive: true, capture: true },
)

let styleTimer = null
let lastStyleJSON = ''
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
    'display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; transition: all 0.3s ease; position: relative; overflow: hidden; margin: 12px 0; font-family: sans-serif; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;'
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
    'font-size: 12px; font-weight: 500; color: var(--c-text-secondary); background-color: var(--c-bg); padding: 2px 8px; border-radius: 6px;'
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
    'position: relative; height: 6px; background-color: var(--c-bg); width: 100%; border-radius: 3px;'

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
        'display: flex; flex-direction: column; margin: 12px 0; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; position: relative; overflow: hidden; font-family: sans-serif; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer;'

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

      const content = document.createElement('div')
      content.style.cssText =
        'position: relative; display: flex; align-items: center; gap: 16px; padding: 16px;'

      const iconContainer = document.createElement('div')
      iconContainer.style.cssText =
        'flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px; background-color: var(--c-bg); display: flex; align-items: center; justify-content: center; color: var(--c-text-secondary); border: 1px solid var(--c-border);'
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
      meta.style.cssText = 'display: flex; align-items: center; gap: 8px;'

      const extSpan = document.createElement('span')
      extSpan.style.cssText =
        'font-size: 12px; font-weight: 500; color: var(--c-text-secondary); background-color: var(--c-bg); padding: 2px 8px; border-radius: 6px;'
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

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const SYNC_RETRY_INTERVAL_MS = 1500
const MAX_SYNC_RETRY_ATTEMPTS = 10
const GENESIS_CLIENT_ID = 0
const YJS_FRAGMENT = 'default'

function uint8ToBase64(u8Arr) {
  const CHUNK_SIZE = 0x8000
  let index = 0
  const length = u8Arr.length
  let result = ''
  let slice
  while (index < length) {
    slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length))
    result += String.fromCharCode.apply(null, slice)
    index += CHUNK_SIZE
  }
  return btoa(result)
}

function base64ToUint8(b64) {
  const binString = atob(b64)
  const size = binString.length
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i)
  }
  return bytes
}

let editor = null
let ydoc = null
let awareness = null
let currentNoteId = null
let currentCollaborator = null
let hasReceivedSync = false
let syncRetryInterval = null
let collaborationEnabled = false

function sendYjsEncoder(encoder) {
  if (encoding.length(encoder) === 0) return
  sendToRN({ type: 'yjsMessage', data: uint8ToBase64(encoding.toUint8Array(encoder)) })
}

function sendSyncStep1() {
  if (!ydoc) return
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MESSAGE_SYNC)
  writeSyncStep1(encoder, ydoc)
  sendYjsEncoder(encoder)
}

function seedGenesisFromHtml(html) {
  if (!ydoc || !editor) return
  const fragment = ydoc.getXmlFragment(YJS_FRAGMENT)
  if (fragment.length > 0 || !html) return
  const container = document.createElement('div')
  container.innerHTML = html
  const pmDoc = PMDOMParser.fromSchema(editor.schema).parse(container)
  const seedDoc = new Y.Doc()
  seedDoc.clientID = GENESIS_CLIENT_ID
  prosemirrorToYXmlFragment(pmDoc, seedDoc.getXmlFragment(YJS_FRAGMENT))
  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(seedDoc), 'seed')
}

function handleYjsMessage(b64) {
  if (!collaborationEnabled || !ydoc || !b64) return
  const data = base64ToUint8(b64)
  if (!data || data.byteLength === 0) return

  const decoder = decoding.createDecoder(data)
  const messageType = decoding.readVarUint(decoder)

  if (messageType === MESSAGE_SYNC) {
    const syncMessageType = decoding.readVarUint(decoder)
    if (syncMessageType === messageYjsSyncStep1) {
      const replyEncoder = encoding.createEncoder()
      encoding.writeVarUint(replyEncoder, MESSAGE_SYNC)
      readSyncStep1(decoder, replyEncoder, ydoc)
      sendYjsEncoder(replyEncoder)
    } else if (syncMessageType === messageYjsSyncStep2 || syncMessageType === messageYjsUpdate) {
      hasReceivedSync = true
      Y.applyUpdate(ydoc, decoding.readVarUint8Array(decoder), 'remote')
    }
  } else if (messageType === MESSAGE_AWARENESS) {
    applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), 'remote')
  }
}

function destroyEditorSession() {
  if (syncRetryInterval) {
    clearInterval(syncRetryInterval)
    syncRetryInterval = null
  }
  if (awareness) removeAwarenessStates(awareness, [awareness.clientID], 'session-teardown')
  if (editor) editor.destroy()
  editor = null
  ydoc = null
  awareness = null
}

function createEditorSession(collaborator, html) {
  hasReceivedSync = false

  const commonExtensions = [
    Underline,
    Strike,
    TaskList,
    TaskItem.configure({ nested: true }),
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
  ]

  let collabExtensions = []
  if (collaborationEnabled) {
    ydoc = new Y.Doc()
    awareness = new Awareness(ydoc)

    awareness.on('update', ({ added, updated, removed }, origin) => {
      if (origin === 'remote') return
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(awareness, changedClients))
      sendYjsEncoder(encoder)
    })

    ydoc.on('update', (update, origin) => {
      if (origin === 'remote' || origin === 'seed') return
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      encoding.writeVarUint(encoder, messageYjsUpdate)
      encoding.writeVarUint8Array(encoder, update)
      sendYjsEncoder(encoder)
    })

    collabExtensions = [
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: { awareness },
        user: collaborator || { name: 'Pear Notes User', color: '#68CEF8' },
      }),
    ]
  }

  editor = new Editor({
    element: document.querySelector('#editor'),
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        strike: false,
        codeBlock: false,
        undoRedo: !collaborationEnabled,
      }),
      ...collabExtensions,
      ...commonExtensions,
    ],
    content: collaborationEnabled ? undefined : html || '',

    onUpdate: ({ editor }) => {
      scheduleContentChange(editor.getHTML(), editor.getText())
      broadcastStyleState(editor)
      keepCaretVisible()
    },
    onSelectionUpdate: ({ editor }) => {
      broadcastStyleState(editor)
      // WebKit fires selectionchange while a focused contenteditable is scrolled, which would
      // otherwise drag the view back to the caret. Only react when the caret actually moved.
      const from = editor.state.selection.from
      if (from === lastSelectionFrom) return
      lastSelectionFrom = from
      keepCaretVisible()
    },
    onTransaction: ({ editor }) => broadcastStyleState(editor),
    onFocus: () => sendToRN({ type: 'focus' }),
    onBlur: ({ editor }) => {
      flushContentChange(editor.getHTML(), editor.getText())
      sendToRN({ type: 'blur' })
    },
  })

  if (!collaborationEnabled) return

  seedGenesisFromHtml(html)

  sendSyncStep1()
  let syncRetryAttempts = 0
  syncRetryInterval = setInterval(() => {
    if (hasReceivedSync || syncRetryAttempts >= MAX_SYNC_RETRY_ATTEMPTS) {
      clearInterval(syncRetryInterval)
      syncRetryInterval = null
      return
    }
    syncRetryAttempts += 1
    sendSyncStep1()
  }, SYNC_RETRY_INTERVAL_MS)
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
  handleMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const ch = () => editor.chain().focus(null, { scrollIntoView: false })

    switch (msg.type) {
      case 'yjsMessage':
        handleYjsMessage(msg.data)
        break

      case 'setHyperdriveAddress':
        hyperdriveServerAddress = msg.address || null
        break

      case 'setCollaborator':
        if (msg.collaborator) {
          currentCollaborator = msg.collaborator
          if (collaborationEnabled) {
            try {
              editor.commands.updateUser(msg.collaborator)
            } catch (e) {
              console.error('Failed to update collaborator', e)
            }
          }
        }
        break

      case 'init': {
        collaborationEnabled = msg.collaborationEnabled !== false
        currentCollaborator = msg.collaborator || currentCollaborator
        if (msg.hyperdriveAddress) hyperdriveServerAddress = msg.hyperdriveAddress
        if (!editor) {
          createEditorSession(currentCollaborator, msg.html)
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
        if (collaborationEnabled) {
          if (msg.noteId !== currentNoteId) {
            destroyEditorSession()
            createEditorSession(currentCollaborator, msg.html)
            currentNoteId = msg.noteId
          } else {
            seedGenesisFromHtml(msg.html)
          }
        } else {
          currentNoteId = msg.noteId
          if (msg.html != null) editor.commands.setContent(msg.html, false)
        }
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
          if (collaborationEnabled) {
            seedGenesisFromHtml(msg.html)
          } else {
            editor.commands.setContent(msg.html, false)
          }
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
          titleEl.focus()
          const end = titleEl.value.length
          titleEl.setSelectionRange(end, end)
        }
        break
      }

      case 'blur':
        editor.commands.blur()
        break
    }
  },
}

const titleInputEl = document.getElementById('note-title')
if (titleInputEl) {
  titleInputEl.addEventListener('input', () => {
    sendToRN({ type: 'titleChange', title: titleInputEl.value })
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
