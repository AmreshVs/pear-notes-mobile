import { Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'
import { formatDebugReport, summarizeStalledMediaReset } from '@pear-notes/core/utils.js'

import { getAppBuildNumber, getAppVersionLabel } from './appVersion'

export type DebugSnapshot = Record<string, unknown> & {
  capturedAt?: number
  error?: string
}

function appSection() {
  return {
    version: getAppVersionLabel(),
    buildNumber: getAppBuildNumber(),
    surface: 'mobile',
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    expoSdk: Constants.expoConfig?.sdkVersion ?? null,
    appOwnership: Constants.appOwnership ?? null,
    deviceName: Constants.deviceName ?? null,
  }
}

export async function captureDebugSnapshot({ heavy = false } = {}): Promise<DebugSnapshot> {
  const backend = await backendApi.getDebugInfo({ heavy })
  return {
    ...backend,
    capturedAt: backend?.capturedAt || Date.now(),
    app: appSection(),
    appBoot: appBoot.snapshot(),
  }
}

export type StalledMediaResetSummary = {
  reset: number
  skipped: number
  reasons: string[]
  error: string
}

export async function resetStalledMedia(): Promise<StalledMediaResetSummary> {
  return summarizeStalledMediaReset(await backendApi.resetStalledMedia())
}

export function buildDebugReport(snapshot: DebugSnapshot | null): string {
  if (!snapshot) return ''
  return formatDebugReport(snapshot)
}

export async function copyDebugReport(snapshot: DebugSnapshot | null): Promise<boolean> {
  const report = buildDebugReport(snapshot)
  if (!report) return false
  await Clipboard.setStringAsync(report)
  return true
}

export async function shareDebugReport(snapshot: DebugSnapshot | null): Promise<boolean> {
  const report = buildDebugReport(snapshot)
  if (!report) return false
  const result = await Share.share({ message: report })
  return result.action !== Share.dismissedAction
}
