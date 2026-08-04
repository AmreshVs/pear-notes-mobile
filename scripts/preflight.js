const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const checks = []
let failures = 0
let warnings = 0

function run(command) {
  return execSync(command, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
}

function tryRun(command) {
  try {
    return run(command)
  } catch {
    return null
  }
}

function record(level, label, detail) {
  checks.push({ level, label, detail })
  if (level === 'fail') failures += 1
  if (level === 'warn') warnings += 1
}

function pass(label, detail) {
  record('pass', label, detail)
}

function warn(label, detail) {
  record('warn', label, detail)
}

function fail(label, detail) {
  record('fail', label, detail)
}

function checkGitClean() {
  const status = tryRun('git status --porcelain')
  if (status === null) return fail('git', 'not a git repository')
  if (status)
    return fail(
      'git',
      `working tree is dirty (${status.split('\n').length} files) - commit before releasing`,
    )
  pass('git', `clean at ${tryRun('git rev-parse --short HEAD')}`)
}

function checkLockfiles() {
  const lock = path.join(ROOT, 'package-lock.json')
  const podLock = path.join(ROOT, 'ios', 'Podfile.lock')
  const tracked = tryRun('git ls-files package-lock.json ios/Podfile.lock') ?? ''

  if (!fs.existsSync(lock)) fail('lockfile', 'package-lock.json is missing - run npm install')
  else if (!tracked.includes('package-lock.json'))
    fail('lockfile', 'package-lock.json is not tracked by git - releases are not reproducible')
  else pass('lockfile', 'package-lock.json tracked')

  if (!fs.existsSync(podLock))
    warn('podfile', 'ios/Podfile.lock is missing - run pod install in ios/')
  else if (!tracked.includes('ios/Podfile.lock'))
    warn('podfile', 'ios/Podfile.lock is not tracked by git')
  else pass('podfile', 'ios/Podfile.lock tracked')
}

function checkCorePinned() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const spec = pkg.dependencies['@pear-notes/core'] ?? ''

  const lockPath = path.join(ROOT, 'package-lock.json')
  const lock = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : ''
  const lockedSha = lock.match(/pear-notes-core(?:\.git)?#([0-9a-f]{40})/)?.[1]

  if (!lockedSha) {
    return fail(
      'core',
      '@pear-notes/core has no resolved commit in package-lock.json - npm ci is not reproducible',
    )
  }

  if (!spec.includes('#')) {
    return warn(
      'core',
      `lock pins ${lockedSha.slice(0, 12)}, but package.json is unpinned - a future npm install will silently jump to the core default branch`,
    )
  }

  const declaredSha = spec.split('#')[1]
  if (!lockedSha.startsWith(declaredSha) && !declaredSha.startsWith(lockedSha.slice(0, 7))) {
    return fail(
      'core',
      `package.json pins ${declaredSha.slice(0, 12)} but the lock resolves ${lockedSha.slice(0, 12)} - run npm install`,
    )
  }

  pass('core', `pinned to ${lockedSha.slice(0, 12)}`)
}

function checkBackendBundle() {
  const relative = 'src/backend/backend.bundle.js'
  const bundle = path.join(ROOT, relative)

  if (!fs.existsSync(bundle)) {
    return fail('backend', `${relative} missing - run npm run bare-bundle`)
  }

  const size = fs.statSync(bundle).size
  if (size < 100_000) {
    return fail('backend', `backend.bundle.js is suspiciously small (${size} bytes)`)
  }

  if (!tryRun(`git ls-files ${relative}`)) {
    return fail(
      'backend',
      `${relative} is not tracked by git - eas build --local copies the project from git, so the build will fail to resolve it`,
    )
  }

  pass('backend', `${(size / 1024 / 1024).toFixed(1)} MB, tracked`)
}

function checkEditorBundle() {
  const bundle = path.join(ROOT, 'src', 'utils', 'tiptap-editor-bundle.ts')
  if (!fs.existsSync(bundle))
    return fail('editor', 'src/utils/tiptap-editor-bundle.ts missing - run npm run build:editor')
  pass('editor', `${(fs.statSync(bundle).size / 1024).toFixed(0)} KB`)
}

function checkReleaseSigning() {
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8')
  const releaseBlock = gradle.split(/buildTypes\s*\{/)[1] ?? ''
  const releaseSection = releaseBlock.split(/release\s*\{/)[1] ?? ''

  if (/signingConfig\s+signingConfigs\.debug/.test(releaseSection)) {
    return fail(
      'signing',
      'release build type is signed with the DEBUG keystore - Play will reject this',
    )
  }
  pass('signing', 'release build type does not use the debug keystore')
}

function checkVersionConsistency() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8')
  const pbxproj = fs.readFileSync(
    path.join(ROOT, 'ios', 'pearnotes.xcodeproj', 'project.pbxproj'),
    'utf8',
  )

  const appVersion = appJson.expo.version
  const gradleVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1]
  const marketingVersion = pbxproj.match(/MARKETING_VERSION = ([^;]+);/)?.[1]

  const gradleCode = gradle.match(/versionCode\s+(\d+)/)?.[1]
  const projectVersion = pbxproj.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)?.[1]

  if (appVersion !== gradleVersion || appVersion !== marketingVersion) {
    return fail(
      'version',
      `mismatch: app.json=${appVersion} gradle=${gradleVersion} xcode=${marketingVersion} - run npm run version:set`,
    )
  }
  pass('version', `${appVersion} (android build ${gradleCode}, ios build ${projectVersion})`)
}

