import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bareKitDir = path.join(projectRoot, 'node_modules', 'react-native-bare-kit')
const sharedLinker = path.join(projectRoot, 'scripts', 'link-native-addons.mjs')

const LINKERS = [
  {
    file: path.join(bareKitDir, 'android', 'link.mjs'),
    hosts: ['android-arm64', 'android-arm', 'android-ia32', 'android-x64'],
    out: './src/main/addons',
  },
  {
    file: path.join(bareKitDir, 'ios', 'link.mjs'),
    hosts: ['ios-arm64', 'ios-arm64-simulator', 'ios-x64-simulator'],
    out: './addons',
  },
]

if (!fs.existsSync(bareKitDir)) {
  console.log('react-native-bare-kit is not installed, skipping linker patch')
  process.exit(0)
}

for (const linker of LINKERS) {
  const relative = path.relative(path.dirname(linker.file), sharedLinker).split(path.sep).join('/')
  const source = [
    `import { linkNativeAddons } from '${relative}'`,
    '',
    'await linkNativeAddons({',
    `  hosts: ${JSON.stringify(linker.hosts)},`,
    `  out: new URL('${linker.out}', import.meta.url),`,
    '})',
    '',
  ].join('\n')
  fs.writeFileSync(linker.file, source)
}

console.log('Patched react-native-bare-kit linkers to skip unused on-device AI addons')
