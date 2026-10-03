const fs = require('fs')
const path = require('path')
const { storeBuild } = require('./store-build')

const ROOT = path.resolve(__dirname, '..')
const PACKAGE_JSON = path.join(ROOT, 'package.json')
const XCCONFIG = path.join(ROOT, 'ios', 'Version.xcconfig')

const SEMVER = /^\d+\.\d+\.\d+$/

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

function releaseLine(version) {
  return version.split('.').slice(0, 2).join('.')
}

function xcconfigFor(version, buildNumber) {
  return [
    '// Generated from package.json by scripts/set-version.js - do not edit.',
    `MARKETING_VERSION = ${version}`,
    `CURRENT_PROJECT_VERSION = ${storeBuild(version, buildNumber)}`,
    '',
  ].join('\n')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const contents = fs.readFileSync(PACKAGE_JSON, 'utf8')
  const pkg = JSON.parse(contents)

  const version = args.version ?? pkg.version
  if (!SEMVER.test(version)) {
    fail(`"${version}" is not a valid semver version (expected MAJOR.MINOR.PATCH)`)
  }

  const currentBuild = Number(pkg.buildNumber ?? 0)
  let buildNumber = releaseLine(version) === releaseLine(pkg.version) ? currentBuild : 1
  if (args.build !== null && !Number.isNaN(args.build)) buildNumber = args.build
  else if (args.bump) buildNumber += 1

  if (!Number.isInteger(buildNumber) || buildNumber < 1 || buildNumber > 99) {
    fail(`build number must be between 1 and 99, got "${buildNumber}"`)
  }

  pkg.version = version
  pkg.buildNumber = buildNumber
  const indent = contents.match(/\n(\s+)"/)?.[1]?.length ?? 2
  fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, indent)}\n`)
  fs.writeFileSync(XCCONFIG, xcconfigFor(version, buildNumber))

  console.log(`  version   ${version}`)
  console.log(`  build     ${buildNumber} (store build ${storeBuild(version, buildNumber)})`)
  console.log('  synced    package.json, ios/Version.xcconfig')
}

main()
