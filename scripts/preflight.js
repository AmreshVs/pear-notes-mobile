const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const play = require('./playCredentials')
const { checkCorePinRef, compareInstalledCore } = require('./coreInstall')
const { storeBuild } = require('./store-build')
const { findIosXcode, MAX_IOS_SDK_MAJOR } = require('./xcode')
const { MAX_CONSOLE_LOGS, inspectBackendBundle } = require('./bundleHygiene')

const ROOT = path.resolve(__dirname, '..')
const IS_CI = process.env.CI === 'true'
const BUILDS_IOS_LOCALLY = process.argv.includes('--local-ios')
const DIRTY_FILES_SHOWN = 5
const IOS_APP_TARGET_NAME = 'pearnotes'
const IOS_SHARE_EXTENSION_TARGET_NAME = 'PearNotesShareExtension'
const IOS_SHARE_EXTENSION_BUNDLE_SUFFIX = '.ShareExtension'

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
  if (!status) return pass('git', `clean at ${tryRun('git rev-parse --short HEAD')}`)

  const files = status.split('\n').map((line) => line.replace(/^\s*\S+\s+/, ''))
  const shown = files.slice(0, DIRTY_FILES_SHOWN).join(', ')
  const more =
    files.length > DIRTY_FILES_SHOWN ? ` and ${files.length - DIRTY_FILES_SHOWN} more` : ''

  if (IS_CI) {
    return warn(
      'git',
      `setup changed ${shown}${more} on the runner - committed locally before the build, not pushed`,
    )
  }
  fail('git', `working tree is dirty: ${shown}${more} - commit before releasing`)
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
  const lockPath = path.join(ROOT, 'package-lock.json')
  const lock = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : ''
  const lockedSha = lock.match(/pear-notes-core(?:\.git)?#([0-9a-f]{40})/)?.[1]

  if (!lockedSha) {
    return fail(
      'core',
      '@pear-notes/core has no resolved commit in package-lock.json - npm ci is not reproducible',
    )
  }

  const pin = checkCorePinRef(ROOT)
  if (pin.level === 'fail') return fail('core', pin.detail)
  if (pin.level === 'warn') warn('core', pin.detail)

  if (IS_CI) {
    return pass('core', `lock pins ${lockedSha.slice(0, 12)}, installed from that commit by setup`)
  }

  const coreRoot = path.resolve(ROOT, '..', 'pear-notes-core')
  if (!fs.existsSync(path.join(coreRoot, '.git'))) {
    return warn(
      'core',
      `lock pins ${lockedSha.slice(0, 12)}, but ../pear-notes-core is not checked out - cannot ` +
        'verify the shipped core matches the one backend.bundle.js was built from',
    )
  }

  const coreGit = (command) => tryRun(`git -C "${coreRoot}" ${command}`)
  const coreHead = coreGit('rev-parse HEAD')

  if (!coreHead) {
    return warn('core', `lock pins ${lockedSha.slice(0, 12)}, but ../pear-notes-core has no HEAD`)
  }

  const coreDirty = coreGit('status --porcelain')
  if (coreDirty) {
    return fail(
      'core',
      `../pear-notes-core has ${coreDirty.split('\n').length} uncommitted file(s) - EAS installs ` +
        'core from a commit, so those changes can never reach the build. Commit and push them.',
    )
  }

  if (coreHead !== lockedSha) {
    const behind = coreGit(`rev-list --count ${lockedSha}..${coreHead}`)
    return fail(
      'core',
      `package-lock.json pins core ${lockedSha.slice(0, 12)} but ../pear-notes-core is at ` +
        `${coreHead.slice(0, 12)}${behind && behind !== '0' ? ` (${behind} commit(s) ahead)` : ''} - ` +
        'the build would ship a JS bundle whose core is missing exports the app calls. ' +
        'Run "npm update @pear-notes/core --package-lock-only" and commit the lock.',
    )
  }

  if (!coreGit(`branch -r --contains ${coreHead}`)) {
    return fail(
      'core',
      `core ${coreHead.slice(0, 12)} is not on any remote branch - EAS resolves the dependency ` +
        'over the network and the install will fail. Push pear-notes-core first.',
    )
  }

  pass('core', `lock and ../pear-notes-core both at ${lockedSha.slice(0, 12)}, pushed`)
}

