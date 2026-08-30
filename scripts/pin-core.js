const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CORE_ROOT = path.resolve(ROOT, '..', 'pear-notes-core')
const DEPENDENCY = '@pear-notes/core'

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

  const { file, json } = readPackageJson()
  const previous = json.dependencies?.[DEPENDENCY]
  if (!previous) abort(`${DEPENDENCY} is not a dependency of this package`)

  const pinned = `github:${resolveSlug(previous)}#${sha}`
  if (previous === pinned) {
    console.log(`\n  pin-core: already pinned to ${sha.slice(0, 12)}\n`)
    return
  }

  json.dependencies[DEPENDENCY] = pinned
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)

  execSync('npm install --package-lock-only --no-audit --no-fund', {
    cwd: ROOT,
    stdio: 'inherit',
  })

  console.log(`\n  pin-core: ${DEPENDENCY} pinned to ${sha.slice(0, 12)}`)
  console.log('  commit package.json and package-lock.json together\n')
}

main()
