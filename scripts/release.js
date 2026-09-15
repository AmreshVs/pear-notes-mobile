const { execSync, spawn, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const asc = require('./ascCredentials')
const play = require('./playCredentials')
const playUpload = require('./playUpload')
const { formatDuration, startHeartbeat } = require('./progress')

const ROOT = path.resolve(__dirname, '..')
const ARTIFACT_DIR = path.join(ROOT, 'build')

const PLATFORMS = ['ios', 'android']
const PROFILE = 'production'

const cleanups = []
let viaEas = false

function parseArgs(argv) {
  const args = {
    platform: null,
    profile: PROFILE,
    skipSubmit: false,
    skipPreflight: false,
    submitOnly: false,
    viaEas: false,
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
    else if (arg === '--submit-only') args.submitOnly = true
    else if (arg === '--via-eas') args.viaEas = true
  }

  return args
}

function heading(text) {
  console.log(`\n\x1b[1m==> ${text}\x1b[0m`)
}

function runCleanups() {
  while (cleanups.length) {
    try {
      cleanups.pop()()
    } catch {}
  }
}

function abort(message) {
  runCleanups()
  console.error(`\n\x1b[31mrelease failed: ${message}\x1b[0m\n`)
  process.exit(1)
}

function sh(command, description, options = {}) {
  heading(description ?? command)
  const started = Date.now()
  const stop = options.heartbeat ? startHeartbeat(options.heartbeat, started) : null

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...(options.env ?? {}) },
    })

    const finish = (status) => {
      if (stop) stop()
      const durationMs = Date.now() - started

      if (status !== 0) {
        const failure = `\`${command}\` exited with code ${status}`
        if (!options.allowFailure) abort(failure)
        console.log(`\x1b[31m    failed after ${formatDuration(durationMs)}\x1b[0m`)
        return resolve({ status, durationMs, failure })
      }

      console.log(`\x1b[2m    took ${formatDuration(durationMs)}\x1b[0m`)
      resolve({ status: 0, durationMs })
    }

    child.on('error', () => finish(1))
    child.on('close', finish)
  })
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

function readSubmitProfile(profile) {
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'))
  return easJson.submit?.[profile]?.ios ?? {}
}

function appleEnv(profile) {
  const { appleTeamId } = readSubmitProfile(profile)

  if (!appleTeamId) {
    abort(
      `eas.json submit.${profile}.ios.appleTeamId is not set.\n` +
        '  Without it "eas build" stops to ask for the Apple Team ID and the release is no longer ' +
        'unattended.',
    )
  }

  return {
    EXPO_APPLE_TEAM_ID: appleTeamId,
    EXPO_APPLE_TEAM_TYPE: process.env.EXPO_APPLE_TEAM_TYPE ?? 'INDIVIDUAL',
  }
}

function artifactPath(platform, version, buildNumber) {
  const extension = platform === 'ios' ? 'ipa' : 'aab'
  return path.join(ARTIFACT_DIR, `pear-notes-${version}-${buildNumber}.${extension}`)
}

async function prepareNativeAddons() {
  await sh('node scripts/patch-bare-kit-linker.mjs', 'Patching the react-native-bare-kit linkers')
  await sh('node scripts/build-qvac-bundle.mjs', 'Building the on-device AI worker bundle')
}

async function prepareSources() {
  await sh('npm run lint', 'Linting')
  await sh('npm run bare-bundle', 'Bundling the Bare backend worklet')
}

async function applyVersion({ bump, version }) {
  if (!bump && !version) return
  const flags = [version ? `--version ${version}` : '', bump ? '--bump' : '']
    .filter(Boolean)
    .join(' ')
  await sh(`node scripts/set-version.js ${flags}`, 'Setting release version')
}

async function commitVersion({ commit, version, buildNumber }) {
  if (capture('git status --porcelain') === '') return

  if (!commit) {
    abort(
      'version files changed but --no-commit was set. eas.json has requireCommit enabled, so the ' +
        'build would not match a commit. Commit manually or drop --no-commit.',
    )
  }

  await sh(
    `git commit -am "Release ${version} (${buildNumber})"`,
    `Committing version bump ${version} (${buildNumber})`,
  )
}

async function buildLocally(platform, profile, version, buildNumber) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  const output = artifactPath(platform, version, buildNumber)

  const { status, failure } = await sh(
    `eas build --local --non-interactive --platform ${platform} --profile ${profile} --output "${output}"`,
    `Building ${platform} ${version} (${buildNumber}) locally`,
    {
      heartbeat: `still building ${platform}`,
      allowFailure: true,
      env: platform === 'ios' ? appleEnv(profile) : {},
    },
  )

  if (status !== 0) return { file: null, failure }

  if (!fs.existsSync(output)) {
    return { file: null, failure: `expected artifact was not produced at ${output}` }
  }

  const sizeMb = (fs.statSync(output).size / 1e6).toFixed(1)
  console.log(`\n  artifact: ${path.relative(ROOT, output)} (${sizeMb} MB)`)
  return { file: output, failure: null }
}

