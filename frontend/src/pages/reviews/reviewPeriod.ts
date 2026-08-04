import { addDays, localDate } from '../../utils/date'

export type ReviewPeriod = 'WEEK' | 'MONTH'
export type ReviewRange = { from: string; to: string }

function mondayOf(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  const day = parsed.getDay() || 7
  return addDays(date, 1 - day)
}

function monthRange(date: string): ReviewRange {
  const [year, month] = date.split('-').map(Number)
  return { from: `${year}-${String(month).padStart(2, '0')}-01`, to: localDate(new Date(year, month, 0)) }
}

export function currentRange(anchor: string, period: ReviewPeriod): ReviewRange {
  return period === 'WEEK'
    ? { from: mondayOf(anchor), to: addDays(mondayOf(anchor), 6) }
    : monthRange(anchor)
}

export function previousRange(range: ReviewRange, period: ReviewPeriod): ReviewRange {
  return period === 'WEEK' ? { from: addDays(range.from, -7), to: addDays(range.from, -1) } : monthRange(addDays(range.from, -1))
}

export function moveAnchor(anchor: string, period: ReviewPeriod, direction: number) {
  if (period === 'WEEK') return addDays(anchor, direction * 7)
  const [year, month] = anchor.split('-').map(Number)
  return localDate(new Date(year, month - 1 + direction, 1))
}
