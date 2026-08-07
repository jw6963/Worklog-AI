import type { ItemType, WorkItem } from '../types'
import { apiRequest, jsonHeaders } from './client'

const API = '/api/items'

export type BackupData = {
  schemaVersion: number
  exportedAt?: string
  projects?: Array<{ id: number; name: string; color: string; archived: boolean }>
  savedSearches?: Array<{ name: string; period: '7D' | '14D' | '30D' | 'CUSTOM'; fromDate?: string | null; toDate?: string | null; itemType?: ItemType | null; projectId?: number | null; query?: string }>
  items: Array<{
    workDate: string
    type: ItemType
    content: string
    projectId?: number | null
    flowId?: string | null
    carriedToDate?: string | null
    flowCurrentDate?: string | null
    flowCompletedDate?: string | null
  }>
}

export async function fetchBackup(): Promise<BackupData> {
  const response = await apiRequest(`${API}/backup`)
  if (!response.ok) throw new Error('백업 생성 실패')
  return response.json()
}

export async function restoreBackup(data: BackupData, replaceExisting = true): Promise<WorkItem[]> {
  const response = await apiRequest(`${API}/restore`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ schemaVersion: data.schemaVersion, projects: data.projects, items: data.items, savedSearches: data.savedSearches, replaceExisting }) })
  if (!response.ok) throw new Error('백업 복원 실패')
  return response.json()
}
