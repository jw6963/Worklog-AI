import type { WorkItem } from '../../types'
import { localDate } from '../../utils/date'
import type { ReviewRange } from './reviewPeriod'
import { daysBetween, metrics, projectStats, summaryTitle } from './reviewMetrics'
import { extractKeywords } from './reviewKeywords'

export type EvaluationTone = 'positive' | 'neutral' | 'attention'
export type EvaluationPoint = { label: string; tone: EvaluationTone; text: string }

const completionLevels = [
  { min: 95, tone: 'positive', phrases: ['거의 모든 업무를 마무리해 열린 항목이 드뭅니다.', '착수한 업무 대부분이 결과로 연결된 기간입니다.', '완료 단계까지 도달한 업무 비중이 매우 높습니다.'] },
  { min: 85, tone: 'positive', phrases: ['대부분의 업무가 완료되어 마무리 흐름이 매우 안정적입니다.', '새로 벌인 일보다 끝낸 일이 확실히 많은 기간입니다.', '미완료를 크게 남기지 않고 결과를 축적했습니다.'] },
  { min: 70, tone: 'positive', phrases: ['완료한 업무가 뚜렷하게 많아 전반적인 진행이 원활합니다.', '진행 중인 일보다 마친 일이 많아 흐름이 안정적입니다.', '업무를 결과로 전환하는 비율이 양호합니다.'] },
  { min: 55, tone: 'neutral', phrases: ['절반 이상을 완료했지만 이어서 관리할 업무도 남아 있습니다.', '마무리 흐름은 우세하지만 다음 기간으로 이어질 일이 보입니다.', '완료가 앞서고 있으나 열린 업무를 정리하면 흐름이 더 선명해집니다.'] },
  { min: 40, tone: 'neutral', phrases: ['완료와 진행 중인 업무가 비슷해 마무리 속도를 높일 여지가 있습니다.', '착수와 완료가 균형을 이루지만 미완료가 누적되지 않는지 살펴볼 시점입니다.', '진행은 활발하지만 결과로 닫히는 비율은 중간 수준입니다.'] },
  { min: 20, tone: 'attention', phrases: ['완료보다 열린 업무가 많아 우선순위와 범위를 점검할 시점입니다.', '새로 진행한 일에 비해 마무리된 결과가 적은 편입니다.', '동시에 진행하는 업무를 줄이면 완료 흐름을 높일 수 있습니다.'] },
  { min: 1, tone: 'attention', phrases: ['일부 업무만 완료되어 미완료 항목을 작게 나누거나 정리할 필요가 있습니다.', '업무는 움직였지만 완료 단계에 도달한 항목은 제한적입니다.', '결과보다 진행 기록이 많이 남아 다음 행동을 구체화할 필요가 있습니다.'] },
  { min: 0, tone: 'attention', phrases: ['완료 처리된 업무가 없어 현재 기간의 마무리 흐름을 확인하기 어렵습니다.', '열린 업무만 남아 있어 무엇을 끝냈는지 기록상 확인되지 않습니다.', '완료 결과가 아직 기록되지 않아 진행 상태 중심으로만 회고할 수 있습니다.'] },
] as const

const completionChanges = [
  { min: 20, phrases: ['이전 기간보다 완료 흐름이 크게 반등했습니다.', '직전 기간과 비교하면 마무리 속도가 확연히 좋아졌습니다.'] },
  { min: 10, phrases: ['이전 기간보다 완료 흐름이 뚜렷하게 좋아졌습니다.', '완료 비중이 두 자릿수 폭으로 상승했습니다.'] },
  { min: 3, phrases: ['이전 기간보다 완료 흐름이 소폭 좋아졌습니다.', '작지만 긍정적인 완료율 상승이 보입니다.'] },
  { min: -2, phrases: ['이전 기간과 비슷한 수준을 유지했습니다.', '완료 흐름에 큰 변화 없이 안정적으로 이어졌습니다.'] },
  { min: -9, phrases: ['이전 기간보다 완료 흐름이 소폭 낮아졌습니다.', '완료율이 조금 내려갔지만 급격한 변화는 아닙니다.'] },
  { min: -19, phrases: ['이전 기간보다 완료 흐름이 눈에 띄게 낮아졌습니다.', '직전 기간보다 열린 업무가 결과로 이어지는 비율이 줄었습니다.'] },
  { min: -Infinity, phrases: ['이전 기간보다 완료 흐름이 크게 낮아져 남은 업무 점검이 필요합니다.', '완료율 하락 폭이 커서 업무 범위나 장애물을 확인해야 합니다.'] },
] as const

