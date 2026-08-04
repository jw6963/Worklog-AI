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
      .map((word) => word.toLowerCase()).filter((word) => word.length >= 2 && !stopWords.has(word))
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
  const topTopics = keywords.slice(0, 3).map(([word]) => word)
  const completedTitles = current.done.slice(0, 3).map(itemTitle)
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
  const evaluationSummary = !items.length
    ? '기록이 쌓이면 완료 흐름과 지연 업무를 평가합니다.'
    : `${current.rate >= 75 ? '완료 비중이 높아 마무리 흐름이 좋습니다.' : current.rate >= 40 ? '진행과 완료가 함께 쌓이고 있습니다.' : '완료보다 열린 업무 비중이 높아 우선순위 정리가 필요합니다.'} ${trend(current.rate, before.rate, '%p')}.${staleTodos.length ? ` 가장 오래 남은 할 일은 ${staleTodos[0].days}일째입니다.` : ' 장기간 남은 할 일은 없습니다.'}`

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
        <div className="rule-summary"><strong>규칙 기반 기간 분석</strong><dl>
          <div><dt>활동</dt><dd>{activitySummary}</dd></div>
          <div><dt>결과</dt><dd>{resultSummary}</dd></div>
          <div><dt>평가</dt><dd>{evaluationSummary}</dd></div>
        </dl><small>프로젝트, 단어 빈도, 완료 상태와 TODO 체류 기간을 기준으로 계산했습니다.</small></div>
      </section>
    </div>
  </main>
}
