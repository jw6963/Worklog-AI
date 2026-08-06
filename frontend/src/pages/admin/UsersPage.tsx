import { useEffect, useState, type FormEvent } from 'react'
import { createUser, fetchUsers, resetUserPassword, setUserEnabled, type ManagedUser } from '../../api/users'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'

export function UsersPage() {
  const { confirm, dialog } = useConfirmDialog()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => { void fetchUsers().then(setUsers).catch((error: Error) => setMessage(error.message)) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setWorking(true); setMessage('')
    try {
      const result = await createUser(username, displayName)
      setUsers((current) => [...current, result.user]); setTemporaryPassword(result.temporaryPassword); setCopyState('idle')
      setUsername(''); setDisplayName('')
    } catch (error) { setMessage(error instanceof Error ? error.message : '계정을 생성하지 못했습니다.') }
    finally { setWorking(false) }
  }

  async function toggle(user: ManagedUser) {
    try {
      const updated = await setUserEnabled(user.id, !user.enabled)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) { setMessage(error instanceof Error ? error.message : '변경하지 못했습니다.') }
  }

  async function reset(user: ManagedUser) {
    if (!await confirm({ title: '비밀번호를 초기화할까요?', description: `${user.displayName} 사용자는 다음 로그인 후 새 비밀번호를 설정해야 합니다.`, confirmLabel: '초기화', danger: true })) return
    try {
      const result = await resetUserPassword(user.id)
      setUsers((current) => current.map((item) => item.id === result.user.id ? result.user : item))
      setTemporaryPassword(result.temporaryPassword)
      setCopyState('idle')
    } catch (error) { setMessage(error instanceof Error ? error.message : '초기화하지 못했습니다.') }
  }

  return <main className="page users-page">
    <div className="page-heading"><div><span className="page-kicker">ADMIN</span><h1>사용자 관리</h1><p>계정을 만들고 접근 권한과 임시 비밀번호를 관리합니다.</p></div></div>
    {message && <div className="settings-message">{message}</div>}
    <form className="user-create" onSubmit={(event) => void submit(event)}>
      <div><h2>새 사용자</h2><p>생성된 임시 비밀번호는 한 번만 표시됩니다.</p></div>
      <input required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._-]+" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="아이디" />
      <input required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="표시 이름" />
      <button disabled={working}>계정 생성</button>
    </form>
    <section className="user-list">
      {users.map((user) => <article key={user.id} className={!user.enabled ? 'disabled' : ''}>
        <div className="avatar">{user.displayName.slice(0, 1)}</div>
        <div className="user-info"><strong>{user.displayName}</strong><span>{user.username}</span></div>
        <div className="user-badges"><span>{user.role}</span>{user.mustChangePassword && <span className="warning">비밀번호 변경 대기</span>}{!user.enabled && <span className="danger">비활성</span>}</div>
        <div className="user-actions">{user.role !== 'ADMIN' && <button type="button" onClick={() => void toggle(user)}>{user.enabled ? '비활성화' : '활성화'}</button>}<button type="button" onClick={() => void reset(user)}>비밀번호 초기화</button></div>
      </article>)}
    </section>
    {temporaryPassword && <div className="temporary-password-modal" role="dialog" aria-modal="true"><div><span>임시 비밀번호</span><h2>사용자에게 안전하게 전달하세요.</h2><code>{temporaryPassword}</code><p>이 창을 닫으면 다시 확인할 수 없습니다. 사용자는 최초 로그인 직후 새 비밀번호를 설정해야 합니다.</p>{copyState !== 'idle' && <p className={`copy-feedback ${copyState}`} role="status">{copyState === 'copied' ? '클립보드에 복사했습니다.' : '복사하지 못했습니다. 비밀번호를 직접 선택해 주세요.'}</p>}<div><button onClick={() => void navigator.clipboard.writeText(temporaryPassword).then(() => setCopyState('copied')).catch(() => setCopyState('failed'))}>{copyState === 'copied' ? '복사됨' : '복사'}</button><button className="primary" onClick={() => { setTemporaryPassword(''); setCopyState('idle') }}>확인</button></div></div></div>}
    {dialog}
  </main>
}
