import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchItemsRange } from '../../api/workItems'
import { LoadState } from '../../components/ui/LoadState'
import { addDays, formatKoreanDate, localDate } from '../../utils/date'
import type { WorkItem } from '../../types'

type ReviewPeriod = 'WEEK' | 'MONTH'
type Range = { from: string; to: string }

function mondayOf(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  const day = parsed.getDay() || 7
  return addDays(date, 1 - day)
}

function monthRange(date: string): Range {
  const [year, month] = date.split('-').map(Number)
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  return { from, to: localDate(new Date(year, month, 0)) }
}

function previousRange(range: Range, period: ReviewPeriod): Range {
  if (period === 'WEEK') return { from: addDays(range.from, -7), to: addDays(range.from, -1) }
  return monthRange(addDays(range.from, -1))
}

function metrics(items: WorkItem[]) {
  const done = items.filter((item) => item.type === 'DONE')
  const todo = items.filter((item) => item.type === 'TODO' && !item.carriedToDate)
  const notes = items.filter((item) => item.type === 'NOTE')
  return { done, todo, notes, rate: done.length + todo.length ? Math.round(done.length / (done.length + todo.length) * 100) : 0 }
}

function trend(current: number, previous: number, suffix = '') {
  const difference = current - previous
  if (!difference) return `이전 기간과 같음`
  return `이전 기간보다 ${Math.abs(difference)}${suffix} ${difference > 0 ? '증가' : '감소'}`
}

