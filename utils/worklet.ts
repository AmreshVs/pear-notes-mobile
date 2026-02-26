import HRPC from '@pear-notes/core/spec/hrpc/index.js'

const { setRPC } = require('@pear-notes/core/rpc.js')
const FramedStream = require('framed-stream')
const { Worklet } = require('react-native-bare-kit')

export async function startWorklet(storagePath: string) {
  const worklet = new Worklet()
  worklet.start('app:/main.bundle', require('../backend/backend.bundle'), [storagePath])

  const rpc = new HRPC(new FramedStream(worklet.IPC))
  setRPC(rpc)

  return { worklet, rpc }
}
