/**
 * main.js — Tiptap editor bridge for the pear-notes mobile WebView.
 *
 * Bundled by Vite into a single self-contained HTML file (no CDN deps).
 * Mirrors the extension set of pear-notes-desktop exactly.
 */

import { Editor, Node, mergeAttributes } from '@tiptap/core'
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
import StarterKit from '@tiptap/starter-kit'
import langBash from 'highlight.js/lib/languages/bash'
import langCSS from 'highlight.js/lib/languages/css'
import langJS from 'highlight.js/lib/languages/javascript'
import langJSON from 'highlight.js/lib/languages/json'
import langPy from 'highlight.js/lib/languages/python'
import langTS from 'highlight.js/lib/languages/typescript'
import langXML from 'highlight.js/lib/languages/xml'
import { createLowlight } from 'lowlight'

// ── RN bridge ───────────────────────────────────────────────────────────────
function sendToRN(msg) {
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg))
    }
  } catch (_) {}
}

// ── Theme (CSS variables) ────────────────────────────────────────────────────
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

// ── Lowlight ─────────────────────────────────────────────────────────────────
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

// ── Image extension with width/height ────────────────────────────────────────
const ImageWithSize = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), width: { default: null }, height: { default: null } }
  },
}).configure({ inline: false, allowBase64: true })

// ── Debounced content change ──────────────────────────────────────────────────
let contentTimer = null
function scheduleContentChange(html, text) {
  clearTimeout(contentTimer)
  contentTimer = setTimeout(() => sendToRN({ type: 'contentChange', html, text }), 500)
}
function flushContentChange(html, text) {
  clearTimeout(contentTimer)
  sendToRN({ type: 'contentChange', html, text })
}

// ── Style state ───────────────────────────────────────────────────────────────
function broadcastStyleState(ed) {
  sendToRN({
    type: 'styleState',
    state: {
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
    },
  })
}

