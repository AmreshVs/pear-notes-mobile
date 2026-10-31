import { Platform } from 'react-native'

import { backendApi } from '@pear-notes/core/backend/api.js'

import { getAppVersionLabel } from '@/lib/appVersion'

// FormSubmit rejects requests that do not name a page as their origin.
const CRASH_REPORT_ENDPOINT = 'https://formsubmit.co/ajax/56678a3e75e24bb3c6476594b14f7113'
const CRASH_REPORT_ORIGIN = 'https://amreshvs.github.io'
const CRASH_REPORT_REFERRER = `${CRASH_REPORT_ORIGIN}/pear-notes/contact/`
const CRASH_REPORT_MAX_CHARS = 20000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type CrashSource = 'backend' | 'startup' | 'render'

export type Crash = {
  source: CrashSource
  error?: string
  stack?: string
  at?: number
}

type BackendCrash = { kind: string; error: string; stack: string; at: number }

// Cores before the crash stream have no subscribeCrash.
export async function listenForBackendCrash(onCrash: (crash: Crash) => void) {
  try {
    const api = backendApi as { subscribeCrash?: () => Promise<any> }
    const crashes = await api.subscribeCrash?.()
    crashes?.on('error', () => {})
    crashes?.on('data', ({ error, stack, at }: BackendCrash) =>
      onCrash({ source: 'backend', error, stack, at }),
    )
  } catch {}
}

export function crashDetails(crash: Crash): string {
  const lines: string[] = []
  if (crash.error) lines.push(crash.error)
  let stack = crash.stack || ''
  if (crash.error && stack.startsWith(crash.error)) stack = stack.slice(crash.error.length)
  stack = stack.replace(/^\n+/, '')
  if (stack) lines.push('', stack)
  return lines.join('\n').trim()
}

export function formatCrashReport(
  crash: Crash,
  { title, message }: { title: string; message: string },
) {
  return [
    title,
    message,
    '',
    `Version: ${getAppVersionLabel()}`,
    `System: ${Platform.OS} ${Platform.Version}`,
    `Source: ${crash.source}`,
    `Time: ${new Date(crash.at || Date.now()).toISOString()}`,
    '',
    crashDetails(crash) || 'No error details were captured.',
  ].join('\n')
}

export async function sendCrashReport(
  report: string,
  { source, email }: { source: CrashSource; email?: string },
): Promise<boolean> {
  const replyTo = email && EMAIL_PATTERN.test(email.trim()) ? email.trim() : ''
  try {
    const response = await fetch(CRASH_REPORT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: CRASH_REPORT_ORIGIN,
        Referer: CRASH_REPORT_REFERRER,
      },
      body: JSON.stringify({
        _subject: `Pear Notes: crash report (${Platform.OS} ${source})`,
        _template: 'table',
        topic: 'Crash report',
        ...(replyTo ? { email: replyTo } : {}),
        message: report.slice(0, CRASH_REPORT_MAX_CHARS),
      }),
    })
    const result = await response.json().catch(() => null)
    return response.ok && String(result?.success) === 'true'
  } catch {
    return false
  }
}
