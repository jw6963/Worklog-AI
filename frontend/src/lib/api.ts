import type { ItemType, Project, WorkItem } from '../types'

const API = 'http://localhost:8080/api/items'

const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await window.fetch(input, { ...init, credentials: 'include' })
  if (response.status === 428) window.location.assign('/change-password')
  if (response.status === 401) window.location.assign('/login')
  return response
}

export type BackupData = {
  schemaVersion: number
  exportedAt?: string
  projects?: Array<{ id: number; name: string; color: string; archived: boolean }>
  items: Array<{ workDate: string; type: ItemType; content: string; projectId?: number | null }>
}

export async function fetchItems(date: string): Promise<WorkItem[]> {
  const response = await apiFetch(`${API}?date=${date}`)
  if (!response.ok) throw new Error('목록 조회 실패')
  return response.json()
}

export async function fetchItemsRange(from: string, to: string): Promise<WorkItem[]> {
  const response = await apiFetch(`${API}/range?from=${from}&to=${to}`)
  if (!response.ok) throw new Error('기간 목록 조회 실패')
  return response.json()
}

export type SearchItemsResponse = {
  items: WorkItem[]
  hasMore: boolean
  nextBeforeDate: string | null
  totalItems: number
  totalDays: number
}

export async function searchItems(params: {
  from: string
  to: string
  beforeDate?: string | null
  type?: ItemType
  projectId?: number
  query?: string
  limitDays?: number
}): Promise<SearchItemsResponse> {
  const search = new URLSearchParams({ from: params.from, to: params.to, limitDays: String(params.limitDays ?? 10) })
  if (params.beforeDate) search.set('beforeDate', params.beforeDate)
  if (params.type) search.set('type', params.type)
  if (params.projectId != null) search.set('projectId', String(params.projectId))
  if (params.query) search.set('query', params.query)
  const response = await apiFetch(`${API}/search?${search}`)
  if (!response.ok) throw new Error('기록 검색 실패')
  return response.json()
}

export async function createItem(workDate: string, type: ItemType, content: string, projectId?: number | null) {
  const response = await apiFetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workDate, type, content, projectId }),
  })
  if (!response.ok) throw new Error('기록 저장 실패')
}

export async function deleteItem(id: number) {
  const response = await apiFetch(`${API}/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('기록 삭제 실패')
}

export async function updateItemType(id: number, type: ItemType) {
  const response = await apiFetch(`${API}/${id}/type`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!response.ok) throw new Error('기록 상태 변경 실패')
}

export async function updateItemContent(id: number, content: string): Promise<WorkItem> {
  const response = await apiFetch(`${API}/${id}/content`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error('기록 내용 수정 실패')
  return response.json()
}

export async function updateItemProject(id: number, projectId: number | null): Promise<WorkItem> {
  const response = await apiFetch(`${API}/${id}/project`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }),
  })
  if (!response.ok) throw new Error('프로젝트 변경 실패')
  return response.json()
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch('http://localhost:8080/api/projects')
  if (!response.ok) throw new Error('프로젝트 조회 실패')
  return response.json()
}

export async function createProject(name: string, color: string): Promise<Project> {
  const response = await apiFetch('http://localhost:8080/api/projects', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }),
  })
  if (!response.ok) throw new Error('프로젝트 생성 실패')
  return response.json()
}

export async function archiveProject(id: number, archived: boolean): Promise<Project> {
  const response = await apiFetch(`http://localhost:8080/api/projects/${id}/archived`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived }),
  })
  if (!response.ok) throw new Error('프로젝트 보관 변경 실패')
  return response.json()
}

export async function updateProject(id: number, name: string, color: string): Promise<Project> {
  const response = await apiFetch(`http://localhost:8080/api/projects/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }),
  })
  if (!response.ok) throw new Error('프로젝트 수정 실패')
  return response.json()
}

export async function deleteProject(id: number, detachItems: boolean) {
  const response = await apiFetch(`http://localhost:8080/api/projects/${id}?detachItems=${detachItems}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('프로젝트 삭제 실패')
}

export async function carryOverItems(fromDate: string, toDate: string): Promise<WorkItem[]> {
  const response = await apiFetch(`${API}/carry-over`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromDate, toDate }),
  })
  if (!response.ok) throw new Error('미완료 업무 가져오기 실패')
  return response.json()
}

export async function fetchBackup(): Promise<BackupData> {
  const response = await apiFetch(`${API}/backup`)
  if (!response.ok) throw new Error('백업 생성 실패')
  return response.json()
}

export async function restoreBackup(data: BackupData, replaceExisting = true): Promise<WorkItem[]> {
  const response = await apiFetch(`${API}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemaVersion: data.schemaVersion, projects: data.projects, items: data.items, replaceExisting }),
  })
  if (!response.ok) throw new Error('백업 복원 실패')
  return response.json()
}
