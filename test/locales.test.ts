import fs from 'fs'
import path from 'path'

const srcDir = path.join(__dirname, '..', 'src')
const en = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales', 'en.json'), 'utf8'))

const hasKey = (key: string) => {
  let node: any = en
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return false
    node = node[part] ?? node[`${part}_one`] ?? node[`${part}_other`]
    if (node === undefined) return false
  }
  return true
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : sourceFiles(full)
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : []
  })
}

describe('en.json', () => {
  it('has every translation key used in the code', () => {
    const missing: string[] = []
    for (const file of sourceFiles(srcDir)) {
      const source = fs.readFileSync(file, 'utf8')
      for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
        const key = match[1]
        if (key.endsWith('_')) continue
        if (!hasKey(key)) missing.push(`${key} (${path.relative(srcDir, file)})`)
      }
    }
    expect(missing).toEqual([])
  })

  it('has no empty translations', () => {
    const empty: string[] = []
    const walk = (node: Record<string, unknown>, trail: string) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'object' && value !== null) {
          walk(value as Record<string, unknown>, `${trail}${key}.`)
        } else if (typeof value === 'string' && value.trim() === '') {
          empty.push(`${trail}${key}`)
        }
      }
    }
    walk(en, '')
    expect(empty).toEqual([])
  })
})
