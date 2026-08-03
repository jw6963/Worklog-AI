import type { ItemType, WorkItem } from '../types'
import { apiRequest, jsonHeaders } from './client'

const API = '/api/items'

export type SearchItemsResponse = {
  items: WorkItem[]
  hasMore: boolean
  nextBeforeDate: string | null
  totalItems: number
  totalDays: number
}

export async function fetchItems(date: string): Promise<WorkItem[]> {
  const response = await apiRequest(`${API}?date=${date}`)
  if (!response.ok) throw new Error('목록 조회 실패')
  return response.json()
}

export async function fetchItemsRange(from: string, to: string): Promise<WorkItem[]> {
  const response = await apiRequest(`${API}/range?from=${from}&to=${to}`)
  if (!response.ok) throw new Error('기간 목록 조회 실패')
  return response.json()
}

export async function searchItems(params: { from: string; to: string; beforeDate?: string | null; type?: ItemType; projectId?: number; query?: string; limitDays?: number }): Promise<SearchItemsResponse> {
  const search = new URLSearchParams({ from: params.from, to: params.to, limitDays: String(params.limitDays ?? 10) })
  if (params.beforeDate) search.set('beforeDate', params.beforeDate)
  if (params.type) search.set('type', params.type)
  if (params.projectId != null) search.set('projectId', String(params.projectId))
  if (params.query) search.set('query', params.query)
  const response = await apiRequest(`${API}/search?${search}`)
  if (!response.ok) throw new Error('기록 검색 실패')
  return response.json()
}

export async function createItem(workDate: string, type: ItemType, content: string, projectId?: number | null) {
  const response = await apiRequest(API, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ workDate, type, content, projectId }) })
  if (!response.ok) throw new Error('기록 저장 실패')
}

export async function deleteItem(id: number) {
  const response = await apiRequest(`${API}/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('기록 삭제 실패')
}

export async function updateItemType(id: number, type: ItemType) {
  const response = await apiRequest(`${API}/${id}/type`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ type }) })
  if (!response.ok) throw new Error('기록 상태 변경 실패')
}

export async function updateItemContent(id: number, content: string): Promise<WorkItem> {
  const response = await apiRequest(`${API}/${id}/content`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ content }) })
  if (!response.ok) throw new Error('기록 내용 수정 실패')
  return response.json()
}

export async function updateItemProject(id: number, projectId: number | null): Promise<WorkItem> {
  const response = await apiRequest(`${API}/${id}/project`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ projectId }) })
  if (!response.ok) throw new Error('프로젝트 변경 실패')
  return response.json()
}

export async function carryOverItems(fromDate: string, toDate: string): Promise<WorkItem[]> {
  const response = await apiRequest(`${API}/carry-over`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ fromDate, toDate }) })
  if (!response.ok) throw new Error('미완료 업무 가져오기 실패')
  return response.json()
}
