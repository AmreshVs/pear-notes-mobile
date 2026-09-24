import { spawnSync } from 'child_process'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { compareInstalledCore } = require('./coreInstall.js')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIN_NODE_MAJOR = 24
const SOCKET_FIREWALL = '/usr/local/bin/sfw'
const JDK_MAJOR = 21
const args = new Set(process.argv.slice(2))
const skipPods = args.has('--skip-pods')

const UTF8_ENV = { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }

function step(title) {
  console.log(`\n==> ${title}`)
}

function stop(message) {
  console.error(`\n  setup: ${message}\n`)
  process.exit(1)
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit', ...options })
  if (result.error) stop(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0)
    stop(`${[command, ...commandArgs].join(' ')} failed (exit ${result.status})`)
}

function npm(npmArgs, options) {
  if (fs.existsSync(SOCKET_FIREWALL)) run(SOCKET_FIREWALL, ['npm', ...npmArgs], options)
  else run('npm', npmArgs, options)
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0])
  if (major < MIN_NODE_MAJOR) {
    stop(
      `Node ${MIN_NODE_MAJOR}+ is required (bare-pack crashes on ${process.versions.node}). Run: nvm use ${MIN_NODE_MAJOR}`,
    )
  }
}

function installDependencies() {
  step('Installing dependencies (the pinned core is always refetched)')
  fs.rmSync(path.join(ROOT, 'node_modules', '@pear-notes', 'core'), {
    recursive: true,
    force: true,
  })
  npm(['install', '--ignore-scripts', '--no-audit', '--no-fund'])
}

function verifyCore() {
  step('Checking the installed core against the pin')
  const { level, detail } = compareInstalledCore(ROOT)
  if (level === 'fail') stop(detail)
  console.log(`  ${level === 'pass' ? 'ok' : 'warning'}: ${detail}`)
}

function prepareNativeAddons() {
  step('Patching the bare-kit linker and building the on-device AI worker')
  run(process.execPath, [path.join(ROOT, 'scripts', 'prepare-native-addons.mjs')])
}

function linkIos() {
  if (process.platform !== 'darwin') return
  step('Linking native addons for iOS')
  run(process.execPath, [
    path.join(ROOT, 'node_modules', 'react-native-bare-kit', 'ios', 'link.mjs'),
  ])
  if (skipPods) {
    console.log('  skipped pod install (--skip-pods)')
    return
  }
  step('Installing CocoaPods')
  run('pod', ['install'], { cwd: path.join(ROOT, 'ios'), env: UTF8_ENV })
}

function checkJdk() {
  if (process.platform !== 'darwin') return
  const result = spawnSync('/usr/libexec/java_home', ['-v', String(JDK_MAJOR)], {
    encoding: 'utf8',
  })
  if (result.status === 0) {
    console.log(`\n  Android builds use JDK ${JDK_MAJOR}: ${result.stdout.trim()}`)
  } else {
    console.log(
      `\n  warning: JDK ${JDK_MAJOR} not found - Android release builds need it (brew install --cask temurin@${JDK_MAJOR})`,
    )
  }
}

checkNode()
installDependencies()
verifyCore()
prepareNativeAddons()
linkIos()
checkJdk()
console.log('\n  setup: done. Android links its native addons on every Gradle build.\n')