function checkInstalledCore() {
  if (IS_CI) return pass('core-install', 'fresh install from the pinned commit')
  const { level, detail } = compareInstalledCore(ROOT)
  record(level, 'core-install', detail)
}

function checkBackendBundle() {
  const relative = 'src/backend/backend.bundle.js'
  const bundle = path.join(ROOT, relative)

  if (!fs.existsSync(bundle)) {
    return fail('backend', `${relative} missing - run npm run setup`)
  }

  const size = fs.statSync(bundle).size
  if (size < 100_000) {
    return fail('backend', `backend.bundle.js is suspiciously small (${size} bytes)`)
  }

  pass('backend', `${(size / 1024 / 1024).toFixed(1)} MB`)
}

const HYPERCORE_FIRST_BAD = [11, 35, 5]

function checkHypercoreVersion() {
  const manifest = path.join(ROOT, 'node_modules', 'hypercore', 'package.json')
  if (!fs.existsSync(manifest)) return fail('hypercore', 'node_modules/hypercore is missing')
  const version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version
  const parts = version.split('.').map(Number)
  const index = parts.findIndex((part, i) => part !== HYPERCORE_FIRST_BAD[i])
  if (index === -1 || parts[index] > HYPERCORE_FIRST_BAD[index]) {
    return fail(
      'hypercore',
      `hypercore ${version} hangs a joiner in multi-device linking (11.35.5+) - keep it at 11.35.4 or below`,
    )
  }
  pass('hypercore', `hypercore ${version}`)
}

function checkBundleHygiene() {
  const relative = 'src/backend/backend.bundle.js'
  const bundle = path.join(ROOT, relative)
  if (!fs.existsSync(bundle)) return

  const { hasClosingTag, leaked, readable, consoleLogs } = inspectBackendBundle(
    fs.readFileSync(bundle, 'utf8'),
  )

  if (hasClosingTag) {
    return fail(
      'bundle-hygiene',
      `${relative} contains a bare "</" sequence, which kills the worklet at launch - rebuild with npm run bare-bundle`,
    )
  }

  if (leaked.length > 0) {
    return fail(
      'bundle-hygiene',
      `${relative} still contains sensitive log strings: ${leaked.join(', ')} - rebuild after removing them from core`,
    )
  }

  if (readable.length > 0) {
    return fail(
      'bundle-hygiene',
      `${relative} contains readable core source (${readable.join(', ')}) - rebuild with npm run bare-bundle without PEAR_OBFUSCATE=0`,
    )
  }

  if (consoleLogs > MAX_CONSOLE_LOGS) {
    return fail(
      'bundle-hygiene',
      `${relative} has ${consoleLogs} console.log calls - scripts/minify-core.js should have stripped core's; rebuild with npm run bare-bundle`,
    )
  }

  pass(
    'bundle-hygiene',
    `no "</", no sensitive strings, core obfuscated, ${consoleLogs} console.log left`,
  )
}

