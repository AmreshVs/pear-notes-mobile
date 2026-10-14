import link from 'bare-link'
import { Buffer } from 'buffer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL, URL } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'qvac', 'addons.manifest.json')
const qvacConfigPath = path.join(projectRoot, 'qvac.config.json')
const backendBundlePath = path.join(projectRoot, 'src', 'backend', 'backend.bundle.js')
const platformAddonsResolverPath = path.join(
  projectRoot,
  'node_modules',
  '@qvac',
  'sdk',
  'dist',
  'src',
  'expo',
  'plugins',
  'patches',
  'qvac-platform-addons.js',
)
const EXCLUDED_DEPENDENCIES = ['@qvac/sdk']
const EXCLUDED_LIBRARIES = [/ggml-vulkan/]
// bare-link names an addon after the package and the version Bare resolves it
// by — `bare-fs.4.8.1.xcframework`, `libbare-fs.4.8.1.so`. Anything else in the
// output is a companion library an addon dlopens (the ggml compute backends,
// for one), so it carries no version and must be left alone.
const VERSION = String.raw`\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?`
const ADDON_ARTIFACT = new RegExp(String.raw`^(?:lib)?(.+?)\.${VERSION}\.(?:xcframework|so)$`)
const XCFRAMEWORK = /\.xcframework$/

// bare-link walks the whole dependency graph, and since @qvac/sdk pulls in
// bare-runtime (a full desktop Bare) every addon that runtime is built from
// gets linked too — bare-module, bare-abort, bare-inspector, two versions of
// bare-signals, and so on. BareKit already has those compiled in, so shipping
// a second copy registers duplicate built-ins with the embedded runtime and
// the worklet aborts the moment it boots. Only the addons the bundles we
// actually run ask for are allowed into the app.
function addonNameFromArtifact(entry) {
  return ADDON_ARTIFACT.exec(entry)?.[1] ?? null
}

function normalizeAddonName(name) {
  return name.replace(/^@/, '').replace(/\//g, '__')
}

function readManifestAddons() {
  if (!fs.existsSync(manifestPath)) return []
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return Array.isArray(manifest.addons) ? manifest.addons : []
  } catch {
    return []
  }
}

// The backend bundle records the exact addon each `require.addon()` resolves
// to, so it is the authoritative list of what the notes worklet needs.
function readBackendBundleHeaderAddons() {
  const source = fs.readFileSync(backendBundlePath, 'utf8')
  const bundle = Buffer.from(JSON.parse(source.slice(source.indexOf('=') + 1).trim()))
  const newline = bundle.indexOf(0x0a)
  const headerLength = Number.parseInt(bundle.subarray(0, newline).toString(), 10)
  const header = JSON.parse(bundle.subarray(newline + 1, newline + headerLength).toString())
  return header.addons ?? []
}

function artifactId(fileName) {
  return fileName.replace(/^lib/, '').replace(/\.(?:xcframework|framework|so)$/, '')
}

function readBackendBundleArtifacts(hosts) {
  const ios = hosts.some((host) => host.startsWith('ios'))
  return readBackendBundleHeaderAddons()
    .map((addon) => addon.replace(/^linked:/, '').split('/')[0])
    .filter((entry) => (ios ? entry.endsWith('.framework') : entry.endsWith('.so')))
    .map(artifactId)
}

export function readBackendBundleAddons() {
  const names = new Set()
  for (const addon of readBackendBundleHeaderAddons()) {
    const artifact = addon
      .replace(/^linked:/, '')
      .split('/')
      .pop()
    const name = addonNameFromArtifact(artifact)
    if (name) names.add(name)
  }
  return [...names]
}

export function createLinkPackage() {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
  const dependencies = { ...pkg.dependencies }
  for (const name of EXCLUDED_DEPENDENCIES) delete dependencies[name]
  for (const addon of readManifestAddons()) {
    if (!dependencies[addon]) dependencies[addon] = '*'
  }
  return { ...pkg, dependencies }
}

