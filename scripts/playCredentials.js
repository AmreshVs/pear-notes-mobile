const crypto = require('crypto')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const KEYCHAIN_SERVICE = 'pear-notes-play-upload-key'
const KEYCHAIN_ACCOUNT = 'eas-submit'
const ENV_VAR = 'PEAR_NOTES_PLAY_SERVICE_ACCOUNT_KEY'
const CREDENTIALS_DIR = path.join(ROOT, 'credentials')
const SEALED_PATH = path.join(CREDENTIALS_DIR, 'play-service-account.json.enc')
const PLAINTEXT_PATH = path.join(CREDENTIALS_DIR, 'play-service-account.json')

const MAGIC = Buffer.from('PNPK')
const VERSION = 1
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32
const REQUIRED_FIELDS = ['type', 'project_id', 'private_key', 'client_email']

class PlayKeyError extends Error {
  constructor(message, hint) {
    super(message)
    this.hint = hint
  }
}

function parseKey(json, source) {
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new PlayKeyError(
      `${source} does not contain valid JSON`,
      'Re-download it from Google Cloud console -> Service accounts -> Keys -> Add key -> JSON',
    )
  }

  const missing = REQUIRED_FIELDS.filter((field) => !parsed[field])
  if (missing.length) {
    throw new PlayKeyError(
      `${source} is missing ${missing.join(', ')}`,
      'This does not look like a service account key. Check you downloaded the JSON key rather than an OAuth client secret',
    )
  }

  if (parsed.type !== 'service_account') {
    throw new PlayKeyError(
      `${source} has type "${parsed.type}", expected "service_account"`,
      'An OAuth client id authenticates and then fails the upload with a 403',
    )
  }

  return parsed
}

function readDataKey() {
  const result = spawnSync(
    'security',
    ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', KEYCHAIN_ACCOUNT, '-w'],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) return null

  const encoded = result.stdout.trim()
  if (!encoded) return null

  const key = Buffer.from(encoded, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new PlayKeyError(
      `the keychain item holds ${key.length} bytes, expected ${KEY_BYTES}`,
      'Re-run: node scripts/setup-play-key.js <path-to-key.json>',
    )
  }
  return key
}

function writeDataKey(key) {
  const encoded = key.toString('base64')
  const result = spawnSync(
    'security',
    [
      'add-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      KEYCHAIN_ACCOUNT,
      '-D',
      'Pear Notes release credential',
      '-j',
      'Wrapping key for credentials/play-service-account.json.enc',
      '-U',
      '-T',
      '/usr/bin/security',
      '-w',
    ],
    { input: `${encoded}\n${encoded}\n`, encoding: 'utf8' },
  )

  if (result.status !== 0) {
    throw new PlayKeyError(
      `security add-generic-password exited with ${result.status}`,
      (result.stderr ?? '').trim() || undefined,
    )
  }

  const roundTrip = readDataKey()
  if (!roundTrip || !crypto.timingSafeEqual(roundTrip, key)) {
    throw new PlayKeyError('the wrapping key did not survive the round trip through the keychain')
  }
}

function removeDataKey() {
  const result = spawnSync(
    'security',
    ['delete-generic-password', '-s', KEYCHAIN_SERVICE, '-a', KEYCHAIN_ACCOUNT],
    { encoding: 'utf8' },
  )
  return result.status === 0
}

function seal(json, key) {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const header = Buffer.concat([MAGIC, Buffer.from([VERSION])])
  cipher.setAAD(header)
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  return Buffer.concat([header, iv, cipher.getAuthTag(), ciphertext])
}

function unseal(sealed, key) {
  if (sealed.length < MAGIC.length + 1 + IV_BYTES + TAG_BYTES) {
    throw new PlayKeyError('the sealed key file is truncated')
  }
  if (!sealed.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new PlayKeyError(`${path.relative(ROOT, SEALED_PATH)} is not a sealed Play key`)
  }

  const version = sealed[MAGIC.length]
  if (version !== VERSION) {
    throw new PlayKeyError(`sealed key format v${version} is not supported`)
  }

  const header = sealed.subarray(0, MAGIC.length + 1)
  let offset = header.length
  const iv = sealed.subarray(offset, (offset += IV_BYTES))
  const tag = sealed.subarray(offset, (offset += TAG_BYTES))
  const ciphertext = sealed.subarray(offset)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(header)
  decipher.setAuthTag(tag)

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new PlayKeyError(
      'could not decrypt the sealed Play key',
      'The keychain wrapping key does not match this file. Re-run: node scripts/setup-play-key.js <path-to-key.json>',
    )
  }
}

function store(json) {
  parseKey(json, 'the key')
  const key = crypto.randomBytes(KEY_BYTES)
  writeDataKey(key)
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true })
  fs.writeFileSync(SEALED_PATH, seal(json, key), { mode: 0o600 })

  const verified = load()
  if (!verified || verified !== json) {
    throw new PlayKeyError('the key did not survive the seal/unseal round trip')
  }
}

function load() {
  if (!fs.existsSync(SEALED_PATH)) return null
  const key = readDataKey()
  if (!key) {
    throw new PlayKeyError(
      `${path.relative(ROOT, SEALED_PATH)} exists but its keychain wrapping key is missing`,
      'Re-run: node scripts/setup-play-key.js <path-to-key.json>',
    )
  }
  return unseal(fs.readFileSync(SEALED_PATH), key)
}

function describe() {
  const sealed = load()
  if (sealed) {
    const key = parseKey(sealed, 'the sealed key')
    return { source: 'sealed', email: key.client_email, project: key.project_id }
  }

  if (fs.existsSync(PLAINTEXT_PATH)) {
    const key = parseKey(
      fs.readFileSync(PLAINTEXT_PATH, 'utf8'),
      path.relative(ROOT, PLAINTEXT_PATH),
    )
    return {
      source: 'plaintext',
      email: key.client_email,
      project: key.project_id,
      path: PLAINTEXT_PATH,
    }
  }

  return null
}

function materialize() {
  const sealed = load()
  if (sealed) {
    const key = parseKey(sealed, 'the sealed key')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-notes-play-'))
    fs.chmodSync(dir, 0o700)
    const file = path.join(dir, 'play-service-account.json')
    fs.writeFileSync(file, sealed, { mode: 0o600 })

    return {
      path: file,
      source: 'sealed',
      email: key.client_email,
      cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    }
  }

  if (fs.existsSync(PLAINTEXT_PATH)) {
    const key = parseKey(
      fs.readFileSync(PLAINTEXT_PATH, 'utf8'),
      path.relative(ROOT, PLAINTEXT_PATH),
    )
    return { path: PLAINTEXT_PATH, source: 'plaintext', email: key.client_email, cleanup: () => {} }
  }

  return null
}

module.exports = {
  ENV_VAR,
  KEYCHAIN_SERVICE,
  PLAINTEXT_PATH,
  PlayKeyError,
  SEALED_PATH,
  describe,
  load,
  materialize,
  parseKey,
  removeDataKey,
  store,
}
