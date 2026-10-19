import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedBundle = path.join(projectRoot, 'qvac', 'worker.bundle.js')
const manifestPath = path.join(projectRoot, 'qvac', 'addons.manifest.json')
const installedBundle = path.join(
  projectRoot,
  'node_modules',
  '@qvac',
  'sdk',
  'dist',
  'worker.mobile.bundle.js',
)
const bundleInputs = [
  'qvac.config.json',
  'package-lock.json',
  'src/locales/en.json',
  'scripts/build-qvac-bundle.mjs',
  'node_modules/@qvac/sdk/package.json',
  'node_modules/@pear-notes/core/package.json',
  'node_modules/@pear-notes/core/store/services/localAiCatalog.js',
  'node_modules/@pear-notes/core/store/services/localAiTranslationModels.js',
  'node_modules/@pear-notes/core/store/services/localAiRegistryCheck.js',
].map((file) => path.join(projectRoot, file))

function runScript(name, args = []) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', name), ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function readManifestAddons() {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return Array.isArray(manifest.addons) ? manifest.addons : []
  } catch {
    return []
  }
}

function isWorkerBundleCurrent() {
  if (process.env.NATIVE_ADDONS_REBUILD === '1') return false
  if (![generatedBundle, installedBundle, manifestPath].every((file) => fs.existsSync(file)))
    return false
  if (readManifestAddons().length === 0) return false
  const bundleTime = fs.statSync(generatedBundle).mtimeMs
  const inputsUnchanged = bundleInputs.every(
    (input) => !fs.existsSync(input) || fs.statSync(input).mtimeMs <= bundleTime,
  )
  return (
    inputsUnchanged && fs.readFileSync(generatedBundle).equals(fs.readFileSync(installedBundle))
  )
}

runScript('patch-bare-kit-linker.mjs')
runScript('patch-expo-ui-sheet.mjs')
runScript('patch-expo-modules-jsi.mjs')

const bundleBuildArgs = process.env.NATIVE_ADDONS_REBUILD === '1' ? [] : ['--if-stale']
runScript('build-backend-bundle.mjs', bundleBuildArgs)
runScript('build-editor-bundle.mjs', bundleBuildArgs)

if (isWorkerBundleCurrent()) {
  console.log(`QVAC worker bundle is up to date with ${readManifestAddons().length} native addons`)
} else {
  runScript('build-qvac-bundle.mjs')
}
