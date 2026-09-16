import { Buffer } from 'buffer'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const sdkDir = path.dirname(require.resolve('@qvac/sdk/package'))
const commandsDir = path.join(sdkDir, 'dist', 'src', 'commands')
const configPath = path.join(projectRoot, 'qvac.config.json')
const outputDir = path.join(projectRoot, 'qvac')
const bundleEntryPath = path.join(outputDir, 'worker.bundle.entry.mjs')
const generatedBundle = path.join(outputDir, 'worker.bundle.js')
const manifestPath = path.join(outputDir, 'addons.manifest.json')
const importsMapPath = path.join(outputDir, 'bare-imports.json')
const decoderStubPath = path.join(outputDir, 'decoder-audio-stub.mjs')
const installedBundle = path.join(sdkDir, 'dist', 'worker.mobile.bundle.js')

const MOBILE_HOSTS = ['android-arm64', 'ios-arm64', 'ios-arm64-simulator']
const DEFERRED_MODULES = [
  'expo-file-system',
  'react-native-bare-kit',
  'bare-runtime/spawn',
  '@qvac/model-fit/process',
  '@qvac/sdk/worker.mobile.bundle',
]
const STUBBED_MODULES = { '@qvac/decoder-audio': decoderStubPath }
const DECODER_STUB_SOURCE = [
  'export class FFmpegDecoder {',
  '  constructor() {',
  "    throw new Error('Audio decoding is not bundled in Pear Notes. Pass 16 kHz mono PCM instead.')",
  '  }',
  '}',
  '',
].join('\n')

const semver = require('semver')
const Bundle = require('bare-bundle')

function readManifestFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function findInstalledVersion(fromDir, dependency) {
  let dir = fromDir
  while (dir.startsWith(projectRoot)) {
    const candidate = readManifestFile(path.join(dir, 'node_modules', dependency, 'package.json'))
    if (candidate?.version) return candidate.version
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function findPackageDir(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`, { paths: [projectRoot] }))
  } catch {
    const fallback = path.join(projectRoot, 'node_modules', name)
    return fs.existsSync(path.join(fallback, 'package.json')) ? fallback : null
  }
}

const qvacPackages = fs
  .readdirSync(path.join(projectRoot, 'node_modules', '@qvac'))
  .map((name) => `@qvac/${name}`)

function findRangeViolations(packageNames) {
  const violations = []
  for (const name of packageNames) {
    const dir = findPackageDir(name)
    const manifest = dir && readManifestFile(path.join(dir, 'package.json'))
    if (!manifest) continue
    const ranges = { ...manifest.dependencies, ...manifest.peerDependencies }
    for (const [dependency, range] of Object.entries(ranges)) {
      if (!dependency.startsWith('bare-') || !semver.validRange(range)) continue
      const installed = findInstalledVersion(dir, dependency)
      if (installed && !semver.satisfies(installed, range)) {
        violations.push(
          `${manifest.name} needs ${dependency}@${range} but ${installed} is installed`,
        )
      }
    }
  }
  return violations
}

function findUnlinkableAddons(addonNames) {
  const problems = []
  for (const name of addonNames) {
    const topLevel = readManifestFile(path.join(projectRoot, 'node_modules', name, 'package.json'))
    if (!topLevel?.version) {
      problems.push(`${name} is not installed at the top level, so it would not be linked`)
      continue
    }
    for (const qvacPackage of qvacPackages) {
      const dir = findPackageDir(qvacPackage)
      const manifest = dir && readManifestFile(path.join(dir, 'package.json'))
      const range = manifest && { ...manifest.dependencies, ...manifest.peerDependencies }[name]
      if (range && semver.validRange(range) && !semver.satisfies(topLevel.version, range)) {
        problems.push(
          `${qvacPackage} needs ${name}@${range} but only the top-level ${topLevel.version} is linked`,
        )
      }
    }
  }
  return problems
}

function findDeferredStaticImports(bundlePath) {
  const bundle = Bundle.from(Buffer.from(require(bundlePath)))
  const problems = []
  for (const [from, map] of Object.entries(bundle.resolutions ?? {})) {
    const source = bundle.read(from)
    if (!source) continue
    const text = Buffer.from(source).toString()
    for (const [specifier, target] of Object.entries(map)) {
      if (typeof target !== 'string' || !target.startsWith('deferred:')) continue
      const escaped = specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
      const staticImport = new RegExp(
        `(^|\\n)\\s*(import|export)[^;\\n]*from\\s*['"]${escaped}['"]|(^|\\n)\\s*import\\s*['"]${escaped}['"]`,
      )
      if (staticImport.test(text)) {
        problems.push(
          `${from} statically imports ${specifier}, which is deferred, so the worker cannot load`,
        )
      }
    }
  }
  return problems
}

