const BUNDLE_FORBIDDEN_STRINGS = [
  'Attempting to pair:',
  'autobase key',
  'drive key',
  'redux store exposed',
]

const READABLE_CORE_MARKERS = [
  'class NoteBase',
  'async initBase(',
  'async addNote(',
  'async subscribePairUser(',
]

const MAX_CONSOLE_LOGS = 5

function inspectBackendBundle(contents) {
  return {
    hasClosingTag: contents.includes('</'),
    leaked: BUNDLE_FORBIDDEN_STRINGS.filter((needle) => contents.includes(needle)),
    readable: READABLE_CORE_MARKERS.filter((needle) => contents.includes(needle)),
    consoleLogs: (contents.match(/console\.log\(/g) ?? []).length,
  }
}

function backendBundleProblems(contents) {
  const { hasClosingTag, leaked, readable, consoleLogs } = inspectBackendBundle(contents)
  const problems = []
  if (hasClosingTag) problems.push('a bare "</" sequence, which kills the worklet at launch')
  if (leaked.length > 0) problems.push(`sensitive log strings: ${leaked.join(', ')}`)
  if (readable.length > 0) problems.push(`readable core source: ${readable.join(', ')}`)
  if (consoleLogs > MAX_CONSOLE_LOGS) problems.push(`${consoleLogs} console.log calls`)
  return problems
}

module.exports = {
  BUNDLE_FORBIDDEN_STRINGS,
  READABLE_CORE_MARKERS,
  MAX_CONSOLE_LOGS,
  inspectBackendBundle,
  backendBundleProblems,
}