function resolvePlayKey() {
  try {
    return play.materialize()
  } catch (error) {
    abort(`${error.message}${error.hint ? `\n  hint: ${error.hint}` : ''}`)
  }
}

async function submitIos(artifact) {
  let config
  try {
    config = asc.resolve()
    asc.requirePrivateKey(config.ASC_KEY_ID)
  } catch (error) {
    console.error(`\n\x1b[31m  ${error.message}\x1b[0m`)
    if (error.hint) console.error(`  hint: ${error.hint}`)
    return { skipped: false, failure: error.message }
  }

  console.log(`\n  App Store Connect key: ${config.ASC_KEY_ID} (${config.source})`)

  const { failure } = await sh(
    `xcrun altool --upload-app -f "${artifact}" -t ios --apiKey ${config.ASC_KEY_ID} --apiIssuer ${config.ASC_ISSUER_ID}`,
    'Uploading ios build to App Store Connect',
    { heartbeat: 'still uploading ios', allowFailure: true },
  )

  if (!failure) {
    console.log('\n  Processing takes about 5-10 minutes before the build appears in TestFlight.')
  }

  return { skipped: false, failure }
}

function androidSubmitConfig(profile) {
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'))
  const android = easJson.submit?.[profile]?.android ?? {}
  return {
    track: android.track ?? 'internal',
    releaseStatus: android.releaseStatus ?? 'completed',
    changesNotSentForReview: android.changesNotSentForReview ?? false,
  }
}

async function submitAndroidDirect(artifact, profile, version, buildNumber) {
  const config = androidSubmitConfig(profile)
  heading('Uploading android build to Google Play')
  console.log(`  ${config.track} track, release status ${config.releaseStatus}`)

  const started = Date.now()
  const sizeMb = fs.statSync(artifact).size / 1e6
  let lastPercent = -1

  const onProgress = (sent, total) => {
    const percent = Math.floor((sent / total) * 100)
    if (percent === lastPercent || percent % 10 !== 0) return
    lastPercent = percent
    console.log(
      `\x1b[2m    ${String(percent).padStart(3)}%  ${(sent / 1e6).toFixed(0)}/${sizeMb.toFixed(0)} MB\x1b[0m`,
    )
  }

  try {
    const result = await playUpload.submit({
      packageName: readAndroidPackage(),
      aabPath: artifact,
      ...config,
      releaseName: `${version} (${buildNumber})`,
      onProgress,
      onStep: (step) => console.log(`\x1b[2m    ${step}\x1b[0m`),
    })

    console.log(
      `\x1b[2m    took ${formatDuration(Date.now() - started)}\x1b[0m\n` +
        `  versionCode ${result.versionCode} is now ${result.releaseStatus} on the ${result.track} track`,
    )
    return { skipped: false, failure: null }
  } catch (error) {
    console.error(`\n\x1b[31m  ${error.message}\x1b[0m`)
    if (error.hint) console.error(`  hint: ${error.hint}`)
    console.error(`  Retry through EAS instead: npm run release:android -- --submit-only --via-eas`)
    return { skipped: false, failure: error.message }
  }
}

function readAndroidPackage() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
  return appJson.expo.android.package
}

async function submit(platform, profile, artifact, version, buildNumber) {
  if (platform === 'ios') return submitIos(artifact)

  const hasKey = (() => {
    try {
      return Boolean(play.describe())
    } catch {
      return false
    }
  })()

  if (hasKey && !viaEas) {
    return submitAndroidDirect(artifact, profile, version, buildNumber)
  }

  const env = {}

  if (platform === 'android') {
    const key = resolvePlayKey()

    if (!key) {
      heading('Skipping Play upload - no upload key configured')
      console.log(`  Configure it once:  node scripts/setup-play-key.js <path-to-key.json>`)
      console.log(`  Or upload by hand:  ${path.relative(ROOT, artifact)}`)
      console.log('  Play Console -> Testing -> Internal testing -> Create new release')
      return { skipped: true, failure: null }
    }

    cleanups.push(key.cleanup)
    env[play.ENV_VAR] = key.path
    console.log(`\n  Play upload key: ${key.email} (${key.source})`)
  }

  try {
    const { failure } = await sh(
      `eas submit --non-interactive --platform ${platform} --profile ${profile} --path "${artifact}"`,
      `Submitting ${platform} build to the store`,
      { env, heartbeat: `still uploading ${platform}`, allowFailure: true },
    )
    return { skipped: false, failure }
  } finally {
    runCleanups()
  }
}

