import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!loading && user) return <Navigate to="/app" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from || '/app', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="login-page">
    <Link className="public-brand" to="/">W<span>AI</span></Link>
    <section className="login-card">
      <div className="login-heading"><span>WELCOME BACK</span><h1>다시 기록해볼까요?</h1><p>관리자가 등록한 계정으로 로그인하세요.</p></div>
      <form onSubmit={(event) => void submit(event)}>
        <label><span>아이디</span><input autoFocus autoComplete="username" maxLength={40} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="아이디 입력" /></label>
        <label><span>비밀번호</span><input type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호 입력" /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button disabled={submitting || !username.trim() || !password} type="submit">{submitting ? '로그인 중...' : '로그인'}</button>
      </form>
      <p className="login-help">회원가입은 제공하지 않습니다. 계정이 필요하면 관리자에게 문의하세요.</p>
    </section>
  </main>
}
