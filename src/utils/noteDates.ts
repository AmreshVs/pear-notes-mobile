const yearIfOther = (date: Date) =>
  date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' as const }

export function shortDate(ms: number): string {
  if (!ms) return ''
  const date = new Date(ms)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', ...yearIfOther(date) })
}

export function findingDay(isoDate: string, time: string | null): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const label = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...yearIfOther(date),
  })
  return time ? `${label} ${time}` : label
}
