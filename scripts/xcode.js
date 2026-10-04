const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_IOS_SDK_MAJOR = 26

function iosSdkVersion(developerDir) {
  try {
    return execSync('xcrun --sdk iphoneos --show-sdk-version', {
      env: { ...process.env, DEVELOPER_DIR: developerDir },
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function selectedDeveloperDir() {
  if (process.env.DEVELOPER_DIR) return process.env.DEVELOPER_DIR
  try {
    return execSync('xcode-select -p', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function installedDeveloperDirs() {
  try {
    return fs
      .readdirSync('/Applications')
      .filter((name) => /^Xcode.*\.app$/.test(name))
      .map((name) => path.join('/Applications', name, 'Contents', 'Developer'))
  } catch {
    return []
  }
}

function describe(developerDir) {
  const sdk = iosSdkVersion(developerDir)
  const major = Number(sdk?.split('.')[0])
  return { developerDir, sdk, usable: Boolean(major) && major <= MAX_IOS_SDK_MAJOR }
}

function findIosXcode() {
  const selected = selectedDeveloperDir()
  const current = selected ? describe(selected) : null
  if (current?.usable) return { ...current, selected: true }

  const fallback = installedDeveloperDirs()
    .filter((dir) => dir !== selected)
    .map(describe)
    .filter((candidate) => candidate.usable)
    .sort((a, b) => b.sdk.localeCompare(a.sdk, undefined, { numeric: true }))[0]

  return fallback ? { ...fallback, selected: false } : { ...current, usable: false }
}

module.exports = { findIosXcode, MAX_IOS_SDK_MAJOR }
