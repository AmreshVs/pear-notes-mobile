import {
  crashDetails,
  formatCrashReport,
  readLastBackendCrash,
  sendCrashReport,
} from '../src/lib/crashReport'

const files: Record<string, string> = {}

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string
    constructor(uri: string) {
      this.uri = uri
    }
    get exists() {
      return this.uri in files
    }
    textSync() {
      return files[this.uri]
    }
  },
}))

const STACK =
  "TypeError: Cannot read properties of null (reading 'dht')\n    at Member._poll (blind-pairing/index.js:398:20)"

describe('crash report', () => {
  afterEach(() => {
    for (const key of Object.keys(files)) delete files[key]
    jest.restoreAllMocks()
  })

  it('reads the backend crash from this run only', () => {
    files['file:///docs/last-crash.json'] = JSON.stringify({
      at: 2000,
      kind: 'unhandledRejection',
      error: "TypeError: Cannot read properties of null (reading 'dht')",
      stack: STACK,
    })
    expect(readLastBackendCrash('/docs/', 1000)?.stack).toBe(STACK)
    expect(readLastBackendCrash('/docs', 3000)).toBeNull()
    expect(readLastBackendCrash('/elsewhere', 0)).toBeNull()
  })

  it('ignores a crash file it cannot parse', () => {
    files['file:///docs/last-crash.json'] = '{not json'
    expect(readLastBackendCrash('/docs', 0)).toBeNull()
  })

  it('shows the error once, then the stack', () => {
    const details = crashDetails({
      source: 'backend',
      error: "TypeError: Cannot read properties of null (reading 'dht')",
      stack: STACK,
    })
    expect(details.match(/TypeError/g)).toHaveLength(1)
    expect(details).toContain('at Member._poll')
  })

  it('puts the context in the report', () => {
    const report = formatCrashReport(
      {
        source: 'backend',
        error: 'Error: boom',
        stack: 'Error: boom\n    at x',
        at: Date.UTC(2026, 9, 29),
      },
      { title: 'Pear Notes stopped', message: 'It stopped.' },
    )
    expect(report.startsWith('Pear Notes stopped\nIt stopped.')).toBe(true)
    expect(report).toContain('Version: v')
    expect(report).toContain('System: ')
    expect(report).toContain('Source: backend')
    expect(report).toContain('Time: 2026-10-29T00:00:00.000Z')
    expect(report).toContain('    at x')
  })

  it('sends the report, with a reply address only when it is one', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: 'true' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(
      sendCrashReport('report', { source: 'backend', email: ' me@example.com ' }),
    ).resolves.toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('formsubmit.co/ajax/')
    expect(init.headers.Referer).toBe('https://amreshvs.github.io/pear-notes/contact/')
    const body = JSON.parse(init.body)
    expect(body.email).toBe('me@example.com')
    expect(body.message).toBe('report')

    await sendCrashReport('report', { source: 'backend', email: 'not an email' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).email).toBeUndefined()
  })

  it('reports a failed send', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: 'false' }),
    }) as unknown as typeof fetch
    await expect(sendCrashReport('report', { source: 'render' })).resolves.toBe(false)
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    await expect(sendCrashReport('report', { source: 'render' })).resolves.toBe(false)
  })
})
