import type { WorkItem } from '../../types'

const stopWords = new Set(['그리고', '에서', '으로', '하는', '했다', '합니다', '대한', '위해', '현재', '경우', '사용', '작업', '기록'])

export function meaningfulKeyword(word: string) {
  if (word.length < 2 || word.length > 24 || !/[가-힣a-zA-Z]/.test(word)) return false
  const normalized = word.toLowerCase()
  const letters = normalized.replace(/[^가-힣a-z]/g, '')
  return new Set(letters).size > 1 && !/(.)\1{4,}/.test(normalized)
}

export function extractKeywords(items: WorkItem[]) {
  const counts = new Map<string, number>()
  items.flatMap((item) => item.content.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ').split(/\s+/))
    .map((word) => word.toLowerCase()).filter((word) => meaningfulKeyword(word) && !stopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
}
