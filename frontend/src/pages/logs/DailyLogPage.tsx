import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader'
import { ImportModal } from '../../components/import/ImportModal'
import { WorkSection } from '../../components/editor/WorkSection'
import { carryOverItems, createItem, deleteItem, fetchItems, updateItemType } from '../../api/workItems'
import { fetchProjects } from '../../api/projects'
import { addDays, localDate } from '../../utils/date'
import { createMarkdownExport, getImportEntries, parseMarkdown, validDate } from '../../utils/markdown'
import type { ImportMode, ImportPreview, ItemType, Project, WorkItem } from '../../types'

const sections: { type: ItemType; title: string; hint: string; addLabel: string }[] = [
  { type: 'TODO', title: 'To Do', hint: '할 일과 구현 계획을 기록하세요…', addLabel: '할 일 추가' },
  { type: 'DONE', title: 'Done', hint: '완료한 일과 결과를 기록하세요…', addLabel: '완료 기록 추가' },
  { type: 'NOTE', title: 'Notes & Learnings', hint: '메모, 회고, 막힌 점과 배운 점을 기록하세요…', addLabel: '메모 추가' },
]

export function DailyLogPage() {
  const { date: routeDate } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const date = validDate(routeDate) ?? localDate()
  const [items, setItems] = useState<WorkItem[]>([])
  const [drafts, setDrafts] = useState<Record<ItemType, string>>({ TODO: '', DONE: '', NOTE: '' })
  const [draftProjects, setDraftProjects] = useState<Record<ItemType, number | null>>({ TODO: null, DONE: null, NOTE: null })
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('append')
  const [importProjectIds, setImportProjectIds] = useState<Record<string, number | null>>({})
  const [importing, setImporting] = useState(false)
  const [deletedItem, setDeletedItem] = useState<WorkItem | null>(null)
  const [previousTodoCount, setPreviousTodoCount] = useState(0)
  const [carryMessage, setCarryMessage] = useState('')
  const undoTimer = useRef<number | undefined>(undefined)
  const lastFocusedHash = useRef('')

  const grouped = useMemo(() => items.reduce<Partial<Record<ItemType, WorkItem[]>>>((result, item) => {
    result[item.type] = [...(result[item.type] ?? []), item]
    return result
  }, {}), [items])

  const load = useCallback(async (targetDate = date) => {
    try { setItems(await fetchItems(targetDate)); setError('') }
    catch { setError('백엔드에 연결할 수 없습니다. backend를 먼저 실행해 주세요.') }
  }, [date])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!hash || !items.length || lastFocusedHash.current === hash) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1))
      if (!target) return
      lastFocusedHash.current = hash
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hash, items])
  useEffect(() => { fetchProjects().then((result) => setProjects(result.filter((project) => !project.archived))).catch(() => setProjects([])) }, [])
  useEffect(() => {
    fetchItems(addDays(date, -1)).then((previous) =>
      setPreviousTodoCount(previous.filter((item) => item.type === 'TODO').length)).catch(() => setPreviousTodoCount(0))
  }, [date])
  if (!routeDate || !validDate(routeDate)) return <Navigate to={`/logs/${date}`} replace />

  async function add(type: ItemType) {
    const content = drafts[type].trim()
    if (!content) return
    try { await createItem(date, type, content, draftProjects[type]); setDrafts((value) => ({ ...value, [type]: '' })); await load() }
    catch { setError('기록을 저장하지 못했습니다.') }
  }

  function moveToComposer(type: ItemType) {
    const composer = document.getElementById(`composer-${type}`)
    if (!composer) return
    composer.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => composer.querySelector<HTMLElement>('.notion-editor')?.focus(), 350)
  }

  async function remove(id: number) {
    const item = items.find((candidate) => candidate.id === id)
    if (!item) return
    try {
      await deleteItem(id)
      setItems((value) => value.filter((candidate) => candidate.id !== id))
      setDeletedItem(item)
      window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setDeletedItem(null), 6000)
    }
    catch { setError('기록을 삭제하지 못했습니다.') }
  }

  async function undoDelete() {
    if (!deletedItem) return
    window.clearTimeout(undoTimer.current)
    try {
      await createItem(deletedItem.workDate, deletedItem.type, deletedItem.content, deletedItem.project?.id)
      setDeletedItem(null)
      await load()
    } catch { setError('삭제한 기록을 복원하지 못했습니다.') }
  }

  async function changeType(item: WorkItem, type: ItemType) {
    try { await updateItemType(item.id, type); await load() }
    catch { setError('기록 상태를 변경하지 못했습니다.') }
  }

  async function carryOver() {
    try {
      const copied = await carryOverItems(addDays(date, -1), date)
      setCarryMessage(copied.length ? `${copied.length}개의 할 일을 가져왔습니다.` : '이미 가져온 할 일입니다.')
      await load()
    } catch { setError('전날 미완료 업무를 가져오지 못했습니다.') }
  }

  function exportMarkdown() {
    const blob = new Blob([createMarkdownExport(date, grouped)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `worklog-${date}.md`; anchor.click(); URL.revokeObjectURL(url)
  }

  async function chooseMarkdown(file: File) {
    try {
      const preview = parseMarkdown(file.name, await file.text(), date)
      setImportPreview(preview)
      setImportMode('append')
      setImportProjectIds(Object.fromEntries(getImportEntries(preview).map((entry) => [entry.key, null])))
    }
    catch { setError('Markdown 파일을 읽지 못했습니다.') }
  }

  async function importMarkdown() {
    if (!importPreview || !validDate(importPreview.date)) return
    const entries = getImportEntries(importPreview)
    if (!entries.length) { setError('가져올 내용이 없습니다.'); return }
    setImporting(true)
    try {
      if (importMode === 'replace') await Promise.all((await fetchItems(importPreview.date)).map((item) => deleteItem(item.id)))
      await Promise.all(entries.map((entry) => createItem(
        importPreview.date, entry.type, entry.content, importProjectIds[entry.key] ?? null)))
      const importedDate = importPreview.date
      setImportPreview(null); setError('')
      if (date === importedDate) await load(importedDate)
      else navigate(`/logs/${importedDate}`)
    } catch { setError('Markdown을 가져오지 못했습니다. 기존 기록을 확인해 주세요.') }
    finally { setImporting(false) }
  }

  return <main className="page daily-page">
    <AppHeader
      date={date}
      onDateChange={(next) => navigate(`/logs/${next}`)}
      onMoveDate={(days) => navigate(`/logs/${addDays(date, days)}`)}
      onToday={() => navigate(`/logs/${localDate()}`)}
      onImportFile={chooseMarkdown}
      onExport={exportMarkdown}
    />
    {error && <div className="error">{error}</div>}
    <section className="summary" aria-label="오늘 기록 요약">
      <button type="button" onClick={() => moveToComposer('TODO')}><strong>{grouped.TODO?.length ?? 0}</strong> 할 일 <i>↓</i></button>
      <button type="button" onClick={() => moveToComposer('DONE')}><strong>{grouped.DONE?.length ?? 0}</strong> 완료 <i>↓</i></button>
      <button type="button" onClick={() => moveToComposer('NOTE')}><strong>{grouped.NOTE?.length ?? 0}</strong> 메모 <i>↓</i></button>
    </section>
    {previousTodoCount > 0 && <div className="carry-over-banner">
      <div><strong>전날 미완료 업무 {previousTodoCount}개</strong><span>{carryMessage || '오늘 일지에 이어서 기록할 수 있습니다.'}</span></div>
      <button onClick={() => void carryOver()}>가져오기</button>
    </div>}
    <section className="document">
      {sections.map((section) => <WorkSection key={section.type} {...section}
        items={grouped[section.type] ?? []} draft={drafts[section.type]}
        onDraftChange={(value) => setDrafts((current) => ({ ...current, [section.type]: value }))}
        onAdd={() => void add(section.type)} onChangeType={(item, type) => void changeType(item, type)}
        onRemove={(id) => void remove(id)}
        onUpdated={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))}
        projects={projects} projectId={draftProjects[section.type]}
        onProjectChange={(projectId) => setDraftProjects((current) => ({ ...current, [section.type]: projectId }))} />)}
    </section>
    {importPreview && <ImportModal preview={importPreview} mode={importMode} importing={importing}
      projects={projects} projectIds={importProjectIds} onProjectChange={(entryKey, projectId) =>
        setImportProjectIds((current) => ({ ...current, [entryKey]: projectId }))}
      onPreviewChange={setImportPreview} onModeChange={setImportMode} onClose={() => setImportPreview(null)}
      onImport={() => void importMarkdown()} />}
    {deletedItem && <div className="undo-toast"><span>기록을 삭제했습니다.</span><button onClick={() => void undoDelete()}>실행 취소</button></div>}
  </main>
}
