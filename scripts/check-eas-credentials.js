const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const STATE_PATH = path.join(os.homedir(), '.expo', 'state.json')
const GRAPHQL = 'https://api.expo.dev/graphql'
const STORE_DISTRIBUTION = 'APP_STORE'

const ansi = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
}

const ok = (m) => console.log(`${ansi.green}  ok${ansi.reset}  ${m}`)
const warn = (m) => console.log(`${ansi.yellow}  !!${ansi.reset}  ${m}`)
const bad = (m) => console.log(`${ansi.red}FAIL${ansi.reset}  ${m}`)
const detail = (m) => console.log(`${ansi.dim}      ${m}${ansi.reset}`)

function readProjectId() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
  const projectId = appJson.expo?.extra?.eas?.projectId
  if (!projectId) throw new Error('app.json has no expo.extra.eas.projectId - run "eas init"')
  return projectId
}

function readSessionSecret() {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error('not logged in to EAS - run "eas login"')
  }
  const secret = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')).auth?.sessionSecret
  if (!secret) throw new Error('not logged in to EAS - run "eas login"')
  return secret
}

async function query(secret, projectId) {
  const response = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'expo-session': secret },
    body: JSON.stringify({
      query: `query($appId: String!) {
        app { byId(appId: $appId) {
          fullName
          iosAppCredentials {
            appStoreConnectApiKeyForSubmissions { keyIdentifier }
            iosAppBuildCredentialsList {
              iosDistributionType
              provisioningProfile { developerPortalIdentifier status }
            }
          }
          androidAppCredentials {
            googleServiceAccountKeyForSubmissions { clientEmail }
            androidAppBuildCredentialsList { name isDefault }
          }
        } }
      }`,
      variables: { appId: projectId },
    }),
  })

  const body = await response.json()
  if (body.errors) throw new Error(body.errors[0]?.message ?? `EAS API returned ${response.status}`)
  return body.data.app.byId
}

function reportIos(credentials) {
  console.log(`\n${ansi.bold}iOS${ansi.reset}`)

  const entry = credentials?.[0]
  const builds = entry?.iosAppBuildCredentialsList ?? []

  if (builds.length === 0) {
    bad('no build credentials on EAS')
    detail('eas credentials --platform ios -> select the "production" profile -> Build Credentials')
    return false
  }

  const types = builds.map((b) => b.iosDistributionType)
  const store = builds.find((b) => b.iosDistributionType === STORE_DISTRIBUTION)

  if (!store) {
    bad(`build credentials are ${types.join(', ')} - the store needs ${STORE_DISTRIBUTION}`)
    detail('Ad Hoc installs on listed devices only and cannot be submitted to TestFlight.')
    detail('eas credentials --platform ios -> pick the "production" profile (distribution: store)')
    return false
  }

  ok(
    `${STORE_DISTRIBUTION} profile ${store.provisioningProfile?.developerPortalIdentifier ?? '?'} (${store.provisioningProfile?.status ?? '?'})`,
  )

  const apiKey = entry?.appStoreConnectApiKeyForSubmissions
  if (!apiKey) {
    bad('no App Store Connect API key for submissions')
    detail('eas credentials --platform ios -> App Store Connect: Manage your API Key')
    detail('Without it "eas submit --non-interactive" cannot upload to TestFlight.')
    return false
  }

  ok(`App Store Connect API key ${apiKey.keyIdentifier}`)
  return true
}

function reportAndroid(credentials) {
  console.log(`\n${ansi.bold}Android${ansi.reset}`)

  const entry = credentials?.[0]
  const keystores = entry?.androidAppBuildCredentialsList ?? []

  if (keystores.length === 0) {
    bad('no keystore on EAS')
    detail('eas credentials --platform android -> Build Credentials -> set up a new keystore')
    return false
  }

  const active = keystores.find((k) => k.isDefault) ?? keystores[0]
  ok(`keystore "${active.name}"`)

  const easKey = entry?.googleServiceAccountKeyForSubmissions
  if (easKey) {
    ok(`Play service account on EAS: ${easKey.clientEmail}`)
    return true
  }

  const play = require('./playCredentials').describe()
  if (play) {
    ok(`Play upload key held locally (${play.source}): ${play.email}`)
    return true
  }

  warn('no Play upload key - the aab will have to be uploaded by hand')
  detail('node scripts/setup-play-key.js <path-to-key.json>')
  return true
}

async function main() {
  const projectId = readProjectId()
  const secret = readSessionSecret()
  const app = await query(secret, projectId)

  console.log(`\n${ansi.bold}Store credentials for ${app.fullName}${ansi.reset}`)

  const iosReady = reportIos(app.iosAppCredentials)
  const androidReady = reportAndroid(app.androidAppCredentials)

  console.log('')
  if (iosReady && androidReady) {
    console.log(`${ansi.green}Ready to build and upload both mobile platforms.${ansi.reset}\n`)
    return
  }
  console.log(`${ansi.yellow}Not ready — see the steps above.${ansi.reset}\n`)
  process.exit(1)
}

main().catch((error) => {
  console.error(`\n${ansi.red}FAILED${ansi.reset}  ${error.message}\n`)
  process.exit(1)
})
