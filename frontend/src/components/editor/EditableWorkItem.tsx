import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { updateItemContent, updateItemProject } from '../../api/workItems'
import type { ItemType, Project, WorkItem } from '../../types'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { SelectMenu } from '../ui/SelectMenu'

type Props = {
  item: WorkItem
  onUpdated: (item: WorkItem) => void
  onChangeType: (item: WorkItem, type: ItemType) => void
  onRemove: (item: WorkItem) => void
  projects: Project[]
}

export function EditableWorkItem({ item, onUpdated, onChangeType, onRemove, projects }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content)
  const [saveState, setSaveState] = useState<'idle' | 'waiting' | 'saving' | 'saved' | 'error'>('idle')
  const revision = useRef(0)
  const editorContainer = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<number | undefined>(undefined)
  const saveAndCloseRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (!editing || draft.trim() === item.content) return
    setSaveState('waiting')
    const currentRevision = ++revision.current
    debounceTimer.current = window.setTimeout(async () => {
      setSaveState('saving')
      try {
        const updated = await updateItemContent(item.id, draft.trim())
        if (revision.current === currentRevision) {
          onUpdated(updated)
          setSaveState('saved')
        }
      } catch {
        if (revision.current === currentRevision) setSaveState('error')
      }
    }, 800)
    return () => window.clearTimeout(debounceTimer.current)
  }, [draft, editing, item.content, item.id, onUpdated])

  async function saveAndClose() {
    const content = draft.trim()
    if (!content) { cancel(); return }
    revision.current += 1
    window.clearTimeout(debounceTimer.current)
    try {
      setSaveState('saving')
      const updated = content === item.content ? item : await updateItemContent(item.id, content)
      onUpdated(updated)
      setSaveState('saved')
      setEditing(false)
    } catch {
      setSaveState('error')
    }
  }

  function cancel() {
    revision.current += 1
    window.clearTimeout(debounceTimer.current)
    setDraft(item.content)
    setSaveState('idle')
    setEditing(false)
  }

  async function changeProject(value: string) {
    try { onUpdated(await updateItemProject(item.id, value ? Number(value) : null)) }
    catch { setSaveState('error') }
  }

  const projectStyle = { '--project-color': item.project?.color ?? '#b8b8b4' } as CSSProperties
  const projectSelector = <div className={`entry-project ${item.project ? '' : 'unassigned'}`} style={projectStyle}>
    <i />
    <span>프로젝트</span>
    {item.carriedToDate ? <strong>{item.project?.name ?? '프로젝트 없음'}</strong> : <SelectMenu ariaLabel="프로젝트" value={String(item.project?.id ?? '')}
      options={[{ value: '', label: '프로젝트 없음', muted: true }, ...projects.map((project) => ({ value: String(project.id), label: project.name, color: project.color }))]}
      onChange={(value) => void changeProject(value)} />}
  </div>

  saveAndCloseRef.current = () => { void saveAndClose() }
  useEffect(() => {
    if (!editing) return
    const saveOnOutsideClick = (event: PointerEvent) => {
      if (!editorContainer.current?.contains(event.target as Node)) saveAndCloseRef.current()
    }
    document.addEventListener('pointerdown', saveOnOutsideClick)
    return () => document.removeEventListener('pointerdown', saveOnOutsideClick)
  }, [editing])

  if (item.carriedToDate) {
    const summary = item.content.replace(/[#*_`>\-[\]]/g, '').split('\n').find((line) => line.trim()) ?? item.content
    return <div id={`item-${item.id}`} className="entry carried-entry" tabIndex={-1} style={projectStyle}>
      <i className="carried-project-dot" />
      <div className="carried-summary">
        <div><strong>{summary}</strong>{item.project && <span>{item.project.name}</span>}</div>
        <small>{item.carriedToDate}로 이월됨{item.flowCompletedDate ? ` · ${item.flowCompletedDate} 완료` : ''}</small>
      </div>
      <div className="carried-actions">
        {item.flowCurrentDate && <Link to={`/logs/${item.flowCurrentDate}`}>현재 항목 →</Link>}
        {!item.flowCompletedDate
          ? <button className="complete" onClick={() => onChangeType(item, 'DONE')}>완료</button>
          : <button onClick={() => onChangeType(item, 'TODO')}>할 일로</button>}
      </div>
    </div>
  }

  if (editing) return <div id={`item-${item.id}`} className="entry editing-entry" ref={editorContainer} style={projectStyle} tabIndex={-1}>
    {projectSelector}
    <RichMarkdownEditor value={draft} placeholder="기록을 수정하세요…" onChange={setDraft}
      onSubmit={() => void saveAndClose()} onCancel={cancel} autoFocus />
    <div className={`save-state ${saveState}`}>
      <span>{saveState === 'waiting' ? '저장 대기…' : saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? '저장됨' : saveState === 'error' ? '저장 실패' : 'Esc 취소 · Ctrl+Enter 완료'}</span>
      <div><button onClick={cancel}>취소</button><button className="complete" onClick={() => void saveAndClose()}>완료</button></div>
    </div>
  </div>

  return <div id={`item-${item.id}`} className={`entry ${item.carriedToDate ? 'carried-entry' : ''}`} tabIndex={-1} onDoubleClick={(event) => {
    const target = event.target as HTMLElement
    if (!item.carriedToDate && !target.closest('button, select, input, a, label')) setEditing(true)
  }} style={projectStyle}>
    {projectSelector}
    <div className="markdown"><ReactMarkdown>{item.content}</ReactMarkdown></div>
    <div className="entry-actions">
      {!item.carriedToDate && <button onClick={() => setEditing(true)}>수정</button>}
      {item.type === 'TODO' && !item.flowCompletedDate && <button className="complete" onClick={() => onChangeType(item, 'DONE')}>완료</button>}
      {(item.type === 'DONE' || item.flowCompletedDate) && <button onClick={() => onChangeType(item, 'TODO')}>할 일로</button>}
      {!item.flowId && <button className="delete" onClick={() => onRemove(item)}>삭제</button>}
    </div>
  </div>
}
