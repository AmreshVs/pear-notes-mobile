import { colorWithAlpha } from '../src/utils/color'

describe('colorWithAlpha', () => {
  it('adds alpha to hex colors, short or long', () => {
    expect(colorWithAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
    expect(colorWithAlpha('#0f0', 0.2)).toBe('rgba(0, 255, 0, 0.2)')
  })

  it('replaces the alpha of rgb colors', () => {
    expect(colorWithAlpha('rgb(1, 2, 3)', 0.4)).toBe('rgba(1, 2, 3, 0.4)')
    expect(colorWithAlpha('rgba(1, 2, 3, 1)', 0.4)).toBe('rgba(1, 2, 3, 0.4)')
  })

  it('leaves anything else alone', () => {
    expect(colorWithAlpha('red', 0.5)).toBe('red')
    expect(colorWithAlpha('', 0.5)).toBe('')
  })
})
