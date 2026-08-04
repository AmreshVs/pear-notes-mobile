const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ARTIFACT_DIR = path.join(ROOT, 'build')

const PLATFORMS = ['ios', 'android']
const PROFILE = 'production'

function parseArgs(argv) {
  const args = {
    platform: null,
    profile: PROFILE,
    skipSubmit: false,
    skipPreflight: false,
    bump: true,
    commit: true,
    version: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--platform') args.platform = argv[++i]
    else if (arg === '--profile') args.profile = argv[++i]
    else if (arg === '--version') args.version = argv[++i]
    else if (arg === '--no-submit') args.skipSubmit = true
    else if (arg === '--no-bump') args.bump = false
    else if (arg === '--no-commit') args.commit = false
    else if (arg === '--skip-preflight') args.skipPreflight = true
  }

  return args
}

function heading(text) {
  console.log(`\n\x1b[1m==> ${text}\x1b[0m`)
}

function abort(message) {
  console.error(`\n\x1b[31mrelease failed: ${message}\x1b[0m\n`)
  process.exit(1)
}

function sh(command, description) {
  heading(description ?? command)
  const result = spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true })
  if (result.status !== 0) abort(`\`${command}\` exited with code ${result.status}`)
}

function capture(command) {
  try {
    return execSync(command, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function resolvePlatforms(platform) {
  if (!platform) abort('--platform is required (ios | android | all)')
  if (platform === 'all') return PLATFORMS
  if (!PLATFORMS.includes(platform)) abort(`unknown platform "${platform}"`)
  return [platform]
}

function readVersion() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
  return appJson.expo.version
}

function readBuildNumber() {
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8')
  return Number(gradle.match(/versionCode\s+(\d+)/)?.[1] ?? 0)
}

function artifactPath(platform, version, buildNumber) {
  const extension = platform === 'ios' ? 'ipa' : 'aab'
  return path.join(ARTIFACT_DIR, `pear-notes-${version}-${buildNumber}.${extension}`)
}

function prepareSources() {
  sh('npm ci', 'Installing dependencies from lockfile')
  sh('npm run bare-bundle', 'Bundling the Bare backend worklet')
  // sh('npm run typecheck', 'Type checking')
  sh('npm run lint', 'Linting')
}

function applyVersion({ bump, version }) {
  if (!bump && !version) return
  const flags = [version ? `--version ${version}` : '', bump ? '--bump' : '']
    .filter(Boolean)
    .join(' ')
  sh(`node scripts/set-version.js ${flags}`, 'Setting release version')
}

function commitVersion({ commit, version, buildNumber }) {
  if (capture('git status --porcelain') === '') return

  if (!commit) {
    abort(
      'version files changed but --no-commit was set. eas.json has requireCommit enabled, so the ' +
        'build would not match a commit. Commit manually or drop --no-commit.',
    )
  }

  sh(
    `git commit -am "Release ${version} (${buildNumber})"`,
    `Committing version bump ${version} (${buildNumber})`,
  )
}

function buildLocally(platform, profile, version, buildNumber) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  const output = artifactPath(platform, version, buildNumber)

  sh(
    `eas build --local --non-interactive --platform ${platform} --profile ${profile} --output "${output}"`,
    `Building ${platform} ${version} (${buildNumber}) locally`,
  )

  if (!fs.existsSync(output)) abort(`expected artifact was not produced at ${output}`)
  console.log(`\n  artifact: ${path.relative(ROOT, output)}`)
  return output
}

function playServiceAccountKey(profile) {
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'))
  const keyPath = easJson.submit?.[profile]?.android?.serviceAccountKeyPath
  if (!keyPath) return null
  return fs.existsSync(path.join(ROOT, keyPath)) ? keyPath : null
}

function submit(platform, profile, artifact) {
  if (platform === 'android' && !playServiceAccountKey(profile)) {
    heading('Skipping Play upload - no service account key')
    console.log(`  Upload manually: ${path.relative(ROOT, artifact)}`)
    console.log('  Play Console -> Testing -> Internal testing -> Create new release')
    return
  }

  sh(
    `eas submit --non-interactive --platform ${platform} --profile ${profile} --path "${artifact}"`,
    `Submitting ${platform} build to the store`,
  )
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const platforms = resolvePlatforms(args.platform)

  if (platforms.includes('ios') && process.platform !== 'darwin') {
    abort('local iOS builds require macOS')
  }

  if (!args.skipPreflight) {
    heading('Running release preflight')
    const preflight = spawnSync('node', ['scripts/preflight.js'], { cwd: ROOT, stdio: 'inherit' })
    if (preflight.status !== 0) abort('preflight checks did not pass')
  }

  prepareSources()
  applyVersion(args)

  const version = readVersion()
  const buildNumber = readBuildNumber()

  commitVersion({ commit: args.commit, version, buildNumber })

  const commit = capture('git rev-parse --short HEAD')
  heading(`Releasing Pear Notes ${version} (build ${buildNumber}) from ${commit}`)

  const artifacts = []
  for (const platform of platforms) {
    artifacts.push({ platform, file: buildLocally(platform, args.profile, version, buildNumber) })
  }

  if (args.skipSubmit) {
    console.log('\n  --no-submit set, skipping store upload.')
  } else {
    for (const { platform, file } of artifacts) submit(platform, args.profile, file)
  }

  console.log(`\n\x1b[32mDone.\x1b[0m Pear Notes ${version} (${buildNumber}) from ${commit}`)
  console.log(`  Tag and push the release:`)
  console.log(`    git tag v${version}+${buildNumber} && git push --follow-tags\n`)
}

main()
