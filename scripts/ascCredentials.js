const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCAL_CONFIG = path.join(ROOT, '.release.ios.env')
const DESKTOP_CONFIG = path.resolve(ROOT, '..', 'pear-notes-desktop', '.release.mac.env')
const KEYS = ['ASC_KEY_ID', 'ASC_ISSUER_ID']

class AscError extends Error {
  constructor(message, hint) {
    super(message)
    this.hint = hint
  }
}

function parseEnvFile(file) {
  const values = {}
  if (!fs.existsSync(file)) return values

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    values[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return values
}

function resolve() {
  const sources = [
    { label: 'environment', values: process.env },
    { label: path.relative(ROOT, LOCAL_CONFIG), values: parseEnvFile(LOCAL_CONFIG) },
    { label: '../pear-notes-desktop/.release.mac.env', values: parseEnvFile(DESKTOP_CONFIG) },
  ]

  for (const source of sources) {
    if (KEYS.every((key) => source.values[key])) {
      const config = Object.fromEntries(KEYS.map((key) => [key, source.values[key]]))
      return { ...config, source: source.label }
    }
  }

  throw new AscError(
    `ASC_KEY_ID and ASC_ISSUER_ID are not configured`,
    `Copy .release.ios.env.example to .release.ios.env and fill it in, or export both variables`,
  )
}

function privateKeyPath(keyId) {
  return path.join(process.env.HOME, '.appstoreconnect', 'private_keys', `AuthKey_${keyId}.p8`)
}

function requirePrivateKey(keyId) {
  const file = privateKeyPath(keyId)
  if (!fs.existsSync(file)) {
    throw new AscError(
      `App Store Connect key not found: ${file}`,
      'The filename must be exactly AuthKey_<KEYID>.p8 - altool searches for it by name',
    )
  }
  return file
}

module.exports = {
  AscError,
  DESKTOP_CONFIG,
  LOCAL_CONFIG,
  privateKeyPath,
  requirePrivateKey,
  resolve,
}
