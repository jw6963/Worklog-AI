import { useRef, useState, type FormEvent } from 'react'
import { fetchBackup, restoreBackup, type BackupData } from '../../api/backup'
import { localDate } from '../../utils/date'
import { useAuth } from '../../auth/useAuth'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'

export function SettingsPage() {
  const { confirm, dialog } = useConfirmDialog()
  const { user, changePassword, updateProfile, uploadAvatar, removeAvatar } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupData | null>(null)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [profileMessage, setProfileMessage] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  async function submitProfile(event: FormEvent) {
    event.preventDefault()
    setSavingProfile(true); setProfileMessage('')
    try {
      await updateProfile(displayName.trim())
      setProfileMessage('프로필을 저장했습니다.')
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : '프로필을 저장하지 못했습니다.') }
    finally { setSavingProfile(false) }
  }

  async function selectAvatar(file: File) {
    setSavingProfile(true); setProfileMessage('')
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('이미지는 2MB 이하여야 합니다.')
      await uploadAvatar(file)
      setProfileMessage('프로필 이미지를 변경했습니다.')
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : '프로필 이미지를 변경하지 못했습니다.') }
    finally { setSavingProfile(false) }
  }

  async function deleteAvatar() {
    setSavingProfile(true); setProfileMessage('')
    try { await removeAvatar(); setProfileMessage('기본 프로필로 변경했습니다.') }
    catch (error) { setProfileMessage(error instanceof Error ? error.message : '프로필 이미지를 삭제하지 못했습니다.') }
    finally { setSavingProfile(false) }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setPasswordMessage('새 비밀번호가 서로 일치하지 않습니다.')
    if (newPassword.length < 10) return setPasswordMessage('새 비밀번호는 10자 이상이어야 합니다.')
    setChangingPassword(true); setPasswordMessage('')
    try {
      await changePassword(newPassword, currentPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setPasswordMessage('비밀번호를 변경했습니다.')
      setPasswordExpanded(false)
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
      if (file.size > 10 * 1024 * 1024) throw new Error()
      const data = JSON.parse(await file.text()) as BackupData
      if (![1, 2, 3].includes(data.schemaVersion) || !Array.isArray(data.items)
        || data.items.some((item) => !item.workDate || !item.type || !item.content || item.content.length > 10000)
        || data.projects?.some((project) => !project.name || project.name.length > 80)) throw new Error()
      setPreview(data); setFileName(file.name); setMessage('')
    } catch { setPreview(null); setMessage('지원하지 않거나 손상된 백업 파일입니다.') }
  }

  async function restore() {
    if (!preview) return
    if (!await confirm({ title: '현재 데이터를 백업 내용으로 교체할까요?', description: `현재 기록과 프로젝트를 모두 지우고 ${preview.items.length}개 기록으로 교체합니다.\n\n복원 전에 현재 데이터를 먼저 백업하는 것을 권장합니다.`, confirmLabel: '전체 교체 후 복원', danger: true, requiredText: '복원' })) return
    setWorking(true)
    try {
      const restored = await restoreBackup(preview, true)
      setMessage(`${restored.length}개 기록을 복원했습니다.`); setPreview(null); setFileName('')
    } catch { setMessage('백업을 복원하지 못했습니다.') }
    finally { setWorking(false) }
  }

  return <main className="page settings-page">
    <div className="page-heading"><div><span className="page-kicker">SETTINGS</span><h1>설정</h1><p>기록을 백업하고 새 환경에서 복원할 수 있습니다.</p></div></div>
    <div className="settings-section-title"><span>ACCOUNT</span><div><h2>계정 설정</h2><p>내 정보와 로그인 보안을 관리합니다.</p></div></div>
    <section className="settings-group account-settings-group">
    <article className="settings-card profile-settings-card">
      <div className="profile-settings-intro">
        <div className="profile-avatar-preview">{user?.hasAvatar
          ? <img src={`/api/auth/avatar?v=${user.avatarVersion}`} alt="현재 프로필" />
          : <span>{user?.displayName.slice(0, 1) ?? 'W'}</span>}</div>
        <div><h2>내 프로필</h2><p>사이드바에 표시되는 이름과 프로필 이미지를 변경합니다. JPEG, PNG, WebP 형식을 2MB까지 사용할 수 있습니다.</p></div>
      </div>
      <form className="profile-settings-form" onSubmit={(event) => void submitProfile(event)}>
        <div className="profile-fields">
          <label><span>표시 이름</span><input required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <div className="profile-actions">
            <input ref={avatarInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void selectAvatar(file) }} />
            <button type="button" disabled={savingProfile} onClick={() => avatarInput.current?.click()}>이미지 변경</button>
            {user?.hasAvatar && <button type="button" disabled={savingProfile} onClick={() => void deleteAvatar()}>이미지 삭제</button>}
            <button className="settings-action" disabled={savingProfile || !displayName.trim()}>이름 저장</button>
          </div>
          {profileMessage && <p className="password-settings-message" role="status">{profileMessage}</p>}
        </div>
      </form>
    </article>
    <article className={`settings-card password-settings-card ${passwordExpanded ? 'expanded' : ''}`}>
      <div><h2>내 비밀번호 변경</h2><p>현재 비밀번호를 확인한 뒤 10자 이상의 새 비밀번호로 변경합니다.</p></div>
      {!passwordExpanded
        ? <button className="settings-row-action" type="button" onClick={() => { setPasswordExpanded(true); setPasswordMessage('') }}>변경하기</button>
        : <form className="password-settings-form" onSubmit={(event) => void submitPassword(event)}>
          <label className="current-password-field"><span>현재 비밀번호</span><input required type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label><span>새 비밀번호</span><input required minLength={10} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="10자 이상" /></label>
          <label><span>새 비밀번호 확인</span><input required minLength={10} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          {passwordMessage && <p className="password-settings-message" role="status">{passwordMessage}</p>}
          <div className="password-form-actions"><button type="button" onClick={() => { setPasswordExpanded(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage('') }}>취소</button><button className="primary" disabled={changingPassword}>{changingPassword ? '변경 중...' : '저장'}</button></div>
        </form>}
    </article>
    </section>
    <div className="settings-section-title"><span>DATA</span><div><h2>데이터 관리</h2><p>기록을 안전하게 내보내거나 복원합니다.</p></div></div>
    {message && <div className="settings-message">{message}</div>}
    <section className="settings-group data-settings-group">
    <article className="settings-card">
      <div><h2>JSON 전체 백업</h2><p>모든 날짜의 기록을 하나의 JSON 파일로 내려받습니다. 새 PC에서 원본 그대로 복원할 때 사용하세요.</p></div>
      <button className="settings-action" disabled={working} onClick={() => void downloadBackup()}>백업 다운로드</button>
    </article>
    <article className="settings-card danger-zone">
      <div><h2>JSON 백업 복원</h2><p>백업 파일을 확인한 뒤 현재 데이터 전체를 백업 내용으로 교체합니다. 복원 전에 현재 데이터를 먼저 내려받으세요.</p></div>
      <input ref={input} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void selectFile(file) }} />
      <button className="settings-action secondary" disabled={working} onClick={() => input.current?.click()}>백업 파일 선택</button>
      {preview && <div className="restore-preview"><div><strong>{fileName}</strong><span>스키마 v{preview.schemaVersion} · 기록 {preview.items.length}개 · 프로젝트 {preview.projects?.length ?? 0}개</span></div><button disabled={working} onClick={() => void restore()}>전체 교체 후 복원</button></div>}
    </article>
    </section>
    <section className="settings-info"><strong>현재 데이터 저장 위치</strong><code>C:\worklog-ai\backend\data\worklog.mv.db</code><p>JSON 파일은 Git 비공개 저장소나 허용된 클라우드에 보관할 수 있습니다.</p></section>
    {dialog}
  </main>
}
