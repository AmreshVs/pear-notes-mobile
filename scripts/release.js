const { execSync, spawn, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const asc = require('./ascCredentials')
const play = require('./playCredentials')
const playUpload = require('./playUpload')
const { formatDuration, startHeartbeat } = require('./progress')
const { storeBuild } = require('./store-build')
const { findIosXcode, macSdkPath, MAX_IOS_SDK_MAJOR } = require('./xcode')

const ROOT = path.resolve(__dirname, '..')
const ARTIFACT_DIR = path.join(ROOT, 'build')

const PLATFORMS = ['ios', 'android']
const PROFILE = 'production'
const APK_PROFILE = 'production-apk'
const ANDROID_PACKAGES = ['aab', 'apk', 'both']

let parallel = false

function parseArgs(argv) {
  const args = {
    platform: null,
    profile: PROFILE,
    skipSubmit: false,
    skipPreflight: false,
    submitOnly: false,
    parallel: false,
    androidPackage: 'aab',
    bump: false,
    commit: true,
    version: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--platform') args.platform = argv[++i]
    else if (arg === '--profile') args.profile = argv[++i]
    else if (arg === '--version') args.version = argv[++i]
    else if (arg === '--no-submit') args.skipSubmit = true
    else if (arg === '--bump') args.bump = true
    else if (arg === '--no-commit') args.commit = false
    else if (arg === '--skip-preflight') args.skipPreflight = true
    else if (arg === '--submit-only') args.submitOnly = true
    else if (arg === '--parallel') args.parallel = true
    else if (arg === '--android-package') args.androidPackage = argv[++i]
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

function outputPrefix(platform) {
  return parallel ? `[${platform}] ` : null
}

function pipeWithPrefix(source, target, prefix) {
  let carry = ''
  source.setEncoding('utf8')
  source.on('data', (chunk) => {
    const lines = (carry + chunk).split('\n')
    carry = lines.pop() ?? ''
    for (const line of lines) target.write(`${prefix}${line}\n`)
  })
  source.on('end', () => {
    if (carry) target.write(`${prefix}${carry}\n`)
  })
}

function sh(command, description, options = {}) {
  heading(options.prefix ? `${options.prefix}${description ?? command}` : (description ?? command))
  const started = Date.now()
  const stop = options.heartbeat ? startHeartbeat(options.heartbeat, started) : null

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: ROOT,
      stdio: options.prefix ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: true,
      env: { ...process.env, ...(options.env ?? {}) },
    })
    if (options.prefix) {
      pipeWithPrefix(child.stdout, process.stdout, options.prefix)
      pipeWithPrefix(child.stderr, process.stderr, options.prefix)
    }

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

function readPackage() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
}

function readVersion() {
  return readPackage().version
}

function readBuildNumber() {
  const pkg = readPackage()
  return storeBuild(pkg.version, pkg.buildNumber)
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

  const xcode = findIosXcode()
  if (!xcode.usable) {
    abort(
      `no Xcode with an iOS ${MAX_IOS_SDK_MAJOR} SDK found - the iOS ${xcode.sdk ?? 'unknown'} SDK ` +
        'builds an app that crashes at launch on iOS 27. Install Xcode ' +
        `${MAX_IOS_SDK_MAJOR} as /Applications/Xcode-${MAX_IOS_SDK_MAJOR}.app`,
    )
  }

  return {
    EXPO_APPLE_TEAM_ID: appleTeamId,
    EXPO_APPLE_TEAM_TYPE: process.env.EXPO_APPLE_TEAM_TYPE ?? 'INDIVIDUAL',
    DEVELOPER_DIR: xcode.developerDir,
    SDKROOT: macSdkPath(xcode.developerDir) ?? undefined,
  }
}

function artifactPath(platform, version, buildNumber, extension = null) {
  const resolved = extension ?? (platform === 'ios' ? 'ipa' : 'aab')
  return path.join(ARTIFACT_DIR, `pear-notes-${version}-${buildNumber}.${resolved}`)
}

async function prepareSources() {
  await sh('npm run lint', 'Linting')
  await sh(
    'node scripts/build-backend-bundle.mjs --if-stale',
    'Checking the Bare backend worklet bundle',
  )
}

async function applyVersion({ bump, version }) {
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

async function buildLocally(platform, profile, version, buildNumber, extension = null) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  const output = artifactPath(platform, version, buildNumber, extension)

  const { status, failure } = await sh(
    `eas build --local --non-interactive --platform ${platform} --profile ${profile} --output "${output}"`,
    `Building ${path.basename(output)} locally`,
    {
      heartbeat: `still building ${platform}`,
      allowFailure: true,
      prefix: outputPrefix(platform),
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

  if (process.platform !== 'darwin') {
    return { skipped: false, failure: 'uploading an iOS build needs macOS (xcrun altool)' }
  }

  const { failure } = await sh(
    `xcrun altool --upload-app -f "${artifact}" -t ios --apiKey ${config.ASC_KEY_ID} --apiIssuer ${config.ASC_ISSUER_ID}`,
    'Uploading ios build to App Store Connect',
    { heartbeat: 'still uploading ios', allowFailure: true, prefix: outputPrefix('ios') },
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

  if (hasKey) return submitAndroidDirect(artifact, profile, version, buildNumber)

  heading('Skipping Play upload - no upload key configured')
  console.log(`  Configure it once:  node scripts/setup-play-key.js <path-to-key.json>`)
  console.log(`  Or upload by hand:  ${path.relative(ROOT, artifact)}`)
  console.log('  Play Console -> Testing -> Internal testing -> Create new release')
  return { skipped: true, failure: null }
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
  console.log('  Fix the cause, then retry just the failures:')
  for (const outcome of failed) {
    console.log(
      outcome.platform === 'android apk'
        ? '    npm run release:android -- --android-package apk --no-submit'
        : `    npm run release:${outcome.platform} -- --submit-only`,
    )
  }
  console.log('')
  process.exitCode = 1
}

async function releasePlatform(platform, args, version, buildNumber) {
  const { file, failure } = await buildLocally(platform, args.profile, version, buildNumber)

  if (failure) {
    console.error(`\n\x1b[31m  ${platform} build failed: ${failure}\x1b[0m`)
    return { platform, status: 'failed', detail: 'build failed' }
  }

  if (args.skipSubmit) {
    return {
      platform,
      status: 'ok',
      detail: `built, not uploaded (${path.relative(ROOT, file)})`,
    }
  }

  const result = await submit(platform, args.profile, file, version, buildNumber)

  if (result.skipped) {
    return { platform, status: 'skipped', detail: 'built, no upload key' }
  }

  if (result.failure) {
    console.error(`\n\x1b[31m  ${platform} submit failed.\x1b[0m The build is kept at`)
    console.error(`  ${path.relative(ROOT, file)} — retry with --submit-only, no rebuild needed.`)
    return { platform, status: 'failed', detail: 'built ok, submit failed' }
  }

  return { platform, status: 'ok', detail: 'built and submitted' }
}

async function buildSideloadApk(args, version, buildNumber) {
  const { file, failure } = await buildLocally('android', APK_PROFILE, version, buildNumber, 'apk')

  if (failure) {
    console.error(`\n\x1b[31m  android apk build failed: ${failure}\x1b[0m`)
    return { platform: 'android apk', status: 'failed', detail: 'build failed' }
  }
  return {
    platform: 'android apk',
    status: 'ok',
    detail: `built for sideloading, never uploaded (${path.relative(ROOT, file)})`,
  }
}

async function releaseTargets(platform, args, version, buildNumber) {
  if (platform !== 'android') return [await releasePlatform(platform, args, version, buildNumber)]

  const outcomes = []
  if (args.androidPackage !== 'apk') {
    outcomes.push(await releasePlatform(platform, args, version, buildNumber))
  }
  if (args.androidPackage !== 'aab') {
    outcomes.push(await buildSideloadApk(args, version, buildNumber))
  }
  return outcomes
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const platforms = resolvePlatforms(args.platform)
  const started = Date.now()

  parallel = args.parallel && platforms.length > 1 && !args.submitOnly

  if (!ANDROID_PACKAGES.includes(args.androidPackage)) {
    abort(`--android-package must be one of ${ANDROID_PACKAGES.join(', ')}`)
  }

  if (
    platforms.includes('android') &&
    args.androidPackage === 'apk' &&
    !args.skipSubmit &&
    !args.submitOnly
  ) {
    abort(
      'Google Play takes the AAB, not an APK - add --no-submit, or use --android-package both to upload the AAB and also build an APK',
    )
  }

  if (platforms.includes('ios') && process.platform !== 'darwin' && !args.submitOnly) {
    abort('iOS builds require macOS')
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

  if (!args.skipPreflight) {
    heading('Running release preflight')
    const preflightArgs = platforms.includes('ios') ? ['--local-ios'] : []
    const preflight = spawnSync('node', ['scripts/preflight.js', ...preflightArgs], {
      cwd: ROOT,
      stdio: 'inherit',
    })
    if (preflight.status !== 0) abort('preflight checks did not pass')
  }

  await prepareSources()
  await applyVersion(args)

  const version = readVersion()
  const buildNumber = readBuildNumber()

  await commitVersion({ commit: args.commit, version, buildNumber })

  const commit = capture('git rev-parse --short HEAD')
  heading(`Releasing Pear Notes ${version} (build ${buildNumber}) from ${commit}`)

  const release = (platform) => releaseTargets(platform, args, version, buildNumber)
  const outcomes = []
  if (parallel) {
    heading(`Building ${platforms.join(' and ')} at the same time`)
    outcomes.push(...(await Promise.all(platforms.map(release))).flat())
  } else {
    for (const platform of platforms) outcomes.push(...(await release(platform)))
  }

  finish(outcomes, Date.now() - started, version, buildNumber, commit)
}

main().catch((error) => abort(error.message))
