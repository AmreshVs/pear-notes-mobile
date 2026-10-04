const crypto = require('crypto')
const fs = require('fs')
const https = require('https')
const net = require('net')

const play = require('./playCredentials')

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3
const RETRY_BASE_MS = 5000
const UPLOAD_TIMEOUT_MS = 15 * 60_000

net.setDefaultAutoSelectFamilyAttemptTimeout(3000)

class PlayUploadError extends Error {
  constructor(message, hint) {
    super(message)
    this.hint = hint
  }
}

async function accessToken(key) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const header = enc({ alg: 'RS256', typ: 'JWT' })
  const claim = enc({ iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 })
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), key.private_key)
    .toString('base64url')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`,
    }),
  })

  const body = await res.json()
  if (!body.access_token) {
    throw new PlayUploadError(
      `Google rejected the service account: ${body.error_description ?? body.error ?? res.status}`,
      'Check the key is current and that the Google Play Android Developer API is enabled',
    )
  }
  return body.access_token
}

async function call(token, url, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body && typeof body === 'object' ? JSON.stringify(body) : body,
  })

  const text = await res.text()
  const parsed = text ? JSON.parse(text) : {}

  if (!res.ok) {
    const message = parsed.error?.message ?? `HTTP ${res.status}`
    const error = new PlayUploadError(message)
    error.status = res.status
    error.retryable = RETRYABLE_STATUS.has(res.status)
    throw error
  }
  return parsed
}

function uploadBundle(token, packageName, editId, aabPath, onProgress) {
  const size = fs.statSync(aabPath).size
  const url = new URL(`${UPLOAD_API}/${packageName}/edits/${editId}/bundles?uploadType=media`)

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': size,
        },
      },
      (response) => {
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          text += chunk
        })
        response.on('end', () => {
          let parsed = {}
          try {
            parsed = text ? JSON.parse(text) : {}
          } catch {
            parsed = {}
          }

          if (response.statusCode >= 200 && response.statusCode < 300) return resolve(parsed)

          const error = new PlayUploadError(
            parsed.error?.message ?? `upload failed with HTTP ${response.statusCode}`,
          )
          error.status = response.statusCode
          error.retryable = RETRYABLE_STATUS.has(response.statusCode)
          reject(error)
        })
      },
    )

    request.setTimeout(UPLOAD_TIMEOUT_MS, () => {
      request.destroy(
        new PlayUploadError(`Google sent no response within ${UPLOAD_TIMEOUT_MS / 60000} minutes`),
      )
    })

    request.on('error', (error) => {
      const wrapped =
        error instanceof PlayUploadError
          ? error
          : new PlayUploadError(`upload connection failed: ${error.message}`)
      wrapped.retryable = true
      reject(wrapped)
    })

    let sent = 0
    const source = fs.createReadStream(aabPath)
    source.on('data', (chunk) => {
      sent += chunk.length
      onProgress(sent, size)
    })
    source.on('error', (error) => request.destroy(error))
    source.pipe(request)
  })
}

async function withRetries(label, attempt) {
  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    try {
      return await attempt()
    } catch (error) {
      const last = i === MAX_ATTEMPTS
      if (last || !error.retryable) throw error
      const wait = RETRY_BASE_MS * i
      console.log(
        `  ${label} failed with ${error.status}, retrying in ${wait / 1000}s (${i}/${MAX_ATTEMPTS - 1})`,
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

async function submit({
  packageName,
  aabPath,
  track = 'internal',
  releaseStatus = 'completed',
  changesNotSentForReview = false,
  dryRun = false,
  releaseName,
  onProgress = () => {},
  onStep = () => {},
}) {
  if (!fs.existsSync(aabPath)) throw new PlayUploadError(`no such file: ${aabPath}`)

  const materialized = play.materialize()
  if (!materialized) {
    throw new PlayUploadError(
      'no Play upload key configured',
      'Run: node scripts/setup-play-key.js <path-to-key.json>',
    )
  }

  let key
  try {
    key = JSON.parse(fs.readFileSync(materialized.path, 'utf8'))
  } finally {
    materialized.cleanup()
  }

  onStep('authenticating')
  const token = await accessToken(key)

  onStep('opening an edit')
  const edit = await withRetries('opening the edit', () =>
    call(token, `${API}/${packageName}/edits`, { method: 'POST' }),
  )

  try {
    onStep('uploading the bundle')
    const bundle = await withRetries('the upload', () =>
      uploadBundle(token, packageName, edit.id, aabPath, onProgress),
    )

    const versionCode = bundle.versionCode
    onStep(`assigning versionCode ${versionCode} to the ${track} track`)

    await withRetries('the track update', () =>
      call(token, `${API}/${packageName}/edits/${edit.id}/tracks/${track}`, {
        method: 'PUT',
        body: {
          track,
          releases: [
            {
              versionCodes: [String(versionCode)],
              status: releaseStatus,
              ...(releaseName ? { name: releaseName } : {}),
            },
          ],
        },
      }),
    )

    if (dryRun) {
      onStep('discarding the edit (dry run - nothing is published)')
      await call(token, `${API}/${packageName}/edits/${edit.id}`, { method: 'DELETE' })
      return { versionCode, track, releaseStatus, serviceAccount: key.client_email, dryRun: true }
    }

    onStep('committing')
    const query = changesNotSentForReview ? '?changesNotSentForReview=true' : ''
    await withRetries('the commit', () =>
      call(token, `${API}/${packageName}/edits/${edit.id}:commit${query}`, { method: 'POST' }),
    )

    return { versionCode, track, releaseStatus, serviceAccount: key.client_email }
  } catch (error) {
    try {
      await call(token, `${API}/${packageName}/edits/${edit.id}`, { method: 'DELETE' })
    } catch {}
    throw error
  }
}

module.exports = { PlayUploadError, submit }