function daysBetween(from: string, to: string) {
  return Math.max(0, Math.floor((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000))
}

function itemTitle(item: WorkItem) {
  return item.content.replace(/[#*_`>\-[\]]/g, '').split('\n').find((line) => line.trim())?.trim() ?? item.content
}

function summaryTitle(item: WorkItem) {
  const title = itemTitle(item)
  return title.length > 42 ? `${title.slice(0, 42)}…` : title
}

function meaningfulKeyword(word: string) {
  if (word.length < 2 || word.length > 24 || !/[가-힣a-zA-Z]/.test(word)) return false
  const normalized = word.toLowerCase()
  const letters = normalized.replace(/[^가-힣a-z]/g, '')
  return new Set(letters).size > 1 && !/(.)\1{4,}/.test(normalized)
}

const stopWords = new Set(['그리고', '에서', '으로', '하는', '했다', '합니다', '대한', '위해', '현재', '경우', '사용', '작업', '기록'])

export function ReviewsPage() {
  const [period, setPeriod] = useState<ReviewPeriod>('WEEK')
  const [anchor, setAnchor] = useState(localDate())
  const [allItems, setAllItems] = useState<WorkItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const range = useMemo(() => period === 'WEEK'
    ? { from: mondayOf(anchor), to: addDays(mondayOf(anchor), 6) }
    : monthRange(anchor), [anchor, period])
  const previous = useMemo(() => previousRange(range, period), [period, range])

  const load = useCallback(() => {
    setLoading(true)
    fetchItemsRange(previous.from, range.to)
      .then((result) => { setAllItems(result); setError('') })
      .catch(() => setError('회고 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [previous.from, range.to])
  useEffect(() => { load() }, [load])

  const items = allItems.filter((item) => item.workDate >= range.from && item.workDate <= range.to)
  const previousItems = allItems.filter((item) => item.workDate >= previous.from && item.workDate <= previous.to)
  const current = metrics(items)
  const before = metrics(previousItems)
  const referenceDate = range.to < localDate() ? range.to : localDate()
  const staleTodos = current.todo.map((item) => ({ item, days: daysBetween(item.workDate, referenceDate) }))
    .filter(({ days }) => days > 0).sort((a, b) => b.days - a.days).slice(0, 6)
  const keywords = useMemo(() => {
    const counts = new Map<string, number>()
    items.flatMap((item) => item.content.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ').split(/\s+/))
      .map((word) => word.toLowerCase()).filter((word) => meaningfulKeyword(word) && !stopWords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [items])
  const projectStats = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; count: number; id?: number }>()
    items.forEach((item) => {
      const key = String(item.project?.id ?? 'none')
      const value = counts.get(key) ?? { name: item.project?.name ?? '프로젝트 없음', color: item.project?.color ?? '#b8b8b4', count: 0, id: item.project?.id }
      value.count += 1
      counts.set(key, value)
    })
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  }, [items])
  const activeDays = new Set(items.map((item) => item.workDate)).size
  const previousActiveDays = new Set(previousItems.map((item) => item.workDate)).size
  const analysisTo = range.to < localDate() ? range.to : localDate()
  const availableDays = Math.max(1, daysBetween(range.from, analysisTo) + 1)
  const consistencyRate = Math.round(activeDays / availableDays * 100)
  const topTopics = keywords.slice(0, 3).map(([word]) => word)
  const completedTitles = current.done.slice(0, 3).map(summaryTitle)
  const dominantProject = projectStats.find((project) => project.id != null)
  const unassignedProject = projectStats.find((project) => project.id == null)
  const projectSummary = dominantProject
    ? ` '${dominantProject.name}' 프로젝트 기록이 ${dominantProject.count}개로 가장 많았습니다.${unassignedProject ? ` 프로젝트 미지정 기록은 ${unassignedProject.count}개입니다.` : ''}`
    : unassignedProject ? ` 프로젝트가 지정되지 않은 기록이 ${unassignedProject.count}개입니다.` : ''
  const activitySummary = items.length
    ? `${activeDays}일 동안 ${items.length}개를 기록했습니다.${projectSummary}${topTopics.length ? ` 자주 등장한 주제는 ${topTopics.map((topic) => `'${topic}'`).join(', ')}입니다.` : ''}`
    : '아직 분석할 기록이 없습니다.'
  const resultSummary = completedTitles.length
    ? `완료 기록에서는 ${completedTitles.map((title) => `'${title}'`).join(', ')}${current.done.length > completedTitles.length ? ` 외 ${current.done.length - completedTitles.length}개` : ''}를 마쳤습니다.`
    : '이 기간에는 완료로 기록된 결과가 없어 구체적인 성과를 요약하기 어렵습니다.'
  const dominantProjectRatio = dominantProject && items.length ? Math.round(dominantProject.count / items.length * 100) : 0
  const unassignedRatio = unassignedProject && items.length ? Math.round(unassignedProject.count / items.length * 100) : 0
  const itemDifference = items.length - previousItems.length
  const rateDifference = current.rate - before.rate
  const noteDifference = current.notes.length - before.notes.length
  const itemComparison = itemDifference === 0 ? '이전 기간과 같은 수입니다' : `이전 기간보다 ${Math.abs(itemDifference)}개 ${itemDifference > 0 ? '많습니다' : '적습니다'}`
  const rateComparison = rateDifference === 0 ? '이전 기간과 같습니다' : `이전 기간보다 ${Math.abs(rateDifference)}%p ${rateDifference > 0 ? '높습니다' : '낮습니다'}`
  const noteComparison = noteDifference === 0 ? '이전 기간과 같습니다' : `이전 기간보다 ${Math.abs(noteDifference)}개 ${noteDifference > 0 ? '많습니다' : '적습니다'}`
  const evaluationPoints = items.length ? [
    {
      label: '업무량', tone: 'neutral',
      text: `${items.length}개를 기록했으며 ${itemComparison}. 기록한 날은 이전 기간 ${previousActiveDays}일에서 ${activeDays}일로 ${activeDays === previousActiveDays ? '유지됐습니다' : activeDays > previousActiveDays ? '늘었습니다' : '줄었습니다'}.`,
    },
    {
      label: '완료 흐름', tone: current.rate >= 75 ? 'positive' : current.rate >= 40 ? 'neutral' : 'attention',
      text: `완료 비율은 ${current.rate}%로 ${rateComparison}. ${current.rate >= 75 ? '열린 업무보다 마무리한 업무의 비중이 높습니다.' : current.rate >= 40 ? '진행 중인 일과 완료한 일이 함께 쌓이고 있습니다.' : '열린 업무 비중이 높아 우선순위를 다시 확인할 필요가 있습니다.'}`,
    },
    {
      label: '기록 습관', tone: consistencyRate >= 70 ? 'positive' : consistencyRate >= 35 ? 'neutral' : 'attention',
      text: `확인 가능한 ${availableDays}일 중 ${activeDays}일에 기록해 기록 지속률은 ${consistencyRate}%입니다. ${consistencyRate >= 70 ? '기간 전반에 비교적 꾸준히 기록했습니다.' : consistencyRate >= 35 ? '일부 날짜에 집중해서 기록했습니다.' : '기록하지 않은 날이 많아 흐름을 파악하기 어렵습니다.'}`,
    },
    {
      label: '업무 집중', tone: dominantProjectRatio >= 70 ? 'attention' : 'neutral',
      text: dominantProject
        ? `'${dominantProject.name}' 프로젝트가 전체 기록의 ${dominantProjectRatio}%를 차지합니다. ${dominantProjectRatio >= 70 ? '한 프로젝트에 업무가 크게 집중되어 있습니다.' : '여러 업무 영역에 기록이 분산되어 있습니다.'}`
        : '프로젝트가 지정된 기록이 없어 프로젝트별 집중도를 판단할 수 없습니다.',
    },
    {
      label: '회고 습관', tone: current.notes.length ? 'positive' : 'attention',
      text: current.notes.length
        ? `메모와 배움을 ${current.notes.length}개 남겼으며 ${noteComparison}.`
        : '메모나 배움 기록이 없어 결과 외의 과정과 판단 근거는 회고하기 어렵습니다.',
    },
    {
      label: '후속 관리', tone: staleTodos.length ? 'attention' : 'positive',
      text: staleTodos.length
        ? `${staleTodos.length}개의 할 일이 하루 이상 남아 있고, 가장 오래된 항목은 ${staleTodos[0].days}일째입니다.`
        : '하루 이상 장기 미완료 상태인 할 일이 없습니다.',
    },
    ...(unassignedRatio >= 30 ? [{
      label: '분류 상태', tone: 'attention',
      text: `프로젝트 미지정 기록이 전체의 ${unassignedRatio}%입니다. 프로젝트별 회고가 필요하다면 자주 보는 항목부터 분류하는 것이 좋습니다.`,
    }] : []),
  ] : []

  function move(direction: number) {
    if (period === 'WEEK') setAnchor(addDays(anchor, direction * 7))
    else {
      const value = new Date(`${anchor}T12:00:00`)
      value.setMonth(value.getMonth() + direction)
      setAnchor(localDate(value))
    }
  }

  return <main className="page reviews-page">
    <div className="page-heading review-heading">
      <div><span className="page-kicker">REVIEW</span><h1>회고</h1><p>현재 기간의 기록을 이전 기간과 비교하고 오래 남은 일을 확인하세요.</p></div>
      <div className="review-period"><button className={period === 'WEEK' ? 'active' : ''} onClick={() => setPeriod('WEEK')}>주간</button><button className={period === 'MONTH' ? 'active' : ''} onClick={() => setPeriod('MONTH')}>월간</button></div>
    </div>
    <div className="review-nav"><button onClick={() => move(-1)}>←</button><strong>{formatKoreanDate(range.from, { year: 'numeric', month: 'short', day: 'numeric' })} – {formatKoreanDate(range.to, { month: 'short', day: 'numeric' })}</strong><button onClick={() => move(1)}>→</button><button onClick={() => setAnchor(localDate())}>이번 {period === 'WEEK' ? '주' : '달'}</button></div>
    <LoadState loading={loading} error={error} onRetry={load} />
    <section className="review-stats">
      <article><span>완료한 일</span><strong>{current.done.length}</strong><small>{trend(current.done.length, before.done.length, '개')}</small></article>
      <article><span>남은 할 일</span><strong>{current.todo.length}</strong><small>{trend(current.todo.length, before.todo.length, '개')}</small></article>
      <article><span>메모와 배움</span><strong>{current.notes.length}</strong><small>{trend(current.notes.length, before.notes.length, '개')}</small></article>
      <article className="rate"><span>완료 비율</span><strong>{current.rate}%</strong><i><b style={{ width: `${current.rate}%` }} /></i><small>{trend(current.rate, before.rate, '%p')}</small></article>
    </section>
    <div className="review-grid">
      <section className="review-panel"><div className="panel-heading"><div><span>ACHIEVEMENTS</span><h2>완료한 일</h2></div></div>
        <ul className="achievement-list">{current.done.slice(0, 12).map((item) => <li key={item.id}><Link to={`/logs/${item.workDate}#item-${item.id}`}><span>{itemTitle(item)}</span><small>{formatKoreanDate(item.workDate, { month: 'short', day: 'numeric' })}</small></Link></li>)}</ul>
        {!current.done.length && <p className="panel-empty">이 기간에 완료 기록이 없습니다.</p>}
      </section>
      <section className="review-panel"><div className="panel-heading"><div><span>PROJECTS</span><h2>프로젝트 분포</h2></div></div>
        <div className="project-distribution">{projectStats.map((project) => <div key={project.name}><span><i style={{ background: project.color }} />{project.name}</span><strong>{project.count}</strong><b><i style={{ width: `${items.length ? project.count / items.length * 100 : 0}%`, background: project.color }} /></b></div>)}</div>
        {!projectStats.length && <p className="panel-empty">분석할 프로젝트 기록이 없습니다.</p>}
      </section>
      <section className="review-panel"><div className="panel-heading"><div><span>OPEN ITEMS</span><h2>오래 남은 할 일</h2></div></div>
        <ul className="stale-review-list">{staleTodos.map(({ item, days }) => <li key={item.id}><Link to={`/logs/${item.workDate}#item-${item.id}`}><span>{itemTitle(item)}</span><strong>{days}일째</strong></Link></li>)}</ul>
        {!staleTodos.length && <p className="panel-empty">오래 남아 있는 할 일이 없습니다.</p>}
      </section>
      <section className="review-panel"><div className="panel-heading"><div><span>KEYWORDS</span><h2>자주 기록한 주제</h2></div></div>
        <div className="keyword-cloud">{keywords.map(([word, count]) => <span key={word}><em>{word}</em><b>{count}</b></span>)}</div>
        {!keywords.length && <p className="panel-empty">분석할 기록이 없습니다.</p>}
      </section>
      <section className="review-panel insight-panel"><div className="panel-heading"><div><span>PERIOD INSIGHT</span><h2>규칙 기반 기간 분석</h2></div></div>
        <div className="rule-summary"><dl>
          <div><dt>활동</dt><dd>{activitySummary}</dd></div>
          <div><dt>결과</dt><dd>{resultSummary}</dd></div>
          <div><dt>평가</dt><dd>{evaluationPoints.length ? <ul className="insight-evaluations">{evaluationPoints.map((point) => <li className={point.tone} key={point.label}><strong>{point.label}</strong><span>{point.text}</span></li>)}</ul> : '기록이 쌓이면 여러 기준으로 업무 흐름을 평가합니다.'}</dd></div>
        </dl><small>프로젝트, 단어 빈도, 완료 상태와 TODO 체류 기간을 기준으로 계산했습니다.</small></div>
      </section>
    </div>
  </main>
}
