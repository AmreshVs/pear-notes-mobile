import { spawnSync } from 'child_process'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { hashInputs, readStamp, writeStamp } from './bundleStamp.mjs'

const require = createRequire(import.meta.url)
const { backendBundleProblems } = require('./bundleHygiene.js')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = path.join(ROOT, 'src', 'backend', 'backend.bundle.js')
const STAMP = path.join(ROOT, 'src', 'backend', 'backend.bundle.stamp')
const BARE_PACK = path.join(ROOT, 'node_modules', '.bin', 'bare-pack')
const HOSTS = ['android-arm64', 'ios-arm64', 'ios-arm64-simulator']
const INPUTS = [
  'node_modules/@pear-notes/core',
  'package-lock.json',
  'scripts/minify-core.js',
  'scripts/build-backend-bundle.mjs',
]
const onlyIfStale = process.argv.includes('--if-stale')

function stop(message) {
  console.error(`\n  backend bundle: ${message}\n`)
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.error) stop(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0) stop(`${path.basename(command)} failed (exit ${result.status})`)
}

function currentInputs() {
  return hashInputs(ROOT, INPUTS, [process.env.PEAR_OBFUSCATE, process.env.PEAR_OBFUSCATE_LEVEL])
}

function discardBundle() {
  fs.rmSync(BUNDLE, { force: true })
  fs.rmSync(STAMP, { force: true })
}

if (!fs.existsSync(path.join(ROOT, 'node_modules', '@pear-notes', 'core'))) {
  stop('node_modules/@pear-notes/core is missing - run npm run setup')
}

const inputs = currentInputs()
if (onlyIfStale && fs.existsSync(BUNDLE) && readStamp(STAMP)?.inputs === inputs) {
  console.log('Backend bundle is up to date')
  process.exit(0)
}

const started = Date.now()
fs.rmSync(STAMP, { force: true })
run(process.execPath, [path.join(ROOT, 'scripts', 'minify-core.js')])
run(BARE_PACK, [
  ...HOSTS.flatMap((host) => ['--host', host]),
  '--linked',
  '--out',
  path.relative(ROOT, BUNDLE),
  '.core-build/main.mjs',
])

const problems = backendBundleProblems(fs.readFileSync(BUNDLE, 'utf8'))
if (problems.length > 0) {
  discardBundle()
  stop(`refusing to keep a bundle with ${problems.join('; ')}`)
}

writeStamp(STAMP, { inputs })
const sizeMb = (fs.statSync(BUNDLE).size / 1024 / 1024).toFixed(1)
console.log(`Backend bundle built: ${sizeMb} MB in ${((Date.now() - started) / 1000).toFixed(0)}s`)
