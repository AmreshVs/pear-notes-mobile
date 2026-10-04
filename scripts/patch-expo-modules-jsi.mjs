import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildScript = path.join(
  projectRoot,
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'scripts',
  'build-xcframework.sh',
)

const MARKER = '# @generated pear-notes-xcode27-fake-error'

const ANCHOR = `    SWIFT_COMPILATION_MODE=wholemodule \\
  )
`

const PATCHED = `    SWIFT_COMPILATION_MODE=wholemodule \\
  ) 2>&1 | sed 's/error: \\(the following command failed with exit code 0\\)/warning: \\1/'
  ${MARKER}
`

if (!fs.existsSync(buildScript)) {
  console.log('expo-modules-jsi is not installed, skipping Xcode 27 archive patch')
  process.exit(0)
}

const source = fs.readFileSync(buildScript, 'utf8')

if (source.includes(MARKER)) {
  console.log('expo-modules-jsi already patched for Xcode 27 archives')
  process.exit(0)
}

if (!source.includes(ANCHOR)) {
  console.error(
    [
      'Could not patch expo-modules-jsi build-xcframework.sh for Xcode 27.',
      'The upstream xcodebuild invocation changed, so iOS archives may fail with',
      '"the following command failed with exit code 0 but produced no further output".',
      `Re-check ${path.relative(projectRoot, buildScript)} and update this script.`,
    ].join('\n'),
  )
  process.exit(1)
}

fs.writeFileSync(buildScript, source.replace(ANCHOR, PATCHED))

console.log('Patched expo-modules-jsi so Xcode 27 fake SwiftCompile errors do not fail archives')
