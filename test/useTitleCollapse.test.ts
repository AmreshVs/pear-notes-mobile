import { act, renderHook } from '@testing-library/react-native'

import {
  MIN_TITLE_COLLAPSE_DISTANCE,
  TITLE_COLLAPSE_BUFFER,
  TITLE_COLLAPSE_HYSTERESIS,
} from '../src/constants/constants'
import { useTitleCollapse } from '../src/hooks/useTitleCollapse'

const layout = (bottom: number) => ({ nativeEvent: { layout: { y: 0, height: bottom } } }) as any
const scroll = (y: number) => ({ nativeEvent: { contentOffset: { y } } }) as any

const TITLE_BOTTOM = 80
const COLLAPSE_AT = Math.max(TITLE_BOTTOM, MIN_TITLE_COLLAPSE_DISTANCE) + TITLE_COLLAPSE_BUFFER

describe('useTitleCollapse', () => {
  it('collapses the large title once the list scrolls past it, and expands again with a gap', async () => {
    const { result } = await renderHook(() => useTitleCollapse())
    await act(async () => result.current.handleTitleBlockLayout(layout(TITLE_BOTTOM)))
    await act(async () => result.current.scrollProps.onScrollBeginDrag())

    await act(async () => result.current.scrollProps.onScroll(scroll(COLLAPSE_AT - 1)))
    expect(result.current.isTitleCollapsed).toBe(false)
    await act(async () => result.current.scrollProps.onScroll(scroll(COLLAPSE_AT)))
    expect(result.current.isTitleCollapsed).toBe(true)

    await act(async () => result.current.scrollProps.onScroll(scroll(COLLAPSE_AT - 1)))
    expect(result.current.isTitleCollapsed).toBe(true)
    await act(async () =>
      result.current.scrollProps.onScroll(scroll(COLLAPSE_AT - TITLE_COLLAPSE_HYSTERESIS - 1)),
    )
    expect(result.current.isTitleCollapsed).toBe(false)
  })

  it('does not collapse before the title has been measured', async () => {
    const { result } = await renderHook(() => useTitleCollapse())
    await act(async () => result.current.scrollProps.onScroll(scroll(1000)))
    expect(result.current.isTitleCollapsed).toBe(false)
  })

  it('scrolls back to rest only after the user has scrolled', async () => {
    const scrollTo = jest.fn()
    const { result } = await renderHook(() => useTitleCollapse())
    result.current.scrollToRest({ scrollTo })
    expect(scrollTo).not.toHaveBeenCalled()
    await act(async () => result.current.scrollProps.onScrollBeginDrag())
    result.current.scrollToRest({ scrollTo })
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false })
  })
})
