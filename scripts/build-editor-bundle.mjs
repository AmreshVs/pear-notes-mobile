import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { hashInputs, readStamp, writeStamp } from './bundleStamp.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EDITOR_DIR = path.join(ROOT, 'editor-bundle')
const BUNDLE = path.join(ROOT, 'src', 'utils', 'tiptap-editor-bundle.ts')
const STAMP = path.join(ROOT, 'src', 'utils', 'tiptap-editor-bundle.stamp')
const SOCKET_FIREWALL = '/usr/local/bin/sfw'
const LOCKFILE = 'editor-bundle/package-lock.json'
const INPUTS = [
  'editor-bundle/src',
  'editor-bundle/index.html',
  'editor-bundle/vite.config.js',
  'editor-bundle/generate-bundle.js',
  LOCKFILE,
  'scripts/build-editor-bundle.mjs',
]
const onlyIfStale = process.argv.includes('--if-stale')

function stop(message) {
  console.error(`\n  editor bundle: ${message}\n`)
  process.exit(1)
}

function npm(args) {
  const [command, commandArgs] = fs.existsSync(SOCKET_FIREWALL)
    ? [SOCKET_FIREWALL, ['npm', ...args]]
    : ['npm', args]
  const result = spawnSync(command, commandArgs, { cwd: EDITOR_DIR, stdio: 'inherit' })
  if (result.error) stop(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0) stop(`npm ${args.join(' ')} failed (exit ${result.status})`)
}

const stamp = readStamp(STAMP)
const inputs = hashInputs(ROOT, INPUTS)
if (onlyIfStale && fs.existsSync(BUNDLE) && stamp?.inputs === inputs) {
  console.log('Editor bundle is up to date')
  process.exit(0)
}

const started = Date.now()
fs.rmSync(STAMP, { force: true })
const lockfile = hashInputs(ROOT, [LOCKFILE])
if (!fs.existsSync(path.join(EDITOR_DIR, 'node_modules')) || stamp?.lockfile !== lockfile) {
  npm(['ci', '--no-audit', '--no-fund'])
}
npm(['run', 'build'])

writeStamp(STAMP, { inputs, lockfile })
const sizeKb = (fs.statSync(BUNDLE).size / 1024).toFixed(0)
console.log(`Editor bundle built: ${sizeKb} KB in ${((Date.now() - started) / 1000).toFixed(0)}s`)
