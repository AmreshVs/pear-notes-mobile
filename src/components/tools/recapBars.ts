import type { Recap } from '@/hooks/useRecap'

const EMPTY_BAR_HEIGHT = 6
const MIN_BAR_HEIGHT = 12
const MAX_BAR_HEIGHT = 64

export type RecapBar = {
  start: number
  count: number
  height: number
  isToday: boolean
  letter: string
  dayName: string
}

/** One bar per day of the recap week, scaled to the busiest day. */
export function recapBars(recap: Recap, language: string): RecapBar[] {
  const busiest = Math.max(1, ...recap.days.map((day) => day.notes.length))
  const last = recap.days.length - 1
  return recap.days.map((day, index) => {
    const count = day.notes.length
    const date = new Date(day.start)
    return {
      start: day.start,
      count,
      height:
        count === 0
          ? EMPTY_BAR_HEIGHT
          : MIN_BAR_HEIGHT + ((MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * count) / busiest,
      isToday: index === last,
      letter: date.toLocaleDateString(language, { weekday: 'narrow' }),
      dayName: date.toLocaleDateString(language, { weekday: 'long' }),
    }
  })
}
