const fs = require('fs')
const path = require('path')

const play = require('./playCredentials')

const ROOT = path.resolve(__dirname, '..')

const ansi = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
}

const ok = (message) => console.log(`${ansi.green}  ok${ansi.reset}  ${message}`)
const warn = (message) => console.log(`${ansi.yellow}  !!${ansi.reset}  ${message}`)
const detail = (message) => console.log(`${ansi.dim}      ${message}${ansi.reset}`)

function usage() {
  console.log(`
${ansi.bold}Google Play upload key${ansi.reset}

  node scripts/setup-play-key.js <path-to-key.json>   seal the key for release uploads
  node scripts/setup-play-key.js --check              show what is configured
  node scripts/setup-play-key.js --remove             forget the key

The service account JSON is encrypted with AES-256-GCM into
credentials/play-service-account.json.enc. The 32-byte wrapping key lives in
the macOS login keychain and never touches disk, argv or your shell history.

Neither half is useful alone. During a release the plaintext exists only as a
0600 file under $TMPDIR, for the seconds \`eas submit\` needs it.
`)
}

function check() {
  const found = play.describe()

  if (!found) {
    warn('no Play upload key configured — Android builds will not be uploaded')
    detail('run: node scripts/setup-play-key.js <path-to-key.json>')
    return
  }

  if (found.source === 'sealed') {
    ok(`sealed: ${found.email}`)
    detail(`project ${found.project}`)
    detail(`${path.relative(ROOT, play.SEALED_PATH)} + login keychain`)
    return
  }

  warn(`plaintext on disk: ${path.relative(ROOT, found.path)}`)
  detail(found.email)
  detail(`seal it: node scripts/setup-play-key.js ${path.relative(ROOT, found.path)}`)
}

function importKey(source) {
  const resolved = path.resolve(source)
  if (!fs.existsSync(resolved)) throw new play.PlayKeyError(`no such file: ${resolved}`)

  const json = fs.readFileSync(resolved, 'utf8')
  const key = play.parseKey(json, path.basename(resolved))

  play.store(json)

  ok(`sealed ${key.client_email}`)
  detail(`project ${key.project_id}`)
  detail(`${path.relative(ROOT, play.SEALED_PATH)} + login keychain`)

  const isPlaintextInRepo = resolved === play.PLAINTEXT_PATH
  console.log(`\n${ansi.bold}Now remove the plaintext copy.${ansi.reset}`)
  console.log(`\n  rm -P ${resolved}\n`)

  if (isPlaintextInRepo) {
    warn('that path is the one eas.json used to read — leaving it means the release still uses it')
  }

  console.log(
    'Google Cloud will not let you re-download this key. If this is your only copy,\nput it in your encrypted credential backup before deleting it.\n',
  )
}

function main() {
  const args = process.argv.slice(2)

  if (process.platform !== 'darwin') {
    throw new play.PlayKeyError(
      'the keychain store is macOS only',
      `On another OS, place the plaintext key at ${path.relative(ROOT, play.PLAINTEXT_PATH)} instead`,
    )
  }

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') return usage()
  if (args[0] === '--check') return check()

  if (args[0] === '--remove') {
    const removed = play.removeDataKey()
    if (fs.existsSync(play.SEALED_PATH)) fs.rmSync(play.SEALED_PATH, { force: true })
    if (removed) return ok('removed the wrapping key and the sealed file')
    return warn('nothing was stored')
  }

  return importKey(args[0])
}

try {
  main()
} catch (error) {
  console.error(`\n${ansi.red}FAILED${ansi.reset}  ${error.message}`)
  if (error.hint) console.error(`${ansi.dim}hint${ansi.reset}    ${error.hint}`)
  process.exit(1)
}
