import { useEffect, useState } from 'react'
import { archiveProject, createProject, deleteProject, fetchProjects, updateProject } from '../../api/projects'
import type { Project } from '../../types'

const colors = ['#4b8063', '#4f6f9f', '#8a633f', '#84649a', '#a6534b', '#6d746f']

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(colors[0])

  async function load() {
    try { setProjects(await fetchProjects()); setError('') }
    catch { setError('프로젝트를 불러오지 못했습니다.') }
  }
  useEffect(() => { void load() }, [])

  async function add() {
    if (!name.trim()) return
    try { await createProject(name.trim(), color); setName(''); await load() }
    catch { setError('같은 이름의 프로젝트가 있거나 생성하지 못했습니다.') }
  }

  async function toggle(project: Project) {
    try { await archiveProject(project.id, !project.archived); await load() }
    catch { setError('프로젝트 상태를 변경하지 못했습니다.') }
  }

  function beginEdit(project: Project) {
    setEditingId(project.id); setEditName(project.name); setEditColor(project.color)
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    try { await updateProject(editingId, editName.trim(), editColor); setEditingId(null); await load() }
    catch { setError('같은 이름의 프로젝트가 있거나 수정하지 못했습니다.') }
  }

  async function remove(project: Project) {
    const assignedCount = project.itemCount ?? 0
    const message = assignedCount
      ? `이 프로젝트가 ${assignedCount}개 항목에 지정되어 있습니다.\n\n항목은 삭제하지 않고 프로젝트 지정만 해제한 뒤 프로젝트를 삭제할까요?`
      : `'${project.name}' 프로젝트를 삭제할까요?`
    if (!window.confirm(message)) return
    try { await deleteProject(project.id, assignedCount > 0); if (editingId === project.id) setEditingId(null); await load() }
    catch { setError('프로젝트를 삭제하지 못했습니다.') }
  }

  return <main className="page projects-page">
    <div className="page-heading"><div><span className="page-kicker">PROJECTS</span><h1>프로젝트</h1><p>여러 날짜의 기록을 프로젝트별로 연결하고 모아볼 수 있습니다.</p></div></div>
    {error && <div className="error">{error}</div>}
    <form className="project-create" onSubmit={(event) => { event.preventDefault(); void add() }}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="새 프로젝트 이름" maxLength={80} />
      <div className="color-picker">{colors.map((value) => <button type="button" aria-label={`색상 ${value}`} className={color === value ? 'active' : ''} style={{ background: value }} onClick={() => setColor(value)} key={value} />)}</div>
      <button type="submit">프로젝트 추가</button>
    </form>
    <section className="project-list">
      {projects.map((project) => editingId === project.id
        ? <article className="project-edit" key={project.id}>
          <i style={{ background: editColor }} />
          <div className="project-edit-fields"><input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} autoFocus />
            <div className="color-picker">{colors.map((value) => <button type="button" aria-label={`색상 ${value}`} className={editColor === value ? 'active' : ''} style={{ background: value }} onClick={() => setEditColor(value)} key={value} />)}</div>
          </div>
          <div className="project-row-actions"><button onClick={() => setEditingId(null)}>취소</button><button className="save" onClick={() => void saveEdit()}>저장</button></div>
        </article>
        : <article className={project.archived ? 'archived' : ''} key={project.id}>
          <i style={{ background: project.color }} /><div><strong>{project.name}</strong><span>{project.archived ? '보관됨' : '사용 중'} · 연결 항목 {project.itemCount ?? 0}개</span></div>
          <div className="project-row-actions"><button onClick={() => beginEdit(project)}>수정</button><button onClick={() => void toggle(project)}>{project.archived ? '복원' : '보관'}</button><button className="delete-project" onClick={() => void remove(project)}>삭제</button></div>
        </article>)}
      {!projects.length && <div className="empty-state"><strong>프로젝트가 없습니다.</strong><span>첫 프로젝트를 만들어 일지에 연결해 보세요.</span></div>}
    </section>
  </main>
}
