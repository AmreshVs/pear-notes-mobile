import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import link from 'bare-link'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'qvac', 'addons.manifest.json')
const EXCLUDED_DEPENDENCIES = ['@qvac/sdk']
const EXCLUDED_LIBRARIES = [/ggml-vulkan/]

function readManifestAddons() {
  if (!fs.existsSync(manifestPath)) return []
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return Array.isArray(manifest.addons) ? manifest.addons : []
  } catch {
    return []
  }
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

function removeExcludedLibraries(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      removeExcludedLibraries(entryPath)
    } else if (EXCLUDED_LIBRARIES.some((pattern) => pattern.test(entry.name))) {
      fs.rmSync(entryPath, { force: true })
    }
  }
}

export async function linkNativeAddons({ hosts, out }) {
  const outDir = out instanceof URL ? fileURLToPath(out) : out
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true })
  const written = []
  for await (const resource of link(projectRoot, { hosts, out: outDir }, createLinkPackage())) {
    written.push(resource)
    console.log('Wrote', resource)
  }
  removeExcludedLibraries(outDir)
  return written
}