function summarise(outcomes, totalMs) {
  const width = Math.max(...outcomes.map((o) => o.platform.length))

  console.log(`\n\x1b[1mSummary\x1b[0m`)
  for (const outcome of outcomes) {
    const mark =
      outcome.status === 'ok'
        ? '\x1b[32mok     \x1b[0m'
        : outcome.status === 'skipped'
          ? '\x1b[33mskipped\x1b[0m'
          : '\x1b[31mFAILED \x1b[0m'
    console.log(`  ${mark}  ${outcome.platform.padEnd(width)}  ${outcome.detail}`)
  }
  console.log(`\n  \x1b[2mtotal ${formatDuration(totalMs)}\x1b[0m`)
}

function finish(outcomes, totalMs, version, buildNumber, commit) {
  summarise(outcomes, totalMs)

  const failed = outcomes.filter((o) => o.status === 'failed')

  if (failed.length === 0) {
    console.log(
      `\n\x1b[32mDone.\x1b[0m Pear Notes ${version} (${buildNumber})${commit ? ` from ${commit}` : ''}`,
    )
    console.log(`  Tag and push the release:`)
    console.log(`    git tag v${version}+${buildNumber} && git push --follow-tags\n`)
    return
  }

  console.log(
    `\n\x1b[31m${failed.length} of ${outcomes.length} platform(s) failed.\x1b[0m ` +
      'The others completed and are unaffected.',
  )
  console.log('  Fix the cause, then retry just the failures without rebuilding:')
  for (const outcome of failed) {
    console.log(`    npm run release:${outcome.platform} -- --submit-only`)
  }
  console.log('')
  process.exitCode = 1
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const platforms = resolvePlatforms(args.platform)
  const started = Date.now()

  viaEas = args.viaEas

  if (platforms.includes('ios') && process.platform !== 'darwin') {
    abort('local iOS builds require macOS')
  }

  if (args.submitOnly) {
    const version = readVersion()
    const buildNumber = readBuildNumber()
    heading(`Submitting existing artifacts for ${version} (${buildNumber})`)

    const outcomes = []
    for (const platform of platforms) {
      const file = artifactPath(platform, version, buildNumber)

      if (!fs.existsSync(file)) {
        console.error(`\n\x1b[31m  no artifact at ${path.relative(ROOT, file)}\x1b[0m`)
        console.error('  --submit-only uploads what a previous run built. Drop the flag to build.')
        outcomes.push({ platform, status: 'failed', detail: 'no artifact on disk' })
        continue
      }

      const result = await submit(platform, args.profile, file, version, buildNumber)
      outcomes.push({
        platform,
        status: result.skipped ? 'skipped' : result.failure ? 'failed' : 'ok',
        detail: result.skipped ? 'no upload key' : result.failure ? 'submit failed' : 'submitted',
      })
    }

    finish(outcomes, Date.now() - started, version, buildNumber, null)
    return
  }

  await prepareNativeAddons()

  if (!args.skipPreflight) {
    heading('Running release preflight')
    const preflight = spawnSync('node', ['scripts/preflight.js'], { cwd: ROOT, stdio: 'inherit' })
    if (preflight.status !== 0) abort('preflight checks did not pass')
  }

  await prepareSources()
  await applyVersion(args)

  const version = readVersion()
  const buildNumber = readBuildNumber()

  await commitVersion({ commit: args.commit, version, buildNumber })

  const commit = capture('git rev-parse --short HEAD')
  heading(`Releasing Pear Notes ${version} (build ${buildNumber}) from ${commit}`)

  const outcomes = []

  for (const platform of platforms) {
    const { file, failure } = await buildLocally(platform, args.profile, version, buildNumber)

    if (failure) {
      console.error(`\n\x1b[31m  ${platform} build failed: ${failure}\x1b[0m`)
      console.error('  Continuing with the remaining platforms.')
      outcomes.push({ platform, status: 'failed', detail: 'build failed' })
      continue
    }

    if (args.skipSubmit) {
      outcomes.push({
        platform,
        status: 'ok',
        detail: `built, not uploaded (${path.relative(ROOT, file)})`,
      })
      continue
    }

    const result = await submit(platform, args.profile, file, version, buildNumber)

    if (result.skipped) {
      outcomes.push({ platform, status: 'skipped', detail: 'built, no upload key' })
      continue
    }

    if (result.failure) {
      console.error(`\n\x1b[31m  ${platform} submit failed.\x1b[0m The build is kept at`)
      console.error(`  ${path.relative(ROOT, file)} — retry with --submit-only, no rebuild needed.`)
      outcomes.push({ platform, status: 'failed', detail: 'built ok, submit failed' })
      continue
    }

    outcomes.push({ platform, status: 'ok', detail: 'built and submitted' })
  }

  finish(outcomes, Date.now() - started, version, buildNumber, commit)
}

process.on('exit', runCleanups)
process.on('SIGINT', () => {
  runCleanups()
  process.exit(130)
})
process.on('SIGTERM', () => {
  runCleanups()
  process.exit(143)
})

main().catch((error) => abort(error.message))
