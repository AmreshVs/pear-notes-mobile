import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GITHUB_URL_FORMS = ['https://github.com/', 'ssh://git@github.com/', 'git@github.com:']

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function giveGitAccessToCore() {
  const token = process.env.CORE_REPO_TOKEN
  if (!token) {
    console.error('CORE_REPO_TOKEN is not set in the EAS "production" environment')
    process.exit(1)
  }
  const authenticated = `https://x-access-token:${token}@github.com/`
  GITHUB_URL_FORMS.forEach((form, index) => {
    const mode = index === 0 ? [] : ['--add']
    run('git', ['config', '--global', ...mode, `url.${authenticated}.insteadOf`, form])
  })
}

function linkNativeAddons() {
  run(process.execPath, [path.join(ROOT, 'scripts', 'prepare-native-addons.mjs')])
  if (process.env.EAS_BUILD_PLATFORM === 'ios') {
    run(process.execPath, [
      path.join(ROOT, 'node_modules', 'react-native-bare-kit', 'ios', 'link.mjs'),
    ])
  }
}

const HOOKS = { 'pre-install': giveGitAccessToCore, 'post-install': linkNativeAddons }

if (process.env.EAS_BUILD_RUNNER === 'eas-build') HOOKS[process.argv[2]]?.()