const SENSITIVE_LOG_PATTERNS = [
  {
    file: 'node_modules/@pear-notes/core/backend/NoteBase.js',
    pattern: /console\.log\(\s*'\[subscribePairUser\] Attempting to pair:'/,
    detail: 'logs the full pairing invite',
  },
  {
    file: 'node_modules/@pear-notes/core/store/sagas/syncSaga.js',
    pattern: /(console|log)\.(log|error|debug)\([^)]*Received data:'\s*,\s*data\s*\)/,
    detail: 'logs the whole pairing payload, which carries encryptionKey',
  },
  {
    file: 'node_modules/@pear-notes/core/backend/NoteBase.js',
    pattern: /console\.log\(\s*'(autobase|local|drive|blob) key'/,
    detail: 'logs raw key material',
  },
]

function checkNoSensitiveLogs() {
  const offenders = []

  for (const { file, pattern, detail } of SENSITIVE_LOG_PATTERNS) {
    const full = path.join(ROOT, file)
    if (!fs.existsSync(full)) continue
    if (pattern.test(fs.readFileSync(full, 'utf8'))) {
      offenders.push(`${path.basename(file)} ${detail}`)
    }
  }

  if (offenders.length > 0) {
    return fail('sensitive-logs', offenders.join('; '))
  }
  pass('sensitive-logs', 'no known key/invite/payload logs in the linked core')
}

function checkNoPlaintextKeys() {
  const keysDir = path.resolve(ROOT, '..', 'Keys')
  if (!fs.existsSync(keysDir)) {
    return pass('plaintext-keys', 'no Keys/ directory at the repo root')
  }

  const risky = fs
    .readdirSync(keysDir)
    .filter((name) => name.endsWith('.key') || (name.endsWith('.json') && name.includes('pear')))

  if (risky.length > 0) {
    return fail(
      'plaintext-keys',
      `Keys/ holds what looks like live credential material (${risky.join(', ')}) - rotate and move it out of the tree`,
    )
  }
  pass('plaintext-keys', 'Keys/ holds no private key or service-account files')
}

function checkNativeAddonSetup() {
  const script = 'scripts/prepare-native-addons.mjs'
  if (!fs.existsSync(path.join(ROOT, script))) {
    return fail('native-addons', `${script} is missing`)
  }
  const entryPoints = ['ios/Podfile', 'android/settings.gradle']
  const unwired = entryPoints.filter((file) => {
    const fullPath = path.join(ROOT, file)
    return (
      !fs.existsSync(fullPath) ||
      !fs.readFileSync(fullPath, 'utf8').includes('prepare-native-addons.mjs')
    )
  })
  if (unwired.length) {
    return fail(
      'native-addons',
      `${unwired.join(', ')} no longer run ${script} - native builds would miss the backend and editor bundles and link every QVAC addon. Re-run expo prebuild or restore the setup call`,
    )
  }
  pass('native-addons', `${script} runs from ${entryPoints.join(' and ')}`)
}

function checkEditorBundle() {
  const bundle = path.join(ROOT, 'src', 'utils', 'tiptap-editor-bundle.ts')
  if (!fs.existsSync(bundle))
    return fail('editor', 'src/utils/tiptap-editor-bundle.ts missing - run npm run setup')
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

  const releaseDevSection = releaseBlock.split(/releaseDev\s*\{/)[1] ?? ''
  if (releaseDevSection && !/applicationIdSuffix/.test(releaseDevSection)) {
    return fail(
      'signing',
      'releaseDev inherits from release but does not set applicationIdSuffix - a debug-signed build could ship under the production id',
    )
  }

  pass('signing', 'release uses a real keystore; releaseDev stays on a suffixed id')
}

function checkVersionConsistency() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const xcconfig = fs.readFileSync(path.join(ROOT, 'ios', 'Version.xcconfig'), 'utf8')

  const build = storeBuild(pkg.version, pkg.buildNumber)
  const marketingVersion = xcconfig.match(/MARKETING_VERSION = (\S+)/)?.[1]
  const projectVersion = Number(xcconfig.match(/CURRENT_PROJECT_VERSION = (\d+)/)?.[1])

  if (marketingVersion !== pkg.version || projectVersion !== build) {
    return fail(
      'version',
      `ios/Version.xcconfig (${marketingVersion}, ${projectVersion}) does not match package.json (${pkg.version}, ${build}) - run npm run version:set`,
    )
  }
  pass('version', `${pkg.version} build ${pkg.buildNumber} (store build ${build})`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readXcodeBundleIds(targetName) {
  const pbxproj = fs.readFileSync(
    path.join(ROOT, 'ios', 'pearnotes.xcodeproj', 'project.pbxproj'),
    'utf8',
  )

  const listPattern = new RegExp(
    `Build configuration list for PBXNativeTarget "${escapeRegExp(targetName)}" \\*/ = \\{[\\s\\S]*?buildConfigurations = \\(([\\s\\S]*?)\\);`,
  )
  const configurationList = pbxproj.match(listPattern)?.[1]
  if (!configurationList) return {}

  const ids = {}
  for (const [, configurationId, name] of configurationList.matchAll(
    /([0-9A-F]{24}) \/\* (\w+) \*\//g,
  )) {
    const blockPattern = new RegExp(
      `${configurationId} /\\* ${name} \\*/ = \\{([\\s\\S]*?)\\n\\t\\t\\};`,
    )
    const block = pbxproj.match(blockPattern)?.[1]
    const bundleId = block?.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)?.[1]
    if (bundleId) ids[name] = bundleId.replace(/"/g, '')
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

  const iosIds = readXcodeBundleIds(IOS_APP_TARGET_NAME)
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

  const extensionIds = readXcodeBundleIds(IOS_SHARE_EXTENSION_TARGET_NAME)
  for (const [configuration, appId] of Object.entries(iosIds)) {
    const expectedExtensionId = `${appId}${IOS_SHARE_EXTENSION_BUNDLE_SUFFIX}`
    if (extensionIds[configuration] !== expectedExtensionId) {
      return fail(
        'variant',
        `iOS share extension ${configuration} bundle id "${extensionIds[configuration]}" must be "${expectedExtensionId}"`,
      )
    }
  }

  pass(
    'variant',
    `android ${prodId}/${prodId}.dev, ios ${iosIds.Release}/${iosIds.Debug} (+${IOS_SHARE_EXTENSION_BUNDLE_SUFFIX})`,
  )
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

function checkMediaPermissionsStripped() {
  const manifest = fs.readFileSync(
    path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8',
  )

  const stripped = /READ_MEDIA_IMAGES"\s+tools:node="remove"/.test(manifest)
  if (!stripped) {
    return fail(
      'media perms',
      'READ_MEDIA_IMAGES is not stripped - expo-screen-capture merges it in and Play rejects the ' +
        'build as an undeclared photo permission. Restore the tools:node="remove" entry.',
    )
  }
  pass('media perms', 'READ_MEDIA_IMAGES stripped from the merged manifest')
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

  const usesNonExempt = /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<true\/>/.test(plist)
  const hasComplianceCode = plist.includes('ITSEncryptionExportComplianceCode')

  if (!plist.includes('ITSAppUsesNonExemptEncryption')) {
    warn(
      'export',
      'ITSAppUsesNonExemptEncryption not declared - every TestFlight upload will block on a manual questionnaire',
    )
  } else if (usesNonExempt && !hasComplianceCode) {
    fail(
      'export',
      'ITSAppUsesNonExemptEncryption is true but ITSEncryptionExportComplianceCode is missing - upload rejected with error 90592 until the code issued by App Store Connect is added',
    )
  } else {
    pass(
      'export',
      usesNonExempt ? 'non-exempt encryption declared with code' : 'exempt encryption declared',
    )
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

function checkBuildJdk() {
  const javaHome = process.env.JAVA_HOME
  const javaBin = javaHome ? `"${path.join(javaHome, 'bin', 'java')}"` : 'java'
  const source = javaHome ? 'JAVA_HOME' : 'PATH'

  const output = tryRun(`${javaBin} -version 2>&1`)
  if (!output) return fail('jdk', `no JDK found via ${source} - install Temurin 21`)

  const major = Number(output.match(/version "(\d+)/)?.[1])
  if (!major) return warn('jdk', `could not parse a version from "${output.split('\n')[0]}"`)

  if (major >= 17 && major <= 21) {
    return pass('jdk', `${major} via ${source}`)
  }

  const supported = tryRun('/usr/libexec/java_home -v 21')
  const remedy = supported
    ? `export JAVA_HOME=${supported}`
    : 'install Temurin 21 (brew install --cask temurin@21)'

  if (major > 21 && major < 25) {
    return warn(
      'jdk',
      `${major} via ${source} is untested with AGP 8.12 - if the CMake configure step fails, ${remedy}`,
    )
  }

  fail(
    'jdk',
    `${major} via ${source} cannot build this project - AGP 8.12 fails the native CMake configure ` +
      `step on JDK 25+ (":react-native-worklets:configureCMakeRelWithDebInfo"). ${remedy}`,
  )
}

function checkBuildXcode() {
  if (process.platform !== 'darwin' || !BUILDS_IOS_LOCALLY) return

  const xcode = findIosXcode()
  if (!xcode.developerDir) return fail('xcode', 'no Xcode found - install Xcode 26')

  if (xcode.usable) {
    const via = xcode.selected ? 'selected' : 'used for iOS builds instead of the selected Xcode'
    return pass('xcode', `iOS SDK ${xcode.sdk} at ${xcode.developerDir} (${via})`)
  }

  fail(
    'xcode',
    `iOS SDK ${xcode.sdk ?? 'unknown'} at ${xcode.developerDir} builds an app that crashes at launch on ` +
      `iOS 27 (the iOS 27 SDK requires the UIScene lifecycle, which Expo SDK 56 lacks). Install ` +
      `Xcode ${MAX_IOS_SDK_MAJOR} next to it as /Applications/Xcode-${MAX_IOS_SDK_MAJOR}.app`,
  )
}

function checkCodeShrinking() {
  const properties = fs.readFileSync(path.join(ROOT, 'android', 'gradle.properties'), 'utf8')
  const rules = fs.readFileSync(path.join(ROOT, 'android', 'app', 'proguard-rules.pro'), 'utf8')

  if (!/^android\.enableMinifyInReleaseBuilds=true$/m.test(properties)) {
    return fail(
      'r8',
      'android.enableMinifyInReleaseBuilds is not true - the release bundle ships unshrunk dex ' +
        'and Play rates the app bundle "Low"',
    )
  }

  const keepsWorklet = /-keep class to\.holepunch\.bare\.kit\.Worklet\b/.test(rules)
  const keepsIpc = /-keep class to\.holepunch\.bare\.kit\.IPC\b/.test(rules)

  if (!keepsWorklet || !keepsIpc) {
    return fail(
      'r8',
      'R8 is on but proguard-rules.pro is missing the bare-kit keep rules - native code resolves ' +
        'Worklet/IPC by name, so the worklet will fail to start in the release build',
    )
  }

  if (/-keep class to\.holepunch\.bare\.kit\.\*\*/.test(rules)) {
    return fail(
      'r8',
      'a blanket to.holepunch.bare.kit.** keep retains MessagingService, which fails R8 on the ' +
        'missing optional FirebaseMessagingService - keep only Worklet and IPC',
    )
  }

  const shrinksResources = /^android\.enableShrinkResourcesInReleaseBuilds=true$/m.test(properties)
  pass('r8', `enabled${shrinksResources ? ' with resource shrinking' : ''}, bare-kit keeps present`)
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

  if (process.platform !== 'darwin') return

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
  const ascAppId = easJson.submit?.production?.ios?.ascAppId

  let playKey = null
  try {
    playKey = play.describe()
  } catch (error) {
    fail('play creds', error.message)
  }

  if (playKey === null) {
    pass('play creds', 'no upload key - the aab will be uploaded manually')
  } else if (playKey?.source === 'sealed') {
    pass('play creds', `sealed, ${playKey.email}`)
  } else if (playKey?.source === 'plaintext' && IS_CI) {
    pass('play creds', `from the CI secret, ${playKey.email}`)
  } else if (playKey?.source === 'plaintext') {
    warn(
      'play creds',
      `${path.relative(ROOT, playKey.path)} is plaintext on disk - seal it with ` +
        '"node scripts/setup-play-key.js credentials/play-service-account.json"',
    )
  }

  if (!ascAppId || ascAppId.startsWith('REPLACE_')) {
    warn('asc app id', 'eas.json submit.production.ios.ascAppId is still a placeholder')
  } else {
    pass('asc app id', ascAppId)
  }

  const appleTeamId = easJson.submit?.production?.ios?.appleTeamId
  if (!appleTeamId) {
    fail(
      'apple team',
      'eas.json submit.production.ios.appleTeamId is missing - the release script exports it as ' +
        'EXPO_APPLE_TEAM_ID, and without it "eas build" stops to prompt for the team id',
    )
  } else {
    pass('apple team', `${appleTeamId} (exported as EXPO_APPLE_TEAM_ID)`)
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
checkInstalledCore()
checkBackendBundle()
checkBundleHygiene()
checkHypercoreVersion()
checkNoSensitiveLogs()
checkNoPlaintextKeys()
checkNativeAddonSetup()
checkEditorBundle()
checkReleaseSigning()
checkVersionConsistency()
checkVariantIds()
checkAndroidManifest()
checkMediaPermissionsStripped()
checkCleartextPolicy()
checkCodeShrinking()
checkIosCompliance()
checkBuildJdk()
checkBuildXcode()
checkToolchain()
checkSubmitCredentials()
report()
