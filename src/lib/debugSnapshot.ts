import { Alert, Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'
import { formatDebugReport, formatErrorLog } from '@pear-notes/core/utils.js'

import type { ConfirmLabels, CopyFullReportLabels } from '@/utils/debugRows'

import ExpoNativeShareModule from '../../modules/expo-native-share'

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

export function buildDebugReport(snapshot: DebugSnapshot | null, { redact = true } = {}): string {
  if (!snapshot) return ''
  return formatDebugReport(snapshot, { redact })
}

export async function copyDebugReport(
  snapshot: DebugSnapshot | null,
  { redact = true } = {},
): Promise<boolean> {
  const report = buildDebugReport(snapshot, { redact })
  if (!report) return false
  await Clipboard.setStringAsync(report)
  return true
}

export function confirmCopyFullReport(labels: CopyFullReportLabels, onConfirm: () => void): void {
  Alert.alert(labels.title, labels.message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.confirm, onPress: onConfirm },
  ])
}

export async function shareDebugReport(snapshot: DebugSnapshot | null): Promise<boolean> {
  const report = buildDebugReport(snapshot)
  if (!report) return false
  const result = await Share.share({ message: report })
  return result.action !== Share.dismissedAction
}

export type ErrorLogEntry = {
  at: number
  lastAt: number
  count: number
  level: string
  source?: string
  message: string
  detail?: string
}

export type ErrorLog = {
  capturedAt?: number
  entries?: ErrorLogEntry[]
  error?: string
}

const ERROR_REPORT_DIR_PREFIX = 'error-report-'

export function readErrorLog(): Promise<ErrorLog> {
  return backendApi.getErrorLog()
}

export function clearErrorLog(): Promise<boolean> {
  return backendApi.clearErrorLog()
}

export async function buildErrorReport(): Promise<string> {
  const [snapshot, log] = await Promise.all([
    captureDebugSnapshot({ heavy: true }),
    backendApi.getErrorLog(),
  ])
  return `${formatDebugReport(snapshot)}\n${formatErrorLog(log)}`
}

export async function shareErrorReport(message: string): Promise<void> {
  const report = await buildErrorReport()
  const dir = `${FileSystem.cacheDirectory}${ERROR_REPORT_DIR_PREFIX}${Date.now()}/`
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = `${dir}pear-notes-logs-${stamp}.txt`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await FileSystem.writeAsStringAsync(dest, report)
  try {
    await ExpoNativeShareModule.share({ message, urls: [dest], resolveOnDismiss: true })
  } finally {
    await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {})
  }
}

export function confirmClearErrorLog(labels: ConfirmLabels, onConfirm: () => void): void {
  Alert.alert(labels.title, labels.message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.confirm, style: 'destructive', onPress: onConfirm },
  ])
}
