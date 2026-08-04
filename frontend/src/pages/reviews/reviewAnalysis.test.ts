import { describe, expect, it } from 'vitest'
import type { ItemType, WorkItem } from '../../types'
import { buildReviewAnalysis, completionEvaluation } from './reviewEvaluation'
import { extractKeywords, meaningfulKeyword } from './reviewKeywords'
import { metrics } from './reviewMetrics'
import { currentRange, moveAnchor, previousRange } from './reviewPeriod'

let nextId = 1
function item(type: ItemType, content: string, workDate = '2026-08-04', extra: Partial<WorkItem> = {}): WorkItem {
  return { id: nextId++, type, content, workDate, ...extra }
}

describe('review periods', () => {
  it('builds aligned weekly and monthly ranges', () => {
    expect(currentRange('2026-08-04', 'WEEK')).toEqual({ from: '2026-08-03', to: '2026-08-09' })
    expect(previousRange({ from: '2026-08-01', to: '2026-08-31' }, 'MONTH')).toEqual({ from: '2026-07-01', to: '2026-07-31' })
    expect(moveAnchor('2026-08-31', 'MONTH', 1)).toBe('2026-09-01')
  })
})

describe('review keyword filtering', () => {
  it('rejects numeric, repeated, and excessively long tokens', () => {
    expect(meaningfulKeyword('123456')).toBe(false)
    expect(meaningfulKeyword('aaaaaaaa')).toBe(false)
    expect(meaningfulKeyword('가나다라마바사'.repeat(50))).toBe(false)
    expect(meaningfulKeyword('프로젝트')).toBe(true)
  })

  it('keeps meaningful words from long text without leaking noisy tokens', () => {
    const source = item('NOTE', `${'a'.repeat(500)} 프로젝트 프로젝트 회고 111111111111`)
    expect(extractKeywords([source])).toEqual([['프로젝트', 2], ['회고', 1]])
  })
})

describe('review metrics and evaluation', () => {
  it('excludes carried history from active todo metrics', () => {
    expect(metrics([item('TODO', 'old', '2026-08-03', { carriedToDate: '2026-08-04' }), item('TODO', 'current')]).todo).toHaveLength(1)
  })

  it.each([
    [96, 'positive'], [85, 'positive'], [70, 'positive'], [55, 'neutral'],
    [40, 'neutral'], [20, 'attention'], [1, 'attention'], [0, 'attention'],
  ] as const)('classifies completion rate %i as %s', (rate, tone) => {
    expect(completionEvaluation(rate, 0, rate ? 1 : 0, 1).tone).toBe(tone)
  })

  it('produces stable output and combines stale todo signals', () => {
    const current = [
      item('DONE', '완료한 핵심 기능', '2026-08-04'),
      item('TODO', '오래 남은 업무', '2026-07-10'),
      item('NOTE', '프로젝트 회고와 배움', '2026-08-03'),
    ]
    const previous = [item('TODO', '이전 업무', '2026-07-28')]
    const range = { from: '2026-08-01', to: '2026-08-07' }
    const first = buildReviewAnalysis(current, previous, range, '2026-08-07')
    const second = buildReviewAnalysis(current, previous, range, '2026-08-07')

    expect(first).toEqual(second)
    expect(first.staleTodos[0].days).toBe(28)
    expect(first.evaluationPoints.find((point) => point.label === '후속 관리')?.text).toContain('28일째')
    expect(first.evaluationPoints.find((point) => point.label === '종합 평가')).toBeDefined()
  })
})
