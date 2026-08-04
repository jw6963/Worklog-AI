import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { LoadState } from '../../components/ui/LoadState'
import { SelectMenu } from '../../components/ui/SelectMenu'
import { archiveProject, createProject, deleteProject, fetchProjects, transferProjectItems, updateProject } from '../../api/projects'
import { formatKoreanDate } from '../../utils/date'
import type { Project } from '../../types'

const colors = ['#4b8063', '#4f6f9f', '#8a633f', '#84649a', '#a6534b', '#6d746f']

function itemTitle(content: string) {
  const title = content.replace(/[#*_`>\-[\]]/g, '').split('\n').find((line) => line.trim())?.trim() ?? content
  return title.length > 70 ? `${title.slice(0, 70)}…` : title
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [menuId, setMenuId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(colors[0])
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try { setProjects(await fetchProjects()); setError('') }
    catch { setError('프로젝트를 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (menuId == null) return
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(`[data-project-menu="${menuId}"]`)) setMenuId(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuId])

  async function add() {
    if (!name.trim()) return
    try { await createProject(name.trim(), color); setName(''); setCreating(false); setMessage('프로젝트를 추가했습니다.'); await load() }
    catch { setError('같은 이름의 프로젝트가 있거나 생성하지 못했습니다.') }
  }

  async function toggle(project: Project) {
    try { await archiveProject(project.id, !project.archived); setMenuId(null); setMessage(project.archived ? '프로젝트를 복원했습니다.' : '프로젝트를 보관했습니다.'); await load() }
    catch { setError('프로젝트 상태를 변경하지 못했습니다.') }
  }

  function beginEdit(project: Project) {
    setEditingId(project.id); setEditName(project.name); setEditColor(project.color); setMenuId(null)
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    try { await updateProject(editingId, editName.trim(), editColor); setEditingId(null); setMessage('프로젝트 정보를 수정했습니다.'); await load() }
    catch { setError('같은 이름의 프로젝트가 있거나 수정하지 못했습니다.') }
  }

  function beginTransfer(project: Project) {
    const firstTarget = projects.find((candidate) => !candidate.archived && candidate.id !== project.id)
    setTransferringId(project.id); setTransferTargetId(firstTarget?.id ?? null); setMenuId(null)
  }

  async function transfer(project: Project) {
    if (!transferTargetId) return
    const target = projects.find((candidate) => candidate.id === transferTargetId)
    if (!target || !window.confirm(`'${project.name}'의 연결 항목 ${project.itemCount ?? 0}개를 '${target.name}' 프로젝트로 이관할까요?`)) return
    try {
      const result = await transferProjectItems(project.id, target.id)
      setTransferringId(null); setTransferTargetId(null); setMessage(`${result.movedCount}개 항목을 '${target.name}'으로 이관했습니다.`); await load()
    } catch { setError('프로젝트 항목을 이관하지 못했습니다.') }
  }

  async function remove(project: Project) {
    const assignedCount = project.itemCount ?? 0
    const prompt = assignedCount
      ? `이 프로젝트가 ${assignedCount}개 항목에 지정되어 있습니다.\n\n항목은 삭제하지 않고 프로젝트 지정만 해제한 뒤 프로젝트를 삭제할까요?`
      : `'${project.name}' 프로젝트를 삭제할까요?`
    if (!window.confirm(prompt)) return
    try { await deleteProject(project.id, assignedCount > 0); setMenuId(null); setMessage('프로젝트를 삭제했습니다.'); await load() }
    catch { setError('프로젝트를 삭제하지 못했습니다.') }
  }

  const activeProjects = projects.filter((project) => !project.archived)
  const archivedProjects = projects.filter((project) => project.archived)

  function projectCard(project: Project) {
    const transferTargets = activeProjects.filter((candidate) => candidate.id !== project.id)
    return <article className={`project-card ${project.archived ? 'archived' : ''}`} style={{ '--project-color': project.color } as CSSProperties} key={project.id}>
      <div className="project-card-head">
        <div className="project-identity"><i /><div><strong>{project.name}</strong><span>{project.archived ? '보관됨' : project.latestWorkDate ? `최근 기록 ${formatKoreanDate(project.latestWorkDate, { month: 'short', day: 'numeric' })}` : '아직 연결된 기록 없음'}</span></div></div>
        <div className="project-card-menu" data-project-menu={project.id}>
          <button type="button" className="project-menu-trigger" aria-label={`${project.name} 관리 메뉴`} aria-expanded={menuId === project.id} onClick={() => setMenuId((current) => current === project.id ? null : project.id)}>···</button>
          {menuId === project.id && <div className="project-menu-popover">
            <button onClick={() => beginEdit(project)}>이름·색상 수정</button>
            <button disabled={!project.itemCount || !transferTargets.length} onClick={() => beginTransfer(project)}>항목 이관</button>
            <button onClick={() => void toggle(project)}>{project.archived ? '프로젝트 복원' : '프로젝트 보관'}</button>
            <button className="danger" onClick={() => void remove(project)}>프로젝트 삭제</button>
          </div>}
        </div>
      </div>

      {editingId === project.id ? <div className="project-inline-editor">
        <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} autoFocus />
        <div className="color-picker">{colors.map((value) => <button type="button" aria-label={`색상 ${value}`} className={editColor === value ? 'active' : ''} style={{ background: value }} onClick={() => setEditColor(value)} key={value} />)}</div>
        <div><button onClick={() => setEditingId(null)}>취소</button><button className="primary" onClick={() => void saveEdit()}>저장</button></div>
      </div> : transferringId === project.id ? <div className="project-transfer">
        <div><strong>모든 연결 항목 이관</strong><span>이월 이력을 포함한 {project.itemCount ?? 0}개 항목의 프로젝트를 변경합니다.</span></div>
        {transferTargets.length ? <SelectMenu ariaLabel="이관할 프로젝트" value={String(transferTargetId ?? '')} options={transferTargets.map((target) => ({ value: String(target.id), label: target.name, color: target.color }))} onChange={(value) => setTransferTargetId(Number(value))} /> : <span>이관할 활성 프로젝트가 없습니다.</span>}
        <div><button onClick={() => setTransferringId(null)}>취소</button><button className="primary" disabled={!transferTargetId} onClick={() => void transfer(project)}>이관</button></div>
      </div> : <>
        <div className="project-card-stats">
          <div><strong>{project.todoCount ?? 0}</strong><span>남은 일</span></div>
          <div><strong>{project.doneCount ?? 0}</strong><span>완료</span></div>
          <div><strong>{project.noteCount ?? 0}</strong><span>메모</span></div>
        </div>
        <div className="project-recent">
          <span>최근 활동</span>
          {project.recentItems?.length ? project.recentItems.map((item) => <Link to={`/logs/${item.workDate}#item-${item.id}`} key={item.id}><b className={item.type.toLowerCase()}>{item.type}</b><span>{itemTitle(item.content)}</span><small>{formatKoreanDate(item.workDate, { month: 'short', day: 'numeric' })}</small></Link>) : <p>아직 표시할 활동이 없습니다.</p>}
        </div>
        <Link className="project-card-footer" to={`/logs?project=${project.id}`}><span>전체 연결 항목 {project.itemCount ?? 0}개</span><strong>기록 모아보기 →</strong></Link>
      </>}
    </article>
  }

  return <main className="page projects-page">
    <div className="page-heading"><div><span className="page-kicker">PROJECTS</span><h1>프로젝트</h1><p>프로젝트별 업무 현황과 최근 활동을 한눈에 확인하세요.</p></div><button className="primary-link" onClick={() => setCreating((value) => !value)}>{creating ? '닫기' : '+ 새 프로젝트'}</button></div>
    <LoadState loading={loading} error={error} onRetry={() => void load()} />
    {message && <div className="settings-message" role="status">{message}</div>}
    {creating && <form className="project-create" onSubmit={(event) => { event.preventDefault(); void add() }}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="새 프로젝트 이름" maxLength={80} autoFocus />
      <div className="color-picker">{colors.map((value) => <button type="button" aria-label={`색상 ${value}`} className={color === value ? 'active' : ''} style={{ background: value }} onClick={() => setColor(value)} key={value} />)}</div>
      <button type="submit">프로젝트 추가</button>
    </form>}
    <section className="project-section"><div className="project-section-heading"><h2>사용 중</h2><span>{activeProjects.length}</span></div><div className="project-grid">{activeProjects.map(projectCard)}</div>
      {!activeProjects.length && !loading && <div className="empty-state"><strong>사용 중인 프로젝트가 없습니다.</strong><span>새 프로젝트를 만들어 업무를 연결해 보세요.</span></div>}
    </section>
    {!!archivedProjects.length && <section className="project-section archived-section"><div className="project-section-heading"><h2>보관됨</h2><span>{archivedProjects.length}</span></div><div className="project-grid">{archivedProjects.map(projectCard)}</div></section>}
  </main>
}
