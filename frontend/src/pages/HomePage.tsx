import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatCard } from '../components/StatCard'
import { fetchItemsRange, updateItemType } from '../lib/api'
import { addDays, formatKoreanDate, localDate } from '../lib/date'
import type { WorkItem } from '../types'

export function HomePage() {
  const today = localDate()
  const [items, setItems] = useState<WorkItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchItemsRange(addDays(today, -13), today)
      .then((result) => { setItems(result); setError('') })
      .catch(() => setError('홈 데이터를 불러오지 못했습니다. 백엔드를 다시 실행해 주세요.'))
  }, [today])

  const todayItems = items.filter((item) => item.workDate === today)
  const weekItems = items.filter((item) => item.workDate >= addDays(today, -6))
  const recentDates = useMemo(() => [...new Set(items.map((item) => item.workDate))].slice(0, 5), [items])
  const staleTodos = items.filter((item) => item.type === 'TODO' && item.workDate < today).slice(0, 5)
  const weekDone = weekItems.filter((item) => item.type === 'DONE').length
  const weekTodo = weekItems.filter((item) => item.type === 'TODO').length
  const completionRate = weekDone + weekTodo ? Math.round((weekDone / (weekDone + weekTodo)) * 100) : 0

  async function completeItem(item: WorkItem) {
    try {
      await updateItemType(item.id, 'DONE')
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, type: 'DONE' } : candidate))
    } catch { setError('할 일을 완료 처리하지 못했습니다.') }
  }

  return <main className="page home-page">
    <div className="page-kicker">{formatKoreanDate(today, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
    <div className="home-hero">
      <div><h1>오늘도 기록해볼까요?</h1><p>작은 기록이 쌓여 이번 주의 성과가 됩니다.</p></div>
      <Link className="primary-link" to={`/logs/${today}`}>오늘 일지 작성 <span>→</span></Link>
    </div>

    {error && <div className="error">{error}</div>}

    <section className="stat-grid" aria-label="오늘 현황">
      <StatCard label="오늘 할 일" value={todayItems.filter((item) => item.type === 'TODO').length} caption="남은 업무" />
      <StatCard label="오늘 완료" value={todayItems.filter((item) => item.type === 'DONE').length} caption="완료한 업무" tone="green" />
      <StatCard label="오늘 메모" value={todayItems.filter((item) => item.type === 'NOTE').length} caption="메모와 배운 점" tone="amber" />
    </section>

    <div className="home-columns">
      <section className="home-panel week-panel">
        <div className="panel-heading"><div><span>THIS WEEK</span><h2>이번 주 요약</h2></div></div>
        <div className="week-summary">
          <div><strong>{weekDone}</strong><span>완료</span></div>
          <div><strong>{weekTodo}</strong><span>남은 할 일</span></div>
          <div><strong>{new Set(weekItems.map((item) => item.workDate)).size}</strong><span>기록한 날</span></div>
        </div>
        <div className="progress-label"><span>업무 완료 비율</span><strong>{completionRate}%</strong></div>
        <div className="progress"><i style={{ width: `${completionRate}%` }} /></div>
      </section>

      <section className="home-panel stale-panel">
        <div className="panel-heading"><div><span>DON'T FORGET</span><h2>지난 할 일</h2></div><Link to="/logs?type=TODO">할 일 모아보기</Link></div>
        {staleTodos.length ? <ul>{staleTodos.map((item) => <li key={item.id}>
          <button className="quick-complete" aria-label="완료 처리" onClick={() => void completeItem(item)}>✓</button>
          <Link to={`/logs/${item.workDate}#item-${item.id}`}><span>{item.content.replace(/[#*_`>-]/g, '').split('\n')[0]}</span><small>{formatKoreanDate(item.workDate, { month: 'short', day: 'numeric' })}</small></Link>
        </li>)}</ul> : <p className="panel-empty">밀린 할 일이 없습니다.</p>}
      </section>
    </div>

    <section className="home-panel recent-panel">
      <div className="panel-heading"><div><span>RECENT</span><h2>최근 일지</h2></div><Link to="/logs">모아보기</Link></div>
      <div className="recent-list">
        {recentDates.map((recordDate) => {
          const records = items.filter((item) => item.workDate === recordDate)
          return <Link to={`/logs/${recordDate}`} key={recordDate}>
            <div className="date-tile"><strong>{new Date(`${recordDate}T12:00:00`).getDate()}</strong><span>{formatKoreanDate(recordDate, { weekday: 'short' })}</span></div>
            <div><strong>{formatKoreanDate(recordDate, { month: 'long', day: 'numeric' })}의 기록</strong><p>{records[0]?.content.replace(/[#*_`>-]/g, '').split('\n')[0]}</p></div>
            <div className="record-counts"><span>{records.filter((item) => item.type === 'TODO').length} 할 일</span><span>{records.filter((item) => item.type === 'DONE').length} 완료</span><b>→</b></div>
          </Link>
        })}
        {!recentDates.length && <p className="panel-empty">아직 기록이 없습니다. 오늘 첫 일지를 작성해 보세요.</p>}
      </div>
    </section>
  </main>
}
