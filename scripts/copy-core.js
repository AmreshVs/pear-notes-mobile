const fs = require('fs')
const path = require('path')

const sourceDir = path.resolve(__dirname, '../../pear-notes-core')
const targetDir = path.resolve(__dirname, '../node_modules/@pear-notes/core')

const entries = [
  'backend',
  'spec',
  'store',
  'activity.js',
  'constant.js',
  'index.js',
  'rpc.js',
  'utils.js',
  'types',
  'package.json',
  'README.md',
]

if (!fs.existsSync(sourceDir)) {
  console.error(`Source not found: ${sourceDir}`)
  process.exit(1)
}

for (const entry of entries) {
  const src = path.join(sourceDir, entry)
  const dest = path.join(targetDir, entry)

  if (!fs.existsSync(src)) continue

  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, { recursive: true })
  console.log(`Copied ${entry}`)
}

console.log(`@pear-notes/core synced into ${targetDir}`)
