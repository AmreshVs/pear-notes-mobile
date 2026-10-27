import { Alert } from 'react-native'

import { confirmRestoreWithOutdatedDevices } from '../src/lib/restoreWarning'

const t = ((key: string) => key) as any
const devices = [{ title: 'iPhone' }, { title: '' }] as any

function pressButton(label: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as any[]
  buttons.find((button) => button.text === label).onPress()
}

describe('confirmRestoreWithOutdatedDevices', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('resolves true only when the user restores anyway', async () => {
    const answer = confirmRestoreWithOutdatedDevices(devices, t, 'en')
    pressButton('backup.outdatedDevices.restoreAnyway')
    await expect(answer).resolves.toBe(true)
  })

  it('resolves false on cancel', async () => {
    const answer = confirmRestoreWithOutdatedDevices(devices, t, 'en')
    pressButton('common.cancel')
    await expect(answer).resolves.toBe(false)
  })

  it('resolves false when dismissed', async () => {
    const answer = confirmRestoreWithOutdatedDevices(devices, t, 'en')
    ;(Alert.alert as jest.Mock).mock.calls[0][3].onDismiss()
    await expect(answer).resolves.toBe(false)
  })
})
