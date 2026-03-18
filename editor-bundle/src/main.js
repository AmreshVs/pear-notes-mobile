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
    'display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; transition: all 0.3s ease; position: relative; overflow: hidden; margin: 12px 0; font-family: sans-serif;'

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
  audio.src = src || ''
  audio.style.display = 'none'
  playBtn.appendChild(audio)

  const info = document.createElement('div')
  info.style.cssText = 'flex: 1; min-width: 0;'

  const title = document.createElement('p')
  title.style.cssText =
    'font-weight: 600; font-size: 14px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 4px 0;'
  title.textContent = titleText || 'Audio Recording'

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
  playBtn.addEventListener('mousedown', stopEvent)
  playBtn.addEventListener('touchstart', stopEvent)
  rangeInput.addEventListener('mousedown', stopEvent)
  rangeInput.addEventListener('touchstart', stopEvent)

  return { container, actionsContainer }
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

      const btnStyle =
        'padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; background: transparent; border: none;'
      const dlIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--c-text-secondary)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`
      const delIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`

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

        const dlBtn = document.createElement('button')
        dlBtn.className = 'dl-btn'
        dlBtn.style.cssText = btnStyle
        dlBtn.innerHTML = dlIcon
        dlBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          window.editorBridge.openAttachment(node.attrs.url, node.attrs.fileName)
        }

        const delBtn = document.createElement('button')
        delBtn.className = 'del-btn'
        delBtn.style.cssText = btnStyle
        delBtn.innerHTML = delIcon
        delBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          window.editorBridge.deleteAttachment(node.attrs.url)
          const pos = getPos()
          if (typeof pos === 'number') {
            view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize))
          }
        }

        player.actionsContainer.appendChild(dlBtn)
        player.actionsContainer.appendChild(delBtn)

        return {
          dom,
          stopEvent: (event) => !!event.target.closest('button, input[type="range"]'),
          ignoreMutation: () => true,
        }
      }

      const dom = document.createElement('div')
      dom.setAttribute('data-file-attachment', '')
      dom.className = 'file-attachment-container'
      dom.style.cssText =
        'display: flex; flex-direction: column; margin: 12px 0; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; position: relative; overflow: hidden; font-family: sans-serif;'

      if (isVideo) {
        const videoContainer = document.createElement('div')
        videoContainer.style.cssText =
          'position: relative; background: #000; width: 100%; aspect-ratio: 16/9; display: flex;'
        const video = document.createElement('video')
        video.src = node.attrs.url || ''
        video.controls = true
        video.playsInline = true
        video.preload = 'metadata'
        video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;'

        const stopEvent = (e) => e.stopPropagation()
        video.addEventListener('mousedown', stopEvent)
        video.addEventListener('click', stopEvent)
        video.addEventListener('touchstart', stopEvent)

        videoContainer.appendChild(video)
        dom.appendChild(videoContainer)
      }

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

      const label = document.createElement('p')
      label.style.cssText =
        'font-weight: 600; font-size: 14px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 4px 0;'
      label.textContent = fileName
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

      const genericBtnStyle =
        'padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; background: transparent; border: none;'

      const dlBtn = document.createElement('button')
      dlBtn.className = 'dl-btn'
      dlBtn.style.cssText = genericBtnStyle
      dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--c-text-secondary)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`
      dlBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.openAttachment(node.attrs.url, node.attrs.fileName)
      }

      const delBtn = document.createElement('button')
      delBtn.className = 'del-btn'
      delBtn.style.cssText = genericBtnStyle
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

      const btnStyle =
        'padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; background: transparent; border: none;'
      const dlIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--c-text-secondary)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`
      const delIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`

      const dlBtn = document.createElement('button')
      dlBtn.className = 'dl-btn'
      dlBtn.style.cssText = btnStyle
      dlBtn.innerHTML = dlIcon
      dlBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.openAttachment(
          node.attrs.url || node.attrs.audioData,
          node.attrs.fileName,
        )
      }

      const delBtn = document.createElement('button')
      delBtn.className = 'del-btn'
      delBtn.style.cssText = btnStyle
      delBtn.innerHTML = delIcon
      delBtn.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.editorBridge.deleteAttachment(node.attrs.url)
        const pos = getPos()
        if (typeof pos === 'number') {
          view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize))
        }
      }

      player.actionsContainer.appendChild(dlBtn)
      player.actionsContainer.appendChild(delBtn)

      return {
        dom,
        stopEvent: (event) => !!event.target.closest('button, input[type="range"]'),
        ignoreMutation: () => true,
      }
    }
  },
})

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

  content: '',

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
    const ch = () => editor.chain().focus(null, { scrollIntoView: false })

    switch (msg.type) {
      case 'init':
        applyTheme(msg.colors, msg.isDark)
        applyFontSettings(msg.fontSize, msg.fontFamily)
        if (msg.safeAreaTop != null) {
          document.documentElement.style.setProperty('--title-top-pad', `${msg.safeAreaTop}px`)
        }
        {
          const titleEl = document.getElementById('note-title')
          if (titleEl && msg.title != null) titleEl.value = msg.title
        }
        if (msg.html) editor.commands.setContent(msg.html, false)
        sendToRN({ type: 'initialized' })
        break

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
        editor.commands.setContent(msg.html || '', false)
        break

      case 'getHTML':
        sendToRN({ type: 'htmlResponse', requestId: msg.requestId, html: editor.getHTML() })
        break

      case 'scrollToTop':
        window.scrollTo(0, 0)
        document.body.scrollTop = 0
        document.documentElement.scrollTop = 0
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
          }
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
          }
        })
        if (editor.state.selection.node) {
          editor.commands.setTextSelection(editor.state.selection.to)
        }
        break

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

      case 'focus':
        editor.view.dom.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        editor.commands.focus()
        break

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

sendToRN({ type: 'ready' })
