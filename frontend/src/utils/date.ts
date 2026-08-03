export const localDate = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`)
  result.setDate(result.getDate() + days)
  return localDate(result)
}

export function formatKoreanDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ko-KR', options ?? {
    month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date(`${date}T12:00:00`))
}
