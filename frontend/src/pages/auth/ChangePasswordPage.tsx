import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function ChangePasswordPage() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setError('새 비밀번호가 서로 일치하지 않습니다.')
    if (newPassword.length < 10) return setError('새 비밀번호는 10자 이상이어야 합니다.')
    setSubmitting(true); setError('')
    try {
      await changePassword(newPassword)
      navigate('/app', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '비밀번호를 변경하지 못했습니다.')
    } finally { setSubmitting(false) }
  }

  return <main className="login-page password-change-page">
    <section className="login-card">
      <div className="login-heading"><span>SECURE YOUR ACCOUNT</span><h1>새 비밀번호를 설정하세요.</h1><p>임시 비밀번호로 로그인했습니다. 계속하려면 본인만 아는 비밀번호로 변경해야 합니다.</p></div>
      <form onSubmit={(event) => void submit(event)}>
        <label><span>새 비밀번호</span><input autoFocus type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="10자 이상" /></label>
        <label><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button disabled={submitting || !newPassword || !confirmPassword} type="submit">{submitting ? '변경 중...' : '비밀번호 변경'}</button>
      </form>
      <button className="password-logout" type="button" onClick={() => void logout()}>다른 계정으로 로그인</button>
    </section>
  </main>
}