function pick<T>(values: readonly T[], seed: number) { return values[Math.abs(seed) % values.length] }

export function completionEvaluation(rate: number, difference: number, done: number, todo: number) {
  if (!done && !todo) return { tone: 'neutral' as EvaluationTone, text: '완료율을 계산할 TODO 또는 DONE 기록이 없습니다.' }
  const seed = done * 31 + todo * 17 + rate
  const level = completionLevels.find((candidate) => rate >= candidate.min) ?? completionLevels.at(-1)!
  const change = completionChanges.find((candidate) => difference >= candidate.min) ?? completionChanges.at(-1)!
  return { tone: level.tone as EvaluationTone, text: `${pick(level.phrases, seed)} ${pick(change.phrases, seed + difference)}` }
}

function consistencyEvaluation(rate: number, activeDays: number) {
  const phrases = rate >= 90 ? ['거의 매일 기록해 업무 흐름이 매우 선명하게 남아 있습니다.', '기록 공백이 거의 없어 기간의 변화를 촘촘하게 되짚을 수 있습니다.']
    : rate >= 70 ? ['기간 전반에 꾸준히 기록해 흐름을 파악하기 좋습니다.', '대부분의 날짜에 흔적을 남겨 업무 맥락이 잘 이어집니다.']
      : rate >= 50 ? ['절반 이상의 날짜에 기록했지만 중간중간 비어 있는 날이 있습니다.', '주요 흐름은 보이지만 일부 날짜의 진행 과정은 빠져 있습니다.']
        : rate >= 30 ? ['특정 날짜에 기록이 몰려 있어 일별 흐름은 일부만 확인할 수 있습니다.', '간헐적으로 기록해 활동은 보이지만 연속성은 다소 약합니다.']
          : rate > 0 ? ['기록 간격이 길어 기간 전체의 진행 과정을 판단하기 어렵습니다.', '소수 날짜에만 기록이 있어 실제 업무 흐름보다 축소되어 보일 수 있습니다.']
            : ['이 기간에는 기록한 날짜가 없습니다.']
  return pick(phrases, activeDays)
}

function focusEvaluation(projectName: string | undefined, ratio: number) {
  if (!projectName) return '프로젝트가 지정된 기록이 없어 프로젝트별 집중도를 판단할 수 없습니다.'
  if (ratio >= 85) return `'${projectName}' 프로젝트가 ${ratio}%를 차지해 업무가 사실상 한 프로젝트에 집중됐습니다.`
  if (ratio >= 70) return `'${projectName}' 프로젝트가 ${ratio}%를 차지해 집중도가 높은 편입니다.`
  if (ratio >= 50) return `'${projectName}' 프로젝트가 ${ratio}%로 절반 이상을 차지하지만 다른 업무도 함께 진행했습니다.`
  if (ratio >= 30) return `'${projectName}' 프로젝트가 ${ratio}%로 가장 많지만 업무는 비교적 여러 영역에 분산됐습니다.`
  return `가장 많은 '${projectName}' 프로젝트도 ${ratio}%여서 여러 프로젝트를 고르게 다뤘습니다.`
}

