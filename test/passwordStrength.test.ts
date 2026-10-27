import { getPasswordStrength } from '../src/utils/passwordStrength'

describe('getPasswordStrength', () => {
  it('is only valid when every rule passes', () => {
    expect(getPasswordStrength('abc').valid).toBe(false)
    expect(getPasswordStrength('Abcdefghij1').valid).toBe(false)
    const strong = getPasswordStrength('Correct-Horse-9-Battery')
    expect(strong.valid).toBe(true)
    expect(strong.labelKey).toBe('backup.password.strength.strong')
  })
})
