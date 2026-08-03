import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function LandingPage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />

  return <main className="public-page landing-page">
    <nav className="public-nav">
      <Link className="public-brand" to="/">W<span>AI</span></Link>
      <Link className="public-login-link" to="/login">로그인</Link>
    </nav>
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="landing-kicker">WORKLOG, YOUR WAY</span>
        <h1>오늘의 기록이<br />내일의 성과가 됩니다.</h1>
        <p>할 일부터 배운 점까지 한곳에 기록하고, 프로젝트와 기간별로 다시 발견하세요.</p>
        <Link className="landing-cta" to="/login">내 Worklog 열기 <b>→</b></Link>
      </div>
      <div className="landing-preview" aria-hidden="true">
        <div className="preview-top"><i /><i /><i /><span>Daily Worklog</span></div>
        <div className="preview-body">
          <small>2026년 8월 3일</small><h2>오늘의 업무</h2>
          <article><b>To Do</b><p>로그인 화면과 사용자별 기록 구조 설계</p></article>
          <article className="done"><b>Done</b><p>프로젝트별 모아보기 개선</p></article>
          <article className="note"><b>Learning</b><p>작은 기록이 맥락을 만든다.</p></article>
        </div>
      </div>
    </section>
    <section className="landing-features">
      <article><span>01</span><h2>빠르게 기록</h2><p>자연스러운 Markdown 편집</p></article>
      <article><span>02</span><h2>다시 발견</h2><p>기간과 프로젝트별 검색 및 회고</p></article>
      <article><span>03</span><h2>안전하게 보관</h2><p>로컬 데이터와 JSON 전체 백업</p></article>
    </section>
  </main>
}
