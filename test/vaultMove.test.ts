import { Alert } from 'react-native'

import { confirmVaultMove } from '../src/lib/vaultMove'

const t = ((key: string, options?: object) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as any

describe('confirmVaultMove', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('asks about the move and only runs it on confirm', () => {
    const onConfirm = jest.fn()
    confirmVaultMove('Home', 3, t, onConfirm)
    const [title, , buttons] = (Alert.alert as jest.Mock).mock.calls[0]
    expect(title).toContain('"count":3')
    expect(title).toContain('"name":"Home"')
    expect(buttons[0].style).toBe('cancel')
    expect(onConfirm).not.toHaveBeenCalled()
    buttons[1].onPress()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
