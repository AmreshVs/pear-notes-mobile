import { getNoteLockPasswordCopy } from '../src/lib/noteLockPasswordCopy'

describe('getNoteLockPasswordCopy', () => {
  it('words creating a password for first set and change', () => {
    expect(getNoteLockPasswordCopy(true, 'set').button).toBe('noteLockPassword.createButton')
    expect(getNoteLockPasswordCopy(true, 'change').button).toBe('noteLockPassword.changeButton')
  })

  it('words entering a password for each purpose', () => {
    expect(getNoteLockPasswordCopy(false, 'unlock').button).toBe('noteLockPassword.unlockButton')
    expect(getNoteLockPasswordCopy(false, 'lock').button).toBe('noteLockPassword.lockButton')
    expect(getNoteLockPasswordCopy(false, 'change').placeholder).toBe(
      'noteLockPassword.currentPlaceholder',
    )
  })

  it('falls back to set when creating and unlock when entering', () => {
    expect(getNoteLockPasswordCopy(true, 'something')).toEqual(getNoteLockPasswordCopy(true, 'set'))
    expect(getNoteLockPasswordCopy(false)).toEqual(getNoteLockPasswordCopy(false, 'unlock'))
  })
})
