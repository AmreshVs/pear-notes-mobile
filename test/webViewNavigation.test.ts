import { Linking } from 'react-native'

import { isEditorMessageSource, shouldStartEditorLoad } from '../src/lib/webViewNavigation'

const load = (url: string, isTopFrame = true) => ({ url, isTopFrame }) as any

describe('shouldStartEditorLoad', () => {
  let openURL: jest.SpyInstance

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    openURL.mockClear()
  })
  afterEach(() => jest.restoreAllMocks())

  it('allows the editor itself and blank pages', () => {
    expect(shouldStartEditorLoad(load('https://localhost/index.html'))).toBe(true)
    expect(shouldStartEditorLoad(load('about:blank'))).toBe(true)
    expect(shouldStartEditorLoad(load(''))).toBe(true)
  })

  it('allows embedded media only inside frames', () => {
    expect(shouldStartEditorLoad(load('data:image/png;base64,AAAA', false))).toBe(true)
    expect(shouldStartEditorLoad(load('data:image/png;base64,AAAA', true))).toBe(false)
    expect(shouldStartEditorLoad(load('http://127.0.0.1:8080/blob', false))).toBe(true)
    expect(shouldStartEditorLoad(load('http://127.0.0.1:8080/blob', true))).toBe(false)
  })

  it('opens web and mail links outside the editor instead of navigating', () => {
    expect(shouldStartEditorLoad(load('https://example.com'))).toBe(false)
    expect(openURL).toHaveBeenCalledWith('https://example.com')
    expect(shouldStartEditorLoad(load('mailto:a@b.com'))).toBe(false)
    expect(openURL).toHaveBeenCalledWith('mailto:a@b.com')
  })

  it('blocks other schemes without opening them', () => {
    expect(shouldStartEditorLoad(load(`${'java'}script:alert(1)`))).toBe(false)
    expect(shouldStartEditorLoad(load('intent://x'))).toBe(false)
    expect(openURL).not.toHaveBeenCalled()
  })
})

describe('isEditorMessageSource', () => {
  it('accepts messages only from the editor page', () => {
    expect(isEditorMessageSource('https://localhost/index.html')).toBe(true)
    expect(isEditorMessageSource(undefined)).toBe(true)
    expect(isEditorMessageSource('https://evil.example')).toBe(false)
    expect(isEditorMessageSource('https://localhost.evil.example')).toBe(false)
  })
})
