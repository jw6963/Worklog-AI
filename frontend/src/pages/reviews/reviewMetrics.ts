import type { WorkItem } from '../../types'

export function metrics(items: WorkItem[]) {
  const done = items.filter((item) => item.type === 'DONE')
  const todo = items.filter((item) => item.type === 'TODO' && !item.carriedToDate)
  const notes = items.filter((item) => item.type === 'NOTE')
  return { done, todo, notes, rate: done.length + todo.length ? Math.round(done.length / (done.length + todo.length) * 100) : 0 }
}

export function trend(current: number, previous: number, suffix = '') {
  const difference = current - previous
  return difference ? `이전 기간보다 ${Math.abs(difference)}${suffix} ${difference > 0 ? '증가' : '감소'}` : '이전 기간과 같음'
}

export function daysBetween(from: string, to: string) {
  return Math.max(0, Math.floor((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000))
}

export function itemTitle(item: WorkItem) {
  return item.content.replace(/[#*_`>\-[\]]/g, '').split('\n').find((line) => line.trim())?.trim() ?? item.content
}

export function summaryTitle(item: WorkItem) {
  const title = itemTitle(item)
  return title.length > 42 ? `${title.slice(0, 42)}…` : title
}

export type ProjectStat = { name: string; color: string; count: number; id?: number }

export function projectStats(items: WorkItem[]): ProjectStat[] {
  const counts = new Map<string, ProjectStat>()
  items.forEach((item) => {
    const key = String(item.project?.id ?? 'none')
    const value = counts.get(key) ?? { name: item.project?.name ?? '프로젝트 없음', color: item.project?.color ?? '#b8b8b4', count: 0, id: item.project?.id }
    value.count += 1
    counts.set(key, value)
  })
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6)
}
