import type { ImportMode, ImportPreview, ItemType, Project } from '../../types'
import { getImportEntries, splitImportItems, validDate } from '../../utils/markdown'
import { SelectMenu } from '../ui/SelectMenu'

type Props = {
  preview: ImportPreview
  mode: ImportMode
  importing: boolean
  projects: Project[]
  projectIds: Record<string, number | null>
  onPreviewChange: (preview: ImportPreview) => void
  onModeChange: (mode: ImportMode) => void
  onProjectChange: (entryKey: string, projectId: number | null) => void
  onClose: () => void
  onImport: () => void
}

export function ImportModal({
  preview, mode, importing, projects, projectIds,
  onPreviewChange, onModeChange, onProjectChange, onClose, onImport,
}: Props) {
  const entries = getImportEntries(preview)
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-heading">
        <div><span>MARKDOWN IMPORT</span><h2 id="import-title">불러오기 미리보기</h2></div>
        <button aria-label="닫기" onClick={onClose}>×</button>
      </div>
      <p className="file-name">{preview.fileName}</p>
      <label className="date-field">
        <span>기록 날짜</span>
        <input type="date" value={preview.date} onChange={(event) => onPreviewChange({ ...preview, date: event.target.value, dateSource: 'selected' })} />
        <small>{preview.dateSource === 'metadata' ? '본문 메타데이터에서 인식' : preview.dateSource === 'filename' ? '파일명에서 인식' : '현재 선택 날짜 — 필요하면 변경하세요'}</small>
      </label>
      <div className="import-summary">
        {(['TODO', 'DONE', 'NOTE'] as ItemType[]).map((type) => {
          const count = splitImportItems(preview.sections[type]).length
          return <div key={type} className={count ? 'recognized' : ''}>
          <strong>{type === 'TODO' ? 'To Do' : type === 'DONE' ? 'Done' : 'Notes'}</strong>
          <span>{count ? `${count.toLocaleString()}개 항목` : '없음'}</span>
        </div>})}
      </div>
      <div className="import-entry-projects">
        <div className="import-entry-heading"><strong>항목별 프로젝트</strong><span>가져올 항목 {entries.length}개</span></div>
        {entries.map((entry) => <div className="import-entry-row" key={entry.key}>
          <span className={`type-badge ${entry.type.toLowerCase()}`}>{entry.type}</span>
          <p>{entry.content.split('\n').find((line) => line.trim()) ?? '내용 없음'}</p>
          <SelectMenu ariaLabel={`${entry.type} 항목 프로젝트 선택`} value={String(projectIds[entry.key] ?? '')}
            options={[{ value: '', label: '프로젝트 없음', muted: true }, ...projects.map((project) => ({
              value: String(project.id), label: project.name, color: project.color,
            }))]}
            onChange={(value) => onProjectChange(entry.key, value ? Number(value) : null)} />
        </div>)}
      </div>
      <fieldset>
        <legend>같은 날짜의 기존 기록</legend>
        <label><input type="radio" checked={mode === 'append'} onChange={() => onModeChange('append')} /> 기존 기록에 추가</label>
        <label><input type="radio" checked={mode === 'replace'} onChange={() => onModeChange('replace')} /> 기존 기록을 교체</label>
      </fieldset>
      <div className="modal-actions">
        <button onClick={onClose}>취소</button>
        <button className="primary" disabled={importing || !validDate(preview.date)} onClick={onImport}>{importing ? '가져오는 중…' : '가져오기'}</button>
      </div>
    </section>
  </div>
}