function readXcodeBundleIds() {
  const pbxproj = fs.readFileSync(
    path.join(ROOT, 'ios', 'pearnotes.xcodeproj', 'project.pbxproj'),
    'utf8',
  )

  const ids = {}
  for (const block of pbxproj.split('isa = XCBuildConfiguration;').slice(1)) {
    const bundleId = block.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)?.[1]
    const name = block.match(/name = (\w+);/)?.[1]
    if (bundleId && name) ids[name] = bundleId.replace(/"/g, '')
  }
  return ids
}

function checkVariantIds() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8')

  const prodId = appJson.expo.android.package
  const applicationId = gradle.match(/applicationId\s+'([^']+)'/)?.[1]

  if (applicationId !== prodId) {
    return fail(
      'variant',
      `gradle applicationId "${applicationId}" does not match app.json "${prodId}"`,
    )
  }

  if (
    /applicationIdSuffix/.test(gradle) &&
    !/buildType\.name\.startsWith\('debug'\)/.test(gradle)
  ) {
    return fail('variant', 'applicationIdSuffix is applied outside the debug build types')
  }

  const iosIds = readXcodeBundleIds()
  if (iosIds.Release?.endsWith('.dev')) {
    return fail(
      'variant',
      `iOS Release bundle id is "${iosIds.Release}" - the dev id would ship to the App Store`,
    )
  }
  if (iosIds.Release !== appJson.expo.ios.bundleIdentifier) {
    return fail(
      'variant',
      `iOS Release bundle id "${iosIds.Release}" does not match app.json "${appJson.expo.ios.bundleIdentifier}"`,
    )
  }
  if (!iosIds.Debug?.endsWith('.dev')) {
    return warn(
      'variant',
      `iOS Debug bundle id is "${iosIds.Debug}" - dev and prod cannot coexist on a device`,
    )
  }

  pass('variant', `prod ${prodId}, dev ${prodId}.dev`)
}

function checkAndroidManifest() {
  const manifest = fs.readFileSync(
    path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8',
  )
  if (manifest.includes('SYSTEM_ALERT_WINDOW')) {
    return warn(
      'manifest',
      'SYSTEM_ALERT_WINDOW is in the release manifest - triggers Play review scrutiny',
    )
  }
  pass('manifest', 'no dev-only permissions in release manifest')
}

function checkCleartextPolicy() {
  const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
  const configPath = path.join(
    ROOT,
    'android',
    'app',
    'src',
    'main',
    'res',
    'xml',
    'network_security_config.xml',
  )

  const manifest = fs.readFileSync(manifestPath, 'utf8')

  if (manifest.includes('android:usesCleartextTraffic="true"')) {
    return fail(
      'cleartext',
      'release manifest allows cleartext to ALL hosts - scope it to loopback with a network security config',
    )
  }

  if (!manifest.includes('android:networkSecurityConfig=')) {
    return fail(
      'cleartext',
      'no networkSecurityConfig in the release manifest - the local hyperdrive blob server (http://127.0.0.1) will be blocked',
    )
  }

  if (!fs.existsSync(configPath)) {
    return fail('cleartext', 'res/xml/network_security_config.xml is missing')
  }

  const config = fs.readFileSync(configPath, 'utf8')
  const permitsLoopback = /<domain[^>]*>\s*127\.0\.0\.1\s*<\/domain>/.test(config)
  const baseIsSecure = /<base-config[^>]*cleartextTrafficPermitted="false"/.test(config)

  if (!permitsLoopback) {
    return fail('cleartext', 'network security config does not permit cleartext to 127.0.0.1')
  }
  if (!baseIsSecure) {
    return warn('cleartext', 'network security config permits cleartext beyond loopback')
  }

  pass('cleartext', 'loopback only (127.0.0.1, localhost)')
}

