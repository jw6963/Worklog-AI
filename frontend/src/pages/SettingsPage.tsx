import { useRef, useState, type FormEvent } from 'react'
import { fetchBackup, restoreBackup } from '../lib/api'
import type { BackupData } from '../lib/api'
import { localDate } from '../lib/date'
import { useAuth } from '../auth/AuthContext'

export function SettingsPage() {
  const { changePassword } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupData | null>(null)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setPasswordMessage('새 비밀번호가 서로 일치하지 않습니다.')
    if (newPassword.length < 10) return setPasswordMessage('새 비밀번호는 10자 이상이어야 합니다.')
    setChangingPassword(true); setPasswordMessage('')
    try {
      await changePassword(newPassword, currentPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setPasswordMessage('비밀번호를 변경했습니다.')
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.')
    } finally { setChangingPassword(false) }
  }

  async function downloadBackup() {
    setWorking(true)
    try {
      const data = await fetchBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `worklog-backup-${localDate()}.json`; anchor.click(); URL.revokeObjectURL(url)
      setMessage(`${data.items.length}개 기록을 백업했습니다.`)
    } catch { setMessage('백업 파일을 만들지 못했습니다.') }
    finally { setWorking(false) }
  }

  async function selectFile(file: File) {
    try {
      const data = JSON.parse(await file.text()) as BackupData
      if (![1, 2].includes(data.schemaVersion) || !Array.isArray(data.items) || data.items.some((item) => !item.workDate || !item.type || !item.content)) throw new Error()
      setPreview(data); setFileName(file.name); setMessage('')
    } catch { setPreview(null); setMessage('지원하지 않거나 손상된 백업 파일입니다.') }
  }

  async function restore() {
    if (!preview) return
    setWorking(true)
    try {
      const restored = await restoreBackup(preview, true)
      setMessage(`${restored.length}개 기록을 복원했습니다.`); setPreview(null); setFileName('')
    } catch { setMessage('백업을 복원하지 못했습니다.') }
    finally { setWorking(false) }
  }

  return <main className="page settings-page">
    <div className="page-heading"><div><span className="page-kicker">SETTINGS</span><h1>설정</h1><p>기록을 백업하고 새 환경에서 복원할 수 있습니다.</p></div></div>
    <section className="settings-card password-settings-card">
      <div><h2>내 비밀번호 변경</h2><p>현재 비밀번호를 확인한 뒤 10자 이상의 새 비밀번호로 변경합니다.</p></div>
      <form className="password-settings-form" onSubmit={(event) => void submitPassword(event)}>
        <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="현재 비밀번호" />
        <input required minLength={10} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="새 비밀번호 (10자 이상)" />
        <input required minLength={10} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="새 비밀번호 확인" />
        {passwordMessage && <p className="password-settings-message" role="status">{passwordMessage}</p>}
        <button className="settings-action" disabled={changingPassword}>{changingPassword ? '변경 중...' : '비밀번호 변경'}</button>
      </form>
    </section>
    {message && <div className="settings-message">{message}</div>}
    <section className="settings-card">
      <div><h2>JSON 전체 백업</h2><p>모든 날짜의 기록을 하나의 JSON 파일로 내려받습니다. 새 PC에서 원본 그대로 복원할 때 사용하세요.</p></div>
      <button className="settings-action" disabled={working} onClick={() => void downloadBackup()}>백업 다운로드</button>
    </section>
    <section className="settings-card danger-zone">
      <div><h2>JSON 백업 복원</h2><p>백업 파일을 확인한 뒤 현재 데이터 전체를 백업 내용으로 교체합니다. 복원 전에 현재 데이터를 먼저 내려받으세요.</p></div>
      <input ref={input} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void selectFile(file) }} />
      <button className="settings-action secondary" disabled={working} onClick={() => input.current?.click()}>백업 파일 선택</button>
      {preview && <div className="restore-preview"><div><strong>{fileName}</strong><span>스키마 v{preview.schemaVersion} · 기록 {preview.items.length}개 · 프로젝트 {preview.projects?.length ?? 0}개</span></div><button disabled={working} onClick={() => void restore()}>전체 교체 후 복원</button></div>}
    </section>
    <section className="settings-info"><strong>현재 데이터 저장 위치</strong><code>C:\worklog-ai\backend\data\worklog.mv.db</code><p>JSON 파일은 Git 비공개 저장소나 허용된 클라우드에 보관할 수 있습니다.</p></section>
  </main>
}
