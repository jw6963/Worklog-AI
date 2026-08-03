import type { ItemType, Project, WorkItem } from '../../types'
import { EditableWorkItem } from './EditableWorkItem'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { SelectMenu } from '../ui/SelectMenu'

type Props = {
  type: ItemType
  title: string
  hint: string
  addLabel: string
  items: WorkItem[]
  draft: string
  onDraftChange: (value: string) => void
  onAdd: () => void
  onChangeType: (item: WorkItem, type: ItemType) => void
  onRemove: (id: number) => void
  onUpdated: (item: WorkItem) => void
  projects: Project[]
  projectId: number | null
  onProjectChange: (projectId: number | null) => void
}

export function WorkSection({
  type, title, hint, addLabel, items, draft,
  onDraftChange, onAdd, onChangeType, onRemove, onUpdated, projects, projectId, onProjectChange,
}: Props) {
  return <article className="work-section">
    <div className="section-heading">
      <h2>{title}</h2>
      <span>{items.length}</span>
    </div>

    <div className="entries">
      {items.map((item) => <EditableWorkItem key={item.id} item={item} onUpdated={onUpdated}
        onChangeType={onChangeType} onRemove={() => onRemove(item.id)} projects={projects} />)}
      {!items.length && <p className="empty">아직 기록이 없습니다.</p>}
    </div>

    <form id={`composer-${type}`} className="composer rich-composer" onSubmit={(event) => { event.preventDefault(); onAdd() }}>
      <RichMarkdownEditor value={draft} placeholder={hint} onChange={onDraftChange} onSubmit={onAdd} />
      <div className="composer-footer">
        <span><code># </code>제목 · <code>- </code>목록 · Ctrl+Enter 저장</span>
        <div className="composer-actions"><label><span>프로젝트</span><SelectMenu ariaLabel="프로젝트 선택" value={String(projectId ?? '')}
          options={[{ value: '', label: '프로젝트 없음', muted: true }, ...projects.map((project) => ({ value: String(project.id), label: project.name, color: project.color }))]}
          onChange={(value) => onProjectChange(value ? Number(value) : null)} /></label><button type="submit">{addLabel}</button></div>
      </div>
    </form>
  </article>
}
