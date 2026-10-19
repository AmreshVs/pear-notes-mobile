import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

function listFiles(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...listFiles(full))
    else if (entry.isFile()) found.push(full)
  }
  return found
}

export function hashInputs(root, inputs, extra = []) {
  const hash = crypto.createHash('sha256')
  for (const input of inputs) {
    const full = path.join(root, input)
    if (!fs.existsSync(full)) {
      hash.update(`missing:${input}\0`)
      continue
    }
    const real = fs.realpathSync(full)
    const files = fs.statSync(real).isDirectory()
      ? listFiles(real)
          .map((file) => [path.join(input, path.relative(real, file)), file])
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      : [[input, real]]
    for (const [name, file] of files) {
      hash.update(`${name.split(path.sep).join('/')}\0`)
      hash.update(fs.readFileSync(file))
      hash.update('\0')
    }
  }
  for (const value of extra) hash.update(`${value ?? ''}\0`)
  return hash.digest('hex')
}

export function readStamp(stampPath) {
  try {
    return JSON.parse(fs.readFileSync(stampPath, 'utf8'))
  } catch {
    return null
  }
}

export function writeStamp(stampPath, stamp) {
  fs.writeFileSync(stampPath, `${JSON.stringify(stamp, null, 2)}\n`)
}