export function buildReviewAnalysis(items: WorkItem[], previousItems: WorkItem[], range: ReviewRange, today = localDate()) {
  const current = metrics(items)
  const before = metrics(previousItems)
  const referenceDate = range.to < today ? range.to : today
  const staleTodos = current.todo.map((item) => ({ item, days: daysBetween(item.workDate, referenceDate) })).filter(({ days }) => days > 0).sort((a, b) => b.days - a.days).slice(0, 6)
  const keywords = extractKeywords(items)
  const projects = projectStats(items)
  const activeDays = new Set(items.map((item) => item.workDate)).size
  const previousActiveDays = new Set(previousItems.map((item) => item.workDate)).size
  const availableDays = Math.max(1, daysBetween(range.from, referenceDate) + 1)
  const consistencyRate = Math.round(activeDays / availableDays * 100)
  const topTopics = keywords.slice(0, 3).map(([word]) => word)
  const completedTitles = current.done.slice(0, 3).map(summaryTitle)
  const dominantProject = projects.find((project) => project.id != null)
  const unassignedProject = projects.find((project) => project.id == null)
  const projectSummary = dominantProject
    ? ` '${dominantProject.name}' 프로젝트 기록이 ${dominantProject.count}개로 가장 많았습니다.${unassignedProject ? ` 프로젝트 미지정 기록은 ${unassignedProject.count}개입니다.` : ''}`
    : unassignedProject ? ` 프로젝트가 지정되지 않은 기록이 ${unassignedProject.count}개입니다.` : ''
  const activitySummary = items.length ? `${activeDays}일 동안 ${items.length}개를 기록했습니다.${projectSummary}${topTopics.length ? ` 자주 등장한 주제는 ${topTopics.map((topic) => `'${topic}'`).join(', ')}입니다.` : ''}` : '아직 분석할 기록이 없습니다.'
  const resultSummary = completedTitles.length ? `완료 기록에서는 ${completedTitles.map((title) => `'${title}'`).join(', ')}${current.done.length > completedTitles.length ? ` 외 ${current.done.length - completedTitles.length}개` : ''}를 마쳤습니다.` : '이 기간에는 완료로 기록된 결과가 없어 구체적인 성과를 요약하기 어렵습니다.'
  const dominantProjectRatio = dominantProject && items.length ? Math.round(dominantProject.count / items.length * 100) : 0
  const unassignedRatio = unassignedProject && items.length ? Math.round(unassignedProject.count / items.length * 100) : 0
  const itemDifference = items.length - previousItems.length
  const rateDifference = current.rate - before.rate
  const noteDifference = current.notes.length - before.notes.length
  const completionInsight = completionEvaluation(current.rate, rateDifference, current.done.length, current.todo.length)
  const oldestTodoDays = staleTodos[0]?.days ?? 0
  const followUpText = !staleTodos.length ? '하루 이상 장기 미완료 상태인 할 일이 없어 후속 관리가 잘 정리되어 있습니다.' : oldestTodoDays >= 30 ? `${staleTodos.length}개의 할 일이 남아 있고 가장 오래된 항목은 ${oldestTodoDays}일째입니다. 장기 보류인지 실제 진행 업무인지 재분류가 필요합니다.` : oldestTodoDays >= 14 ? `${staleTodos.length}개의 할 일이 남아 있고 가장 오래된 항목은 ${oldestTodoDays}일째입니다. 다음 기간의 우선 업무로 올리거나 범위를 줄여보세요.` : oldestTodoDays >= 7 ? `${staleTodos.length}개의 할 일이 남아 있고 가장 오래된 항목은 ${oldestTodoDays}일째입니다. 일주일 이상 머문 업무부터 장애물을 확인할 필요가 있습니다.` : oldestTodoDays >= 3 ? `${staleTodos.length}개의 할 일이 남아 있고 가장 오래된 항목은 ${oldestTodoDays}일째입니다. 아직 심각한 지연은 아니지만 다음 회고에서 다시 확인하세요.` : `${staleTodos.length}개의 할 일이 하루 이상 남아 있지만 모두 최근 항목이라 자연스러운 진행 범위입니다.`
  const signals = [current.rate >= 70, rateDifference >= -3, consistencyRate >= 50, oldestTodoDays < 7, current.notes.length > 0, unassignedRatio < 30]
  const score = signals.filter(Boolean).length
  const overallTone: EvaluationTone = score >= 5 ? 'positive' : score >= 3 ? 'neutral' : 'attention'
  const strengths = [current.rate >= 70 && '완료 흐름', consistencyRate >= 70 && '꾸준한 기록', current.notes.length > 0 && '메모와 배움', !staleTodos.length && '미완료 정리'].filter(Boolean)
  const concerns = [current.rate < 40 && '낮은 완료 비율', consistencyRate < 30 && '긴 기록 공백', oldestTodoDays >= 7 && '장기 미완료 업무', unassignedRatio >= 30 && '프로젝트 미분류'].filter(Boolean)
  const overallText = `${pick(score >= 5 ? ['완료·기록·후속 관리가 전반적으로 안정적인 기간입니다.', '결과와 과정 기록이 균형을 이루며 흐름이 안정적으로 이어졌습니다.', '업무를 진행하고 정리하는 리듬이 전반적으로 잘 유지됐습니다.'] : score >= 3 ? ['좋은 흐름과 보완할 지점이 함께 보이는 기간입니다.', '성과 신호는 있으나 몇 가지 관리 지점도 함께 드러납니다.', '전반적인 흐름은 유지됐지만 다음 기간에 다듬을 부분이 남았습니다.'] : ['다음 기간을 시작하기 전에 열린 업무와 기록 방식을 정리할 필요가 있습니다.', '활동은 있었지만 결과와 기록의 연결을 다시 정비할 시점입니다.', '현재 흐름을 그대로 이어가기보다 업무 범위와 기록 습관을 한번 재설계하는 편이 좋습니다.'], items.length * 13 + current.done.length * 7 + activeDays)}${strengths.length ? ` 강점은 ${strengths.join(', ')}입니다.` : ''}${concerns.length ? ` 우선 확인할 부분은 ${concerns.join(', ')}입니다.` : ' 뚜렷한 위험 신호는 많지 않습니다.'}`
  const patternText = consistencyRate >= 70 && rateDifference <= -10 ? '기록은 꾸준하지만 완료율이 낮아졌습니다. 실행량 부족보다는 업무 난이도, 외부 의존성 또는 동시에 진행하는 일의 수가 영향을 줬을 가능성이 있습니다.' : current.rate >= 75 && dominantProjectRatio >= 70 ? `높은 완료율과 프로젝트 집중이 함께 나타났습니다. '${dominantProject?.name}'에 집중한 것이 결과를 만드는 데 유리하게 작용한 흐름입니다.` : itemDifference >= Math.max(3, Math.round(previousItems.length * .5)) && current.rate < 40 ? '기록량은 크게 늘었지만 완료 비율은 낮습니다. 새 업무 유입 속도가 마무리 속도보다 빠른 과부하 패턴일 수 있습니다.' : current.notes.length >= Math.max(3, current.done.length) ? '완료 결과만큼 메모와 배움이 많이 남았습니다. 실행뿐 아니라 판단 근거와 지식을 축적한 탐색형 기간에 가깝습니다.' : oldestTodoDays >= 14 && current.rate >= 70 ? '전체 완료 흐름은 좋지만 오래 남은 소수 업무가 있습니다. 전반적 생산성보다 특정 항목의 구조적 장애물을 따로 살펴보는 편이 정확합니다.' : current.rate >= 70 && consistencyRate < 30 ? '기록한 날은 적지만 완료율은 높습니다. 짧게 집중해 결과를 낸 것인지, 중간 과정이 기록에서 빠진 것인지 구분해 볼 필요가 있습니다.' : topTopics.length >= 2 ? `${topTopics.slice(0, 2).map((topic) => `'${topic}'`).join('와 ')}가 반복되어 이 기간의 중심 맥락을 형성했습니다. 관련 완료와 미완료 항목을 함께 보면 다음 우선순위를 잡기 쉽습니다.` : '한 가지 강한 패턴보다는 여러 신호가 섞여 있습니다. 개별 완료 항목과 오래 남은 TODO를 함께 보는 것이 가장 정확합니다.'
  const nextAction = oldestTodoDays >= 14 ? `가장 오래된 ${oldestTodoDays}일째 TODO를 계속 진행, 보류, 삭제 중 하나로 명확히 결정해 보세요.` : current.rate < 40 && current.todo.length >= 3 ? `남은 ${current.todo.length}개 중 다음 기간에 반드시 끝낼 1~3개만 먼저 고르고 나머지는 우선순위를 낮춰보세요.` : consistencyRate < 30 ? '매일 길게 쓰기보다 업무 종료 전에 완료·미완료·배움 한 줄씩만 남기는 최소 기록 규칙을 시도해 보세요.' : unassignedRatio >= 30 ? `프로젝트 미지정 기록 ${unassignedProject?.count ?? 0}개 중 반복해서 조회할 항목부터 프로젝트를 지정해 보세요.` : !current.notes.length ? '완료 결과 중 하나를 골라 무엇이 잘됐고 다음에 무엇을 반복할지 메모로 남겨보세요.' : '현재 흐름을 유지하면서 다음 회고에서 완료율과 장기 TODO가 같은 방향으로 개선되는지 확인해 보세요.'
  const points: EvaluationPoint[] = items.length ? [
    { label: '종합 평가', tone: overallTone, text: overallText },
    { label: '업무량', tone: 'neutral', text: `${items.length}개를 기록했으며 ${itemDifference === 0 ? '이전 기간과 같은 수입니다' : `이전 기간보다 ${Math.abs(itemDifference)}개 ${itemDifference > 0 ? '많습니다' : '적습니다'}`}. 기록한 날은 이전 기간 ${previousActiveDays}일에서 ${activeDays}일로 ${activeDays === previousActiveDays ? '유지됐습니다' : activeDays > previousActiveDays ? '늘었습니다' : '줄었습니다'}.` },
    { label: '완료 흐름', tone: completionInsight.tone, text: `완료 비율은 ${current.rate}%입니다. ${completionInsight.text}` },
    { label: '기록 습관', tone: consistencyRate >= 70 ? 'positive' : consistencyRate >= 35 ? 'neutral' : 'attention', text: `확인 가능한 ${availableDays}일 중 ${activeDays}일에 기록해 기록 지속률은 ${consistencyRate}%입니다. ${consistencyEvaluation(consistencyRate, activeDays)}` },
    { label: '업무 집중', tone: dominantProjectRatio >= 70 ? 'attention' : 'neutral', text: focusEvaluation(dominantProject?.name, dominantProjectRatio) },
    { label: '회고 습관', tone: current.notes.length ? 'positive' : 'attention', text: current.notes.length ? `메모와 배움을 ${current.notes.length}개 남겼으며 ${noteDifference === 0 ? '이전 기간과 같습니다' : `이전 기간보다 ${Math.abs(noteDifference)}개 ${noteDifference > 0 ? '많습니다' : '적습니다'}`}.` : '메모나 배움 기록이 없어 결과 외의 과정과 판단 근거는 회고하기 어렵습니다.' },
    { label: '후속 관리', tone: oldestTodoDays >= 7 ? 'attention' : staleTodos.length ? 'neutral' : 'positive', text: followUpText },
    { label: '패턴 해석', tone: 'neutral', text: patternText },
    { label: '다음 제안', tone: concerns.length ? 'attention' : 'positive', text: nextAction },
    ...(unassignedRatio >= 30 ? [{ label: '분류 상태', tone: 'attention' as const, text: `프로젝트 미지정 기록이 전체의 ${unassignedRatio}%입니다. 프로젝트별 회고가 필요하다면 자주 보는 항목부터 분류하는 것이 좋습니다.` }] : []),
  ] : []
  return { current, before, staleTodos, keywords, projectStats: projects, activitySummary, resultSummary, evaluationPoints: points }
}