// ── Media Extensions ──────────────────────────────────────────────────────────

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
    // Only used for HTML serialization
    return ['div', mergeAttributes(HTMLAttributes, { 'data-file-attachment': '' })]
  },
  addNodeView() {
    return ({ node, view, getPos }) => {
      const isVideo = node.attrs.fileType?.startsWith('video/')
      const dom = document.createElement('div')
      dom.setAttribute('data-file-attachment', '')
      dom.style.cssText =
        'padding: 12px; margin: 8px 0; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; font-family: sans-serif; position: relative; overflow: hidden;'

      if (isVideo) {
        const video = document.createElement('video')
        video.src = node.attrs.url || ''
        video.controls = true
        video.playsInline = true
        video.preload = 'metadata'
        video.style.cssText =
          'width: 100%; border-radius: 4px; margin-bottom: 8px; background: #000;'

        const stopEvent = (e) => e.stopPropagation()
        video.addEventListener('mousedown', stopEvent)
        video.addEventListener('click', stopEvent)
        video.addEventListener('touchstart', stopEvent)

        dom.appendChild(video)
      }

      const content = document.createElement('div')
      content.style.cssText =
        'display: flex; align-items: center; justify-content: space-between; gap: 12px;'

      const info = document.createElement('div')
      info.style.cssText = 'flex: 1; min-width: 0;'

      const label = document.createElement('div')
      label.style.cssText =
        'font-weight: 600; font-size: 14px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
      label.textContent = node.attrs.fileName || 'File Attachment'
      info.appendChild(label)

      if (node.attrs.fileSize) {
        const meta = document.createElement('div')
        meta.style.cssText = 'font-size: 11px; color: var(--c-text-secondary); margin-top: 2px;'
        const size = node.attrs.fileSize
        meta.textContent =
          size < 1024
            ? `${size} B`
            : size < 1048576
              ? `${(size / 1024).toFixed(1)} KB`
              : `${(size / 1048576).toFixed(1)} MB`
        info.appendChild(meta)
      }

      const actions = document.createElement('div')
      actions.style.cssText = 'display: flex; align-items: center; gap: 4px;'

      const btnStyle =
        'padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;'
      const iconStroke = 'currentColor'

      const dlBtn = document.createElement('div')
      dlBtn.className = 'dl-btn'
      dlBtn.style.cssText = btnStyle
      dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--c-text-secondary)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`
      dlBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.openAttachment(node.attrs.url, node.attrs.fileName)
      }

      const delBtn = document.createElement('div')
      delBtn.className = 'del-btn'
      delBtn.style.cssText = btnStyle
      delBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`
      delBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.deleteAttachment(node.attrs.url)
        const pos = getPos()
        if (typeof pos === 'number') {
          view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize))
        }
      }

      actions.appendChild(dlBtn)
      actions.appendChild(delBtn)
      content.appendChild(info)
      content.appendChild(actions)
      dom.appendChild(content)

      return {
        dom,
        stopEvent: (event) => !!event.target.closest('video, .dl-btn, .del-btn'),
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
      const dom = document.createElement('div')
      dom.setAttribute('data-audio-attachment', '')
      dom.style.cssText =
        'padding: 12px; margin: 8px 0; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; font-family: sans-serif; display: flex; flex-direction: column; gap: 8px;'

      const header = document.createElement('div')
      header.style.cssText =
        'display: flex; align-items: center; justify-content: space-between; gap: 8px;'

      const label = document.createElement('div')
      label.style.cssText =
        'font-weight: 600; font-size: 14px; color: var(--c-text); pointer-events: none;'
      label.textContent = node.attrs.fileName || 'Audio Recording'
      header.appendChild(label)

      const delBtn = document.createElement('div')
      delBtn.className = 'del-btn'
      delBtn.style.cssText =
        'padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;'
      delBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`
      delBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.deleteAttachment(node.attrs.url)
        const pos = getPos()
        if (typeof pos === 'number') {
          view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize))
        }
      }
      header.appendChild(delBtn)

      const audio = document.createElement('audio')
      audio.src = node.attrs.url || ''
      audio.controls = true
      audio.playsInline = true
      audio.preload = 'metadata'
      audio.style.cssText = 'height: 40px; width: 100%; z-index: 50; position: relative;'

      const stopEvent = (e) => e.stopPropagation()
      audio.addEventListener('mousedown', stopEvent)
      audio.addEventListener('click', stopEvent)
      audio.addEventListener('touchstart', stopEvent)

      dom.appendChild(header)
      dom.appendChild(audio)

      return {
        dom,
        stopEvent: (event) =>
          !!(event.target.tagName === 'AUDIO' || event.target.closest('svg, .del-btn')),
        ignoreMutation: () => true,
      }
    }
  },
})

// ── Editor ────────────────────────────────────────────────────────────────────
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
      strike: false,
      codeBlock: false,
    }),
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
  ],

  content: '', // set via 'init' command after ready

  onUpdate: ({ editor }) => {
    scheduleContentChange(editor.getHTML(), editor.getText())
    broadcastStyleState(editor)
  },
  onSelectionUpdate: ({ editor }) => broadcastStyleState(editor),
  onFocus: () => sendToRN({ type: 'focus' }),
  onBlur: ({ editor }) => {
    flushContentChange(editor.getHTML(), editor.getText())
    sendToRN({ type: 'blur' })
  },
})

// ── Command bridge ────────────────────────────────────────────────────────────
window.editorBridge = {
  openAttachment(url, fileName) {
    sendToRN({ type: 'openAttachment', url, fileName })
  },
  deleteAttachment(url) {
    if (url) sendToRN({ type: 'deleteAttachment', url })
  },
  handleMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const ch = () => editor.chain().focus()

    switch (msg.type) {
      case 'init':
        applyTheme(msg.colors, msg.isDark)
        if (msg.html) editor.commands.setContent(msg.html, false)
        sendToRN({ type: 'initialized' })
        break

      case 'setTheme':
        applyTheme(msg.colors, msg.isDark)
        break

      case 'setContent':
        editor.commands.setContent(msg.html || '', false)
        break

      case 'getHTML':
        sendToRN({ type: 'htmlResponse', requestId: msg.requestId, html: editor.getHTML() })
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
        ch().setImage({ src: msg.url, width: msg.width, height: msg.height }).run()
        break

      case 'updateImageSrc': {
        const { oldSrc, newSrc } = msg
        let pos = -1
        let nodeAttrs = null
        editor.state.doc.descendants((node, p) => {
          if (node.type.name === 'image' && node.attrs.src === oldSrc) {
            pos = p
            nodeAttrs = node.attrs
            return false // Stop descending
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

      case 'focus':
        editor.view.dom.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        editor.commands.focus()
        break
    }
  },
}

// Signal ready
sendToRN({ type: 'ready' })
