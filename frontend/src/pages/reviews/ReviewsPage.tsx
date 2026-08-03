import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchItemsRange } from '../../api/workItems'
import { addDays, formatKoreanDate, localDate } from '../../utils/date'
import type { WorkItem } from '../../types'

type ReviewPeriod = 'WEEK' | 'MONTH'

function mondayOf(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  const day = parsed.getDay() || 7
  return addDays(date, 1 - day)
}

function monthRange(date: string) {
  const [year, month] = date.split('-').map(Number)
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0)
  return { from, to: localDate(last) }
}

const stopWords = new Set(['그리고', '에서', '으로', '하는', '했다', '합니다', '대한', '위해', '현재', '경우', '사용', '작업', '기록'])

export function ReviewsPage() {
  const [period, setPeriod] = useState<ReviewPeriod>('WEEK')
  const [anchor, setAnchor] = useState(localDate())
  const [items, setItems] = useState<WorkItem[]>([])
  const [error, setError] = useState('')
  const range = useMemo(() => period === 'WEEK'
    ? { from: mondayOf(anchor), to: addDays(mondayOf(anchor), 6) }
    : monthRange(anchor), [anchor, period])

  useEffect(() => {
    fetchItemsRange(range.from, range.to).then((result) => { setItems(result); setError('') })
      .catch(() => setError('회고 데이터를 불러오지 못했습니다.'))
  }, [range.from, range.to])

  const done = items.filter((item) => item.type === 'DONE')
  const todo = items.filter((item) => item.type === 'TODO')
  const notes = items.filter((item) => item.type === 'NOTE')
  const rate = done.length + todo.length ? Math.round(done.length / (done.length + todo.length) * 100) : 0
  const keywords = useMemo(() => {
    const counts = new Map<string, number>()
    items.flatMap((item) => item.content.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ').split(/\s+/))
      .map((word) => word.toLowerCase()).filter((word) => word.length >= 2 && !stopWords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [items])

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
      <div><span className="page-kicker">REVIEW</span><h1>회고</h1><p>쌓인 기록에서 이번 기간의 흐름을 확인하세요.</p></div>
      <div className="review-period"><button className={period === 'WEEK' ? 'active' : ''} onClick={() => setPeriod('WEEK')}>주간</button><button className={period === 'MONTH' ? 'active' : ''} onClick={() => setPeriod('MONTH')}>월간</button></div>
    </div>
    <div className="review-nav"><button onClick={() => move(-1)}>←</button><strong>{formatKoreanDate(range.from, { year: 'numeric', month: 'short', day: 'numeric' })} – {formatKoreanDate(range.to, { month: 'short', day: 'numeric' })}</strong><button onClick={() => move(1)}>→</button><button onClick={() => setAnchor(localDate())}>이번 {period === 'WEEK' ? '주' : '달'}</button></div>
    {error && <div className="error">{error}</div>}
    <section className="review-stats">
      <article><span>완료한 일</span><strong>{done.length}</strong></article>
      <article><span>남은 할 일</span><strong>{todo.length}</strong></article>
      <article><span>메모와 배움</span><strong>{notes.length}</strong></article>
      <article className="rate"><span>완료 비율</span><strong>{rate}%</strong><i><b style={{ width: `${rate}%` }} /></i></article>
    </section>
    <div className="review-grid">
      <section className="review-panel"><div className="panel-heading"><div><span>ACHIEVEMENTS</span><h2>완료한 일</h2></div></div>
        <ul className="achievement-list">{done.slice(0, 12).map((item) => <li key={item.id}><Link to={`/logs/${item.workDate}`}><span>{item.content.replace(/[#*_`>-]/g, '').split('\n')[0]}</span><small>{formatKoreanDate(item.workDate, { month: 'short', day: 'numeric' })}</small></Link></li>)}</ul>
        {!done.length && <p className="panel-empty">이 기간에 완료 기록이 없습니다.</p>}
      </section>
      <section className="review-panel"><div className="panel-heading"><div><span>KEYWORDS</span><h2>자주 기록한 주제</h2></div></div>
        <div className="keyword-cloud">{keywords.map(([word, count]) => <span key={word}>{word}<b>{count}</b></span>)}</div>
        {!keywords.length && <p className="panel-empty">분석할 기록이 없습니다.</p>}
        <div className="rule-summary"><strong>기간 요약</strong><p>{items.length ? `${new Set(items.map((item) => item.workDate)).size}일 동안 ${items.length}개의 기록을 남겼고, ${done.length}개의 일을 완료했습니다.${todo.length ? ` 아직 ${todo.length}개의 할 일이 남아 있습니다.` : ' 남은 할 일이 없습니다.'}` : '아직 기록이 없습니다.'}</p></div>
      </section>
    </div>
  </main>
}
