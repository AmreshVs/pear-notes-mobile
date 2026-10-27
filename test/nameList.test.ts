import { formatNameList } from '../src/utils/nameList'

describe('formatNameList', () => {
  it('reads as a natural list', () => {
    expect(formatNameList(['iPhone', 'Mac'], 'en')).toBe('iPhone and Mac')
    expect(formatNameList(['iPhone', 'Mac', 'Pixel'], 'en')).toBe('iPhone, Mac, and Pixel')
    expect(formatNameList(['iPhone'], 'en')).toBe('iPhone')
  })
})