const importCommand = (relative) => import(pathToFileURL(path.join(commandsDir, relative)).href)
const { resolveConfigForProject } = await import(
  pathToFileURL(
    path.join(sdkDir, 'dist', 'src', 'client', 'config-loader', 'resolve-config.node.js'),
  ).href
)
const { getClientLogger } = await import(
  pathToFileURL(path.join(sdkDir, 'dist', 'src', 'logging', 'index.js')).href
)
const { resolvePluginSpecifiers } = await importCommand('bundle/plugins.js')
const { generateWorkerEntries } = await importCommand('bundle/entry-gen.js')
const { createSdkImportResolver } = await importCommand('bundle/resolve-sdk-import.js')
const { runBarePack } = await importCommand('bundle/bare-pack.js')
const { generateAddonsManifest } = await importCommand('bundle/manifest.js')
const { verifyBundle, hasErrors, formatVerifyBundleResult } = await importCommand('index.js')

const logger = getClientLogger({ level: 'error', enableConsole: false })
const sdkName = readManifestFile(path.join(sdkDir, 'package.json')).name
const { config } = await resolveConfigForProject(projectRoot, configPath)
const { bundleEntry } = generateWorkerEntries(
  resolvePluginSpecifiers(config, sdkName, logger),
  sdkName,
  createSdkImportResolver(sdkDir, sdkName),
)

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(decoderStubPath, DECODER_STUB_SOURCE)

const importsMap = { ...(readManifestFile(path.join(sdkDir, 'bare-imports.json')) ?? {}) }
for (const [specifier, target] of Object.entries(STUBBED_MODULES)) {
  importsMap[specifier] = pathToFileURL(target).href
}
fs.writeFileSync(importsMapPath, `${JSON.stringify(importsMap, null, 2)}\n`)
fs.writeFileSync(bundleEntryPath, bundleEntry)

try {
  await runBarePack({
    entryPath: bundleEntryPath,
    outputPath: generatedBundle,
    hosts: MOBILE_HOSTS,
    importsMapPath,
    deferModules: DEFERRED_MODULES,
    quiet: true,
    logger,
  })
} finally {
  fs.rmSync(bundleEntryPath, { force: true })
}

await generateAddonsManifest({ bundlePath: generatedBundle, outputDir, projectRoot, logger })

const verification = await verifyBundle({
  projectRoot,
  addonsSource: generatedBundle,
  hosts: MOBILE_HOSTS,
  configPath,
})

if (hasErrors(verification)) {
  console.error(formatVerifyBundleResult(verification))
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const addons = Array.isArray(manifest.addons) ? manifest.addons : []

if (addons.length === 0) {
  console.error(
    'QVAC worker bundle refused: the addons manifest is empty, so the app would link no on-device AI addons. Run this script from the project root.',
  )
  process.exit(1)
}

const registryModels = await import(
  pathToFileURL(
    path.join(findPackageDir('@qvac/inference'), 'dist', 'models', 'registry', 'models.js'),
  ).href
)
const { findLocalAiRegistryMismatches, findMissingLocalAiModelNames } =
  await import('@pear-notes/core/store/services/localAiRegistryCheck.js')
const localeModelNames = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'src', 'locales', 'en.json'), 'utf8'),
).settings?.onDeviceAi?.modelNames

const problems = [
  ...findLocalAiRegistryMismatches(registryModels),
  ...findMissingLocalAiModelNames(localeModelNames),
  ...findRangeViolations([...new Set([...qvacPackages, ...addons])]),
  ...findUnlinkableAddons(addons),
  ...findDeferredStaticImports(generatedBundle),
]
if (problems.length) {
  console.error(`QVAC worker bundle refused:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

fs.copyFileSync(generatedBundle, installedBundle)
console.log(`QVAC worker bundle ready with ${addons.length} native addons: ${addons.join(', ')}`)

const linkedIosAddonsDir = path.join(
  projectRoot,
  'node_modules',
  'react-native-bare-kit',
  'ios',
  'addons',
)
if (fs.existsSync(linkedIosAddonsDir)) {
  const linkedNames = fs
    .readdirSync(linkedIosAddonsDir)
    .map((entry) => entry.replace(/\.[\d.]+\.xcframework$/, ''))
  const unlinked = addons.filter(
    (addon) => !linkedNames.includes(addon.replace('/', '__').replace(/^@/, '')),
  )
  if (unlinked.length) {
    console.warn(
      `QVAC worker needs native addons the iOS app has not linked yet: ${unlinked.join(', ')}. Run \`cd ios && pod install\` and rebuild the app before loading this bundle, or it will abort at launch.`,
    )
  }
}
