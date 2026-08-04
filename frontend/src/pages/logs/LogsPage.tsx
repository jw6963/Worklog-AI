import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { searchItems } from '../../api/workItems'
import { fetchProjects } from '../../api/projects'
import { addDays, formatKoreanDate, localDate } from '../../utils/date'
import type { ItemType, Project, WorkItem } from '../../types'
import { SelectMenu } from '../../components/ui/SelectMenu'
import { LoadState } from '../../components/ui/LoadState'

type Period = '7D' | '14D' | '30D' | 'CUSTOM'

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = localDate()
  const [items, setItems] = useState<WorkItem[]>([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [type, setType] = useState<ItemType | 'ALL'>(() => {
    const requested = searchParams.get('type')
    return requested === 'TODO' || requested === 'DONE' || requested === 'NOTE' ? requested : 'ALL'
  })
  const [projectId, setProjectId] = useState<number | 'ALL'>(() => {
    const requested = searchParams.get('project')
    return requested && /^\d+$/.test(requested) ? Number(requested) : 'ALL'
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [period, setPeriod] = useState<Period>('30D')
  const [customFrom, setCustomFrom] = useState(addDays(today, -29))
  const [customTo, setCustomTo] = useState(today)
  const [appliedCustomRange, setAppliedCustomRange] = useState({ from: addDays(today, -29), to: today })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeDate, setNextBeforeDate] = useState<string | null>(null)
  const [totals, setTotals] = useState({ items: 0, days: 0 })
  const requestId = useRef(0)

  const range = useMemo(() => {
    if (period === 'CUSTOM') return appliedCustomRange
    const days = period === '7D' ? 7 : period === '14D' ? 14 : 30
    return { from: addDays(today, -(days - 1)), to: today }
  }, [appliedCustomRange, period, today])

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [query])

  const loadPage = useCallback(async (beforeDate: string | null = null) => {
    const append = beforeDate !== null
    if (range.from > range.to) {
      setItems([])
      setError('시작일은 종료일보다 늦을 수 없습니다.')
      return
    }
    const currentRequest = ++requestId.current
    setLoading(true)
    try {
      const result = await searchItems({
        from: range.from,
        to: range.to,
        beforeDate,
        type: type === 'ALL' ? undefined : type,
        projectId: projectId === 'ALL' ? undefined : projectId,
        query: appliedQuery,
      })
      if (requestId.current !== currentRequest) return
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setHasMore(result.hasMore)
      setNextBeforeDate(result.nextBeforeDate)
      setTotals({ items: result.totalItems, days: result.totalDays })
      setError('')
    } catch {
      if (requestId.current === currentRequest) setError('기록을 불러오지 못했습니다.')
    } finally {
      if (requestId.current === currentRequest) setLoading(false)
    }
  }, [appliedQuery, projectId, range.from, range.to, type])

  useEffect(() => { void loadPage() }, [loadPage])
  useEffect(() => { fetchProjects().then(setProjects).catch(() => setProjects([])) }, [])

  const dates = [...new Set(items.map((item) => item.workDate))]

  return <main className="page logs-page">
    <div className="page-heading">
      <div><span className="page-kicker">ALL WORKLOGS</span><h1>모아보기</h1><p>원하는 기간의 기록을 검색하고 다시 살펴보세요.</p></div>
      <Link className="primary-link" to={`/logs/${today}`}>오늘 일지 작성</Link>
    </div>
    <section className="period-filter" aria-label="조회 기간">
      <div className="period-presets">
        {([['7D', '1주일'], ['14D', '2주일'], ['30D', '1개월'], ['CUSTOM', '기간 선택']] as const).map(([value, label]) =>
          <button className={period === value ? 'active' : ''} onClick={() => setPeriod(value)} key={value}>{label}</button>)}
      </div>
      {period === 'CUSTOM' && <form className="custom-period" onSubmit={(event) => {
        event.preventDefault()
        if (customFrom <= customTo) setAppliedCustomRange({ from: customFrom, to: customTo })
      }}>
        <label><span>시작일</span><input type="date" value={customFrom} max={customTo} onChange={(event) => event.target.value && setCustomFrom(event.target.value)} /></label>
        <i>→</i>
        <label><span>종료일</span><input type="date" value={customTo} min={customFrom} onChange={(event) => event.target.value && setCustomTo(event.target.value)} /></label>
        <button type="submit" disabled={customFrom > customTo}>조회</button>
      </form>}
      <p>{formatKoreanDate(range.from, { year: 'numeric', month: 'short', day: 'numeric' })} – {formatKoreanDate(range.to, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
    </section>
    <div className="log-filters">
      <input type="search" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이 기간의 기록에서 검색…" />
      <SelectMenu className="project-filter-menu" ariaLabel="프로젝트 필터" value={String(projectId)}
        options={[{ value: 'ALL', label: '모든 프로젝트' }, ...projects.map((project) => ({ value: String(project.id), label: `${project.name}${project.archived ? ' (닫힘)' : ''}`, color: project.color, muted: project.archived }))]}
        onChange={(value) => {
          const nextProject = value === 'ALL' ? 'ALL' : Number(value)
          setProjectId(nextProject)
          const next = new URLSearchParams(searchParams)
          if (nextProject === 'ALL') next.delete('project'); else next.set('project', String(nextProject))
          setSearchParams(next, { replace: true })
        }} />
      <div>{(['ALL', 'TODO', 'DONE', 'NOTE'] as const).map((filter) => <button className={type === filter ? 'active' : ''} onClick={() => {
        setType(filter)
        const next = new URLSearchParams(searchParams)
        if (filter === 'ALL') next.delete('type'); else next.set('type', filter)
        setSearchParams(next, { replace: true })
      }} key={filter}>{filter === 'ALL' ? '전체' : filter}</button>)}</div>
    </div>
    <div className="result-summary"><span><strong>{totals.days}</strong>일의 기록 · <strong>{totals.items}</strong>개 항목</span>{loading && <span>불러오는 중…</span>}</div>
    <LoadState error={error} onRetry={() => void loadPage()} />
    <div className="timeline">
      {dates.map((recordDate) => <section className="timeline-day" key={recordDate}>
        <Link className="timeline-date" to={`/logs/${recordDate}`}><strong>{formatKoreanDate(recordDate, { month: 'long', day: 'numeric' })}</strong><span>{formatKoreanDate(recordDate, { weekday: 'long' })}</span></Link>
        <div className="timeline-items">{items.filter((item) => item.workDate === recordDate).map((item) => <Link className="timeline-item-card" to={`/logs/${recordDate}#item-${item.id}`} aria-label={`${recordDate} 일지에서 기록 보기`} key={item.id}>
          <span className={`type-badge ${item.type.toLowerCase()}`}>{item.type}</span>
          <div className="timeline-markdown">{item.project && <span className="project-chip" style={{ '--project-color': item.project.color } as CSSProperties}>{item.project.name}</span>}<ReactMarkdown>{item.content}</ReactMarkdown></div>
          <span className="timeline-item-arrow" aria-hidden="true">→</span>
        </Link>)}</div>
      </section>)}
      {!dates.length && !loading && <div className="empty-state"><strong>조건에 맞는 기록이 없습니다.</strong><span>검색어나 필터를 변경해 보세요.</span></div>}
    </div>
    {hasMore && <div className="load-more"><button disabled={loading} onClick={() => void loadPage(nextBeforeDate)}>{loading ? '불러오는 중…' : '이전 기록 더 보기'}</button><span>10일씩 불러옵니다.</span></div>}
  </main>
}
