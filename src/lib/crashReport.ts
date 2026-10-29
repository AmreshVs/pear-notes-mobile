import { Platform } from 'react-native'
import { File } from 'expo-file-system'

import { getAppVersionLabel } from '@/lib/appVersion'

// The website's contact form posts here too; FormSubmit forwards it by email.
// It only accepts requests from a page, so the send names the contact page.
const CRASH_REPORT_ENDPOINT = 'https://formsubmit.co/ajax/56678a3e75e24bb3c6476594b14f7113'
const CRASH_REPORT_ORIGIN = 'https://amreshvs.github.io'
const CRASH_REPORT_REFERRER = `${CRASH_REPORT_ORIGIN}/pear-notes/contact/`
const CRASH_REPORT_MAX_CHARS = 20000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Written by the backend (@pear-notes/core errorLog) when it dies of a fatal error.
const LAST_CRASH_FILE_NAME = 'last-crash.json'

export type CrashSource = 'backend' | 'startup' | 'render'

export type Crash = {
  source: CrashSource
  error?: string
  stack?: string
  at?: number
}

type BackendCrash = { at: number; kind: string; error: string; stack: string }

// The backend's last fatal error, if it happened at or after `since`: an older
// one belongs to a previous run and would explain the wrong crash.
export function readLastBackendCrash(storagePath: string, since: number): BackendCrash | null {
  try {
    const file = new File('file://' + storagePath.replace(/\/$/, '') + '/' + LAST_CRASH_FILE_NAME)
    if (!file.exists) return null
    const crash = JSON.parse(file.textSync()) as BackendCrash
    if (typeof crash?.at !== 'number' || crash.at < since) return null
    return crash
  } catch {
    return null
  }
}

// What the screen shows: the error, then its stack without the line repeated.
export function crashDetails(crash: Crash): string {
  const lines: string[] = []
  if (crash.error) lines.push(crash.error)
  let stack = crash.stack || ''
  if (crash.error && stack.startsWith(crash.error)) stack = stack.slice(crash.error.length)
  stack = stack.replace(/^\n+/, '')
  if (stack) lines.push('', stack)
  return lines.join('\n').trim()
}

// What Copy and Send carry: the details plus enough context to act on them.
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