function allowedAddonNames() {
  // Without the manifest we cannot tell an addon the on-device AI worker needs
  // from one bare-link dragged in, and pruning would quietly ship an app whose
  // AI features abort on first use. Fail instead, so the ordering bug is
  // visible at build time.
  if (fs.existsSync(qvacConfigPath) && !fs.existsSync(manifestPath)) {
    throw new Error(
      'qvac/addons.manifest.json is missing, so the on-device AI addons cannot be linked. ' +
        'Run `npm run native-addons` before linking.',
    )
  }
  const allowed = new Set(readBackendBundleAddons().map(normalizeAddonName))
  for (const addon of readManifestAddons()) allowed.add(normalizeAddonName(addon))
  return allowed
}

function pruneAddons(directory, allowed, pruned = []) {
  if (!fs.existsSync(directory)) return pruned
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory() && !XCFRAMEWORK.test(entry.name)) {
      pruneAddons(entryPath, allowed, pruned)
      continue
    }
    if (EXCLUDED_LIBRARIES.some((pattern) => pattern.test(entry.name))) {
      fs.rmSync(entryPath, { recursive: true, force: true })
      continue
    }
    const name = addonNameFromArtifact(entry.name)
    if (name === null || allowed.has(name)) continue
    fs.rmSync(entryPath, { recursive: true, force: true })
    pruned.push(entry.name)
  }
  return pruned
}

function collectLinkedAddons(directory, found = new Set(), artifacts = new Set()) {
  if (!fs.existsSync(directory)) return { names: found, artifacts }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !XCFRAMEWORK.test(entry.name)) {
      collectLinkedAddons(path.join(directory, entry.name), found, artifacts)
      continue
    }
    const name = addonNameFromArtifact(entry.name)
    if (!name) continue
    found.add(name)
    artifacts.add(artifactId(entry.name))
  }
  return { names: found, artifacts }
}

async function resolveSplitAddons(hosts) {
  const addonNames = readManifestAddons()
  if (addonNames.length === 0) return []
  const { resolvePlatformAddonRoots } = await import(pathToFileURL(platformAddonsResolverPath).href)
  const platforms = [...new Set(hosts.map((host) => host.split('-')[0]))]
  return platforms.flatMap((platform) =>
    resolvePlatformAddonRoots(projectRoot, addonNames, platform),
  )
}

export async function linkNativeAddons({ hosts, out }) {
  const outDir = out instanceof URL ? fileURLToPath(out) : out
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true })
  const written = []
  for await (const resource of link(projectRoot, { hosts, out: outDir }, createLinkPackage())) {
    written.push(resource)
  }
  for (const addon of await resolveSplitAddons(hosts)) {
    for await (const resource of link(addon.dir, { hosts, out: outDir }, addon.pkg)) {
      written.push(resource)
    }
  }

  const pruned = pruneAddons(outDir, allowedAddonNames())

  const { names: linked, artifacts: linkedArtifacts } = collectLinkedAddons(outDir)
  const missing = readBackendBundleArtifacts(hosts).filter((id) => !linkedArtifacts.has(id))
  if (missing.length) {
    throw new Error(
      `The backend worklet needs native addons that were not linked: ${missing.join(', ')}. ` +
        'The app would abort at launch, so refusing to build. If only the version differs, rebuild the backend bundle (`npm run bare-bundle`).',
    )
  }
  const missingAi = readManifestAddons().filter((name) => !linked.has(normalizeAddonName(name)))
  if (missingAi.length) {
    throw new Error(
      `The on-device AI worker needs native addons that were not linked: ${missingAi.join(', ')}. ` +
        'A split addon also needs its platform package (for example @qvac/fabric-ios) in package.json.',
    )
  }

  console.log(`Linked ${linked.size} native addons`)
  if (pruned.length) {
    console.log(`Skipped ${pruned.length} addons no bundle asks for: ${pruned.join(', ')}`)
  }
  return written
}