function checkIosCompliance() {
  const plist = fs.readFileSync(path.join(ROOT, 'ios', 'pearnotes', 'Info.plist'), 'utf8')

  if (!plist.includes('ITSAppUsesNonExemptEncryption')) {
    warn(
      'export',
      'ITSAppUsesNonExemptEncryption not declared - every TestFlight upload will block on a manual questionnaire',
    )
  } else {
    pass('export', 'export compliance declared')
  }

  if (plist.includes('$(PRODUCT_NAME) to access')) {
    warn(
      'purpose',
      'a default placeholder purpose string is still present - common App Review rejection',
    )
  } else {
    pass('purpose', 'permission purpose strings are app-specific')
  }

  const privacyManifest = path.join(ROOT, 'ios', 'pearnotes', 'PrivacyInfo.xcprivacy')
  if (!fs.existsSync(privacyManifest))
    fail('privacy', 'PrivacyInfo.xcprivacy is missing - required by App Review')
  else pass('privacy', 'PrivacyInfo.xcprivacy present')
}

function checkToolchain() {
  const easVersion = tryRun('eas --version')?.match(/eas-cli\/(\S+)/)?.[1]
  if (!easVersion) fail('eas-cli', 'not installed - npm install -g eas-cli')
  else pass('eas-cli', easVersion)

  const account = tryRun('eas whoami')
    ?.split('\n')
    .filter(
      (line) =>
        line &&
        !line.includes('eas-cli@') &&
        !line.includes('upgrade') &&
        !line.includes('npm install'),
    )
    .pop()
  if (!account) fail('eas auth', 'not logged in - run eas login')
  else pass('eas auth', account)

  if (!tryRun('fastlane --version')) {
    warn('fastlane', 'not installed - required for local iOS builds (brew install fastlane)')
  } else {
    pass('fastlane', 'installed')
  }

  if (!tryRun('pod --version')) warn('cocoapods', 'not installed - required for local iOS builds')
  else pass('cocoapods', tryRun('pod --version'))
}

function checkSubmitCredentials() {
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'))
  const androidKey = easJson.submit?.production?.android?.serviceAccountKeyPath
  const ascAppId = easJson.submit?.production?.ios?.ascAppId

  if (androidKey && !fs.existsSync(path.join(ROOT, androidKey))) {
    pass('play creds', 'no service account key - the aab will be uploaded manually')
  } else if (androidKey) {
    pass('play creds', 'service account key present')
  }

  if (!ascAppId || ascAppId.startsWith('REPLACE_')) {
    warn('asc app id', 'eas.json submit.production.ios.ascAppId is still a placeholder')
  } else {
    pass('asc app id', ascAppId)
  }
}

function report() {
  const icon = { pass: '  ok  ', warn: ' warn ', fail: ' FAIL ' }

  console.log('\n  Pear Notes release preflight\n')
  for (const check of checks) {
    console.log(`  [${icon[check.level]}] ${check.label.padEnd(12)} ${check.detail}`)
  }

  console.log('')
  if (failures > 0) {
    console.log(`  ${failures} blocking issue(s), ${warnings} warning(s). Release aborted.\n`)
    process.exit(1)
  }
  console.log(`  All checks passed${warnings ? ` with ${warnings} warning(s)` : ''}.\n`)
}

checkGitClean()
checkLockfiles()
checkCorePinned()
checkBackendBundle()
checkEditorBundle()
checkReleaseSigning()
checkVersionConsistency()
checkVariantIds()
checkAndroidManifest()
checkCleartextPolicy()
checkIosCompliance()
checkToolchain()
checkSubmitCredentials()
report()
