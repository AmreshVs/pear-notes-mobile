import { Platform } from 'react-native'
import Constants from 'expo-constants'

const FALLBACK_VERSION = '1.0.0'

export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? FALLBACK_VERSION
}

export function getAppBuildNumber(): string | null {
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode
  if (build === null || build === undefined || build === '') return null
  return String(build)
}

export function getAppVersionLabel(): string {
  const build = getAppBuildNumber()
  const version = getAppVersion()
  return build ? `v${version} (${Number(build) % 100})` : `v${version}`
}
