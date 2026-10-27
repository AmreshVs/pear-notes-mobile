const fs = require('fs')
const path = require('path')
const { minify } = require('terser')
const { obfuscate } = require('javascript-obfuscator')

const ROOT = path.resolve(__dirname, '..')
const CORE_PKG = '@pear-notes/core'
const SOURCE = path.join(ROOT, 'node_modules', CORE_PKG)
const STAGE = path.join(ROOT, '.core-build')
const STAGED_CORE = path.join(STAGE, 'node_modules', CORE_PKG)
const ENTRY = path.join(STAGE, 'main.mjs')

// Off unless PEAR_OBFUSCATE=1: the obfuscator's base64 string array got the
// desktop 1.1.1 MSIX rejected by the Microsoft Store malware scan, and the
// same pattern trips generic AV heuristics and store review elsewhere.
const OBFUSCATE_ENABLED = process.env.PEAR_OBFUSCATE === '1'
const OBFUSCATE_LEVEL =
  process.env.PEAR_OBFUSCATE_LEVEL === 'aggressive' ? 'aggressive' : 'standard'

const TERSER_OPTIONS = {
  module: true,
  compress: {
    drop_console: ['log', 'info', 'debug', 'trace'],
    drop_debugger: true,
  },
  mangle: {
    toplevel: false,
  },
  format: {
    comments: false,
  },
}

const BASE_OBFUSCATOR_OPTIONS = {
  compact: true,
  target: 'node',
  renameGlobals: false,
  renameProperties: false,
  transformObjectKeys: false,
  selfDefending: false,
  debugProtection: false,
  identifierNamesGenerator: 'mangled-shuffled',
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  splitStrings: false,
  unicodeEscapeSequence: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
}

const AGGRESSIVE_OBFUSCATOR_OPTIONS = {
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
}

function obfuscatorOptions() {
  if (OBFUSCATE_LEVEL === 'aggressive') {
    return { ...BASE_OBFUSCATOR_OPTIONS, ...AGGRESSIVE_OBFUSCATOR_OPTIONS }
  }
  return BASE_OBFUSCATOR_OPTIONS
}

function listJsFiles(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      found.push(...listJsFiles(full))
    } else if (entry.isFile() && full.endsWith('.js')) {
      found.push(full)
    }
  }
  return found
}

function collectExportNames(source) {
  const names = new Set()
  const functionDeclaration = /export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g
  const bindingDeclaration = /export\s+(?:class|const|let|var)\s+([A-Za-z_$][\w$]*)/g
  const named = /export\s*\{([^}]*)\}/g

  let match
  while ((match = functionDeclaration.exec(source)) !== null) names.add(match[1])
  while ((match = bindingDeclaration.exec(source)) !== null) names.add(match[1])
  while ((match = named.exec(source)) !== null) {
    for (const part of match[1].split(',')) {
      const alias = part.includes(' as ') ? part.split(' as ')[1] : part
      const clean = alias.trim()
      if (clean) names.add(clean)
    }
  }
  if (/export\s+default\b/.test(source)) names.add('default')
  return names
}

function assertExportsPreserved(relative, before, after) {
  const expected = collectExportNames(before)
  if (expected.size === 0) return

  const actual = collectExportNames(after)
  const lost = [...expected].filter((name) => !actual.has(name))

  if (lost.length > 0) {
    throw new Error(
      `${relative}: obfuscation dropped or renamed export(s) ${lost.join(', ')} - ` +
        'these are resolved by name across the module graph, so the bundle would fail at runtime',
    )
  }
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`${CORE_PKG} not found at ${SOURCE} - run npm install (or npm run copy-core)`)
    process.exit(1)
  }

  fs.rmSync(STAGE, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(STAGED_CORE), { recursive: true })
  fs.cpSync(SOURCE, STAGED_CORE, { recursive: true })

  fs.rmSync(path.join(STAGED_CORE, 'types'), { recursive: true, force: true })

  fs.writeFileSync(ENTRY, `import '${CORE_PKG}/backend/main.js'\n`)

  const files = listJsFiles(STAGED_CORE)
  const startedAt = Date.now()
  let before = 0
  let after = 0

  for (const file of files) {
    const relative = path.relative(STAGED_CORE, file)
    const original = fs.readFileSync(file, 'utf8')
    before += original.length

    const minified = await minify(original, TERSER_OPTIONS)
    if (typeof minified.code !== 'string') {
      throw new Error(`terser produced no output for ${relative}`)
    }

    let code = minified.code

    if (OBFUSCATE_ENABLED) {
      code = obfuscate(code, obfuscatorOptions()).getObfuscatedCode()
      assertExportsPreserved(relative, original, code)
    }

    fs.writeFileSync(file, code)
    after += code.length
  }

  const delta = before === 0 ? 0 : Math.round((after / before - 1) * 100)
  const direction = delta >= 0 ? `+${delta}%` : `${delta}%`
  const mode = OBFUSCATE_ENABLED ? `minify + obfuscate (${OBFUSCATE_LEVEL})` : 'minify only'

  console.log(
    `${mode}: ${files.length} core files, ${(before / 1024).toFixed(0)} KB -> ` +
      `${(after / 1024).toFixed(0)} KB (${direction}), ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  )
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
