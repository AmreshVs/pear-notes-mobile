import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import {
  findTermRanges,
  parseSearchQuery,
  SEARCH_HIGHLIGHT_MS,
} from '@pear-notes/core/backend/noteSearch.js'

const findInNoteKey = new PluginKey('findInNote')

const LEAF_CHAR = '\ufffc'
const EMPTY = { terms: [], matches: [], active: -1, transient: false, decorations: DecorationSet.empty }

function findMatches(doc, terms) {
  if (!terms.length) return []
  const matches = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const text = node.textBetween(0, node.content.size, undefined, LEAF_CHAR)
    const ranges = findTermRanges(text, terms)
    for (let i = 0; i + 1 < ranges.length; i += 2) {
      matches.push({ from: pos + 1 + ranges[i], to: pos + 1 + ranges[i + 1] })
    }
    return false
  })
  return matches
}

function decorate(doc, matches, active) {
  if (!matches.length) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class: index === active ? 'find-match find-match-active' : 'find-match',
      }),
    ),
  )
}

function build(doc, terms, active, transient) {
  const matches = findMatches(doc, terms)
  const clamped = matches.length ? Math.min(Math.max(active, 0), matches.length - 1) : -1
  return { terms, matches, active: clamped, transient, decorations: decorate(doc, matches, clamped) }
}

export const FindInNote = Extension.create({
  name: 'findInNote',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findInNoteKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(findInNoteKey)
            if (meta?.clear) return EMPTY
            if (meta?.query !== undefined) {
              const terms = parseSearchQuery(meta.query)
              return terms.length ? build(tr.doc, terms, 0, meta.transient === true) : EMPTY
            }
            if (meta?.active !== undefined && value.matches.length) {
              const count = value.matches.length
              const active = ((meta.active % count) + count) % count
              return { ...value, active, decorations: decorate(tr.doc, value.matches, active) }
            }
            if (tr.docChanged && value.terms.length) {
              return value.transient ? EMPTY : build(tr.doc, value.terms, value.active, false)
            }
            return value
          },
        },
        props: {
          decorations(state) {
            return findInNoteKey.getState(state)?.decorations
          },
        },
      }),
    ]
  },
})

const isLive = (editor) => !!editor && !editor.isDestroyed

export function getFindState(editor) {
  const value = isLive(editor) ? findInNoteKey.getState(editor.state) : null
  return { count: value?.matches.length || 0, active: value?.active ?? -1 }
}

export function isFinding(editor) {
  const value = isLive(editor) ? findInNoteKey.getState(editor.state) : null
  return !!value?.terms.length && !value.transient
}

export function getActiveMatch(editor) {
  const value = isLive(editor) ? findInNoteKey.getState(editor.state) : null
  return value?.matches[value.active] || null
}

let clearTimer = null

function dispatchFind(editor, meta) {
  if (!isLive(editor)) return
  editor.view.dispatch(editor.state.tr.setMeta(findInNoteKey, meta))
}

export function setFindQuery(editor, query) {
  clearTimeout(clearTimer)
  dispatchFind(editor, query ? { query } : { clear: true })
  return getActiveMatch(editor)
}

export function moveFindMatch(editor, step) {
  const value = isLive(editor) ? findInNoteKey.getState(editor.state) : null
  if (!value?.matches.length) return null
  clearTimeout(clearTimer)
  dispatchFind(editor, { active: value.active + step })
  return getActiveMatch(editor)
}

export function clearFind(editor) {
  clearTimeout(clearTimer)
  const value = isLive(editor) ? findInNoteKey.getState(editor.state) : null
  if (value?.terms.length) dispatchFind(editor, { clear: true })
}

export function showSearchMatches(editor, query) {
  clearTimeout(clearTimer)
  if (!query) {
    clearFind(editor)
    return null
  }
  dispatchFind(editor, { query, transient: true })
  const firstMatch = getActiveMatch(editor)
  if (firstMatch) {
    clearTimer = setTimeout(() => {
      if (findInNoteKey.getState(editor.state)?.transient) clearFind(editor)
    }, SEARCH_HIGHLIGHT_MS)
  }
  return firstMatch
}
