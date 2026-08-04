import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchItemsRange } from '../../api/workItems'
import { LoadState } from '../../components/ui/LoadState'
import { formatKoreanDate, localDate } from '../../utils/date'
import type { WorkItem } from '../../types'
import { buildReviewAnalysis } from './reviewEvaluation'
import { itemTitle, trend } from './reviewMetrics'
import { currentRange, moveAnchor, previousRange, type ReviewPeriod } from './reviewPeriod'

export function ReviewsPage() {
  const [period, setPeriod] = useState<ReviewPeriod>('WEEK')
  const [anchor, setAnchor] = useState(localDate())
  const [allItems, setAllItems] = useState<WorkItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const range = useMemo(() => currentRange(anchor, period), [anchor, period])
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
  const analysis = useMemo(() => buildReviewAnalysis(items, previousItems, range), [items, previousItems, range])
  const { current, before, staleTodos, keywords, projectStats, activitySummary, resultSummary, evaluationPoints } = analysis

  return <main className="page reviews-page">
    <div className="page-heading review-heading">
      <div><span className="page-kicker">REVIEW</span><h1>회고</h1><p>현재 기간의 기록을 이전 기간과 비교하고 오래 남은 일을 확인하세요.</p></div>
      <div className="review-period"><button className={period === 'WEEK' ? 'active' : ''} onClick={() => setPeriod('WEEK')}>주간</button><button className={period === 'MONTH' ? 'active' : ''} onClick={() => setPeriod('MONTH')}>월간</button></div>
    </div>
    <div className="review-nav"><button onClick={() => setAnchor(moveAnchor(anchor, period, -1))}>←</button><strong>{formatKoreanDate(range.from, { year: 'numeric', month: 'short', day: 'numeric' })} – {formatKoreanDate(range.to, { month: 'short', day: 'numeric' })}</strong><button onClick={() => setAnchor(moveAnchor(anchor, period, 1))}>→</button><button onClick={() => setAnchor(localDate())}>이번 {period === 'WEEK' ? '주' : '달'}</button></div>
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
        <div className="project-distribution">{projectStats.map((project) => <div key={`${project.id ?? 'none'}-${project.name}`}><span><i style={{ background: project.color }} />{project.name}</span><strong>{project.count}</strong><b><i style={{ width: `${items.length ? project.count / items.length * 100 : 0}%`, background: project.color }} /></b></div>)}</div>
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
          <div><dt>평가</dt><dd>{evaluationPoints.length ? <ul className="insight-evaluations">{evaluationPoints.map((point) => <li className={`${point.tone} ${point.label === '종합 평가' ? 'overall' : ''}`} key={point.label}><strong>{point.label}</strong><span>{point.text}</span></li>)}</ul> : '기록이 쌓이면 여러 기준으로 업무 흐름을 평가합니다.'}</dd></div>
        </dl><small>프로젝트, 단어 빈도, 완료 상태와 TODO 체류 기간을 기준으로 계산했습니다.</small></div>
      </section>
    </div>
  </main>
}
