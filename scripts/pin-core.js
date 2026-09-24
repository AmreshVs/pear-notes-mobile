const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CORE_ROOT = path.resolve(ROOT, '..', 'pear-notes-core')
const DEPENDENCY = '@pear-notes/core'
const COMMIT_PATHS = ['package.json', 'package-lock.json']
const NO_COMMIT = process.argv.slice(2).includes('--no-commit')

function installPinnedCore() {
  fs.rmSync(path.join(ROOT, 'node_modules', DEPENDENCY), { recursive: true, force: true })
  execSync('npm install --no-audit --no-fund', { cwd: ROOT, stdio: 'inherit' })
}

function abort(message) {
  console.error(`\n  pin-core: ${message}\n`)
  process.exit(1)
}

function coreGit(command) {
  try {
    return execSync(`git -C "${CORE_ROOT}" ${command}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function repoGit(command, { inherit = false } = {}) {
  try {
    const out = execSync(`git -C "${ROOT}" ${command}`, {
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'ignore'],
    })
    return inherit ? '' : out.toString().trim()
  } catch {
    return null
  }
}

function commitBlocker() {
  if (NO_COMMIT) return 'skipped (--no-commit)'
  if (!fs.existsSync(path.join(ROOT, '.git'))) return 'this package is not a git checkout'
  const dirty = repoGit(`status --porcelain -- ${COMMIT_PATHS.join(' ')}`)
  if (dirty === null) return 'could not read git status'
  if (dirty) return `${COMMIT_PATHS.join(' / ')} already had uncommitted changes`
  return null
}

function commitPin(sha) {
  const message = `Bump core to ${sha.slice(0, 12)}`
  const committed = repoGit(`commit -m "${message}" -- ${COMMIT_PATHS.join(' ')}`, {
    inherit: true,
  })
  if (committed === null) {
    console.log(`\n  pin-core: commit failed - commit ${COMMIT_PATHS.join(' and ')} by hand\n`)
    return false
  }
  console.log(`\n  pin-core: committed "${message}"`)
  return true
}

function readPackageJson() {
  const file = path.join(ROOT, 'package.json')
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

function resolveSlug(spec) {
  const withoutRef = spec.split('#')[0]
  const slug = withoutRef.replace(/^github:/, '')
  if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) {
    abort(`cannot derive a GitHub slug from "${spec}" - pin ${DEPENDENCY} by hand`)
  }
  return slug
}

function main() {
  if (!fs.existsSync(path.join(CORE_ROOT, '.git'))) {
    abort(`${CORE_ROOT} is not a git checkout - clone pear-notes-core next to this repo`)
  }

  const dirty = coreGit('status --porcelain')
  if (dirty) {
    abort(
      `pear-notes-core has ${dirty.split('\n').length} uncommitted file(s) - EAS installs core ` +
        'from a commit, so commit and push them before pinning',
    )
  }

  const sha = coreGit('rev-parse HEAD')
  if (!sha) abort('could not read pear-notes-core HEAD')

  if (!coreGit(`branch -r --contains ${sha}`)) {
    abort(`core ${sha.slice(0, 12)} is not on any remote branch - push pear-notes-core first`)
  }

  const blocker = commitBlocker()

  const { file, json } = readPackageJson()
  const previous = json.dependencies?.[DEPENDENCY]
  if (!previous) abort(`${DEPENDENCY} is not a dependency of this package`)

  const pinned = `github:${resolveSlug(previous)}#${sha}`
  if (previous === pinned) {
    console.log(
      `\n  pin-core: already pinned to ${sha.slice(0, 12)}, refreshing the installed copy\n`,
    )
    installPinnedCore()
    return
  }

  json.dependencies[DEPENDENCY] = pinned
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)

  installPinnedCore()

  console.log(`\n  pin-core: ${DEPENDENCY} pinned to ${sha.slice(0, 12)}`)

  if (blocker) {
    console.log(`  not committing - ${blocker}`)
    console.log(`  commit ${COMMIT_PATHS.join(' and ')} together\n`)
    return
  }

  if (commitPin(sha)) console.log('  push it before starting the build\n')
}

main()
