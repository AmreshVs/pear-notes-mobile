import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import link from 'bare-link'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'qvac', 'addons.manifest.json')
const qvacConfigPath = path.join(projectRoot, 'qvac.config.json')
const backendBundlePath = path.join(projectRoot, 'src', 'backend', 'backend.bundle.js')
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
export function readBackendBundleAddons() {
  const source = fs.readFileSync(backendBundlePath, 'utf8')
  const bundle = Buffer.from(JSON.parse(source.slice(source.indexOf('=') + 1).trim()))
  const newline = bundle.indexOf(0x0a)
  const headerLength = Number.parseInt(bundle.subarray(0, newline).toString(), 10)
  const header = JSON.parse(bundle.subarray(newline + 1, newline + headerLength).toString())
  const names = new Set()
  for (const addon of header.addons ?? []) {
    const artifact = addon.replace(/^linked:/, '').split('/').pop()
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
        'Run `npm run qvac-bundle` before linking.',
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

function collectLinkedAddons(directory, found = new Set()) {
  if (!fs.existsSync(directory)) return found
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !XCFRAMEWORK.test(entry.name)) {
      collectLinkedAddons(path.join(directory, entry.name), found)
      continue
    }
    const name = addonNameFromArtifact(entry.name)
    if (name) found.add(name)
  }
  return found
}

export async function linkNativeAddons({ hosts, out }) {
  const outDir = out instanceof URL ? fileURLToPath(out) : out
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true })
  const written = []
  for await (const resource of link(projectRoot, { hosts, out: outDir }, createLinkPackage())) {
    written.push(resource)
  }

  const pruned = pruneAddons(outDir, allowedAddonNames())

  const linked = collectLinkedAddons(outDir)
  const missing = readBackendBundleAddons()
    .map(normalizeAddonName)
    .filter((name) => !linked.has(name))
  if (missing.length) {
    throw new Error(
      `The backend worklet needs native addons that were not linked: ${missing.join(', ')}. ` +
        'The app would abort at launch, so refusing to build.',
    )
  }

  console.log(`Linked ${linked.size} native addons`)
  if (pruned.length) {
    console.log(`Skipped ${pruned.length} addons no bundle asks for: ${pruned.join(', ')}`)
  }
  return written
}
