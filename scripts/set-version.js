const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP_JSON = path.join(ROOT, 'app.json')
const PACKAGE_JSON = path.join(ROOT, 'package.json')
const BUILD_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle')
const PBXPROJ = path.join(ROOT, 'ios', 'pearnotes.xcodeproj', 'project.pbxproj')
const INFO_PLIST = path.join(ROOT, 'ios', 'pearnotes', 'Info.plist')

const SEMVER = /^\d+\.\d+\.\d+$/

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, contents) {
  fs.writeFileSync(file, contents)
}

function fail(message) {
  console.error(`\n  set-version: ${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { version: null, build: null, bump: false }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--version') args.version = argv[++i]
    else if (arg === '--build') args.build = Number(argv[++i])
    else if (arg === '--bump') args.bump = true
    else if (SEMVER.test(arg)) args.version = arg
  }

  return args
}

function readCurrentBuildNumber(gradle) {
  const match = gradle.match(/versionCode\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

function applyToGradle(version, buildNumber) {
  const original = read(BUILD_GRADLE)
  const updated = original
    .replace(/versionCode\s+\d+/, `versionCode ${buildNumber}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`)

  if (!/versionCode\s+\d+/.test(original) || !/versionName\s+"[^"]*"/.test(original)) {
    fail('could not find versionCode/versionName in android/app/build.gradle')
  }

  write(BUILD_GRADLE, updated)
}

function applyToXcodeProject(version, buildNumber) {
  const original = read(PBXPROJ)

  if (!original.includes('MARKETING_VERSION')) {
    fail('could not find MARKETING_VERSION in project.pbxproj')
  }

  const updated = original
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)

  write(PBXPROJ, updated)
}

function applyToInfoPlist(version, buildNumber) {
  const original = read(INFO_PLIST)

  const updated = original
    .replace(
      /(<key>CFBundleShortVersionString<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/,
      `$1${version}$2`,
    )
    .replace(/(<key>CFBundleVersion<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/, `$1${buildNumber}$2`)

  if (updated === original && !original.includes(`<string>${version}</string>`)) {
    fail('could not update CFBundleShortVersionString/CFBundleVersion in Info.plist')
  }

  write(INFO_PLIST, updated)
}

function applyToJson(file, version) {
  const contents = read(file)
  const parsed = JSON.parse(contents)
  const indent = contents.match(/\n(\s+)"/)?.[1]?.length ?? 2

  if (file === APP_JSON) parsed.expo.version = version
  else parsed.version = version

  write(file, `${JSON.stringify(parsed, null, indent)}\n`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const appJson = JSON.parse(read(APP_JSON))
  const gradle = read(BUILD_GRADLE)

  const version = args.version ?? appJson.expo.version
  const currentBuild = readCurrentBuildNumber(gradle)

  if (!SEMVER.test(version)) {
    fail(`"${version}" is not a valid semver version (expected MAJOR.MINOR.PATCH)`)
  }

  let buildNumber = currentBuild
  if (args.build !== null && !Number.isNaN(args.build)) buildNumber = args.build
  else if (args.bump) buildNumber = currentBuild + 1

  if (!Number.isInteger(buildNumber) || buildNumber < 1) {
    fail(`build number must be a positive integer, got "${buildNumber}"`)
  }

  applyToJson(APP_JSON, version)
  applyToJson(PACKAGE_JSON, version)
  applyToGradle(version, buildNumber)
  applyToXcodeProject(version, buildNumber)
  applyToInfoPlist(version, buildNumber)

  console.log(`  version   ${version}`)
  console.log(`  build     ${buildNumber}${args.bump ? ` (bumped from ${currentBuild})` : ''}`)
  console.log('  synced    app.json, package.json, build.gradle, project.pbxproj, Info.plist')
}

main()
