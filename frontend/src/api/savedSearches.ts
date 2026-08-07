import type { SavedSearch } from '../types'
import { apiRequest, jsonHeaders } from './client'

const API = '/api/saved-searches'
export type SavedSearchInput = Omit<SavedSearch, 'id'>

export async function fetchSavedSearches(): Promise<SavedSearch[]> {
  const response = await apiRequest(API)
  if (!response.ok) throw new Error('저장된 필터를 불러오지 못했습니다.')
  return response.json()
}

export async function createSavedSearch(input: SavedSearchInput): Promise<SavedSearch> {
  const response = await apiRequest(API, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(input) })
  if (!response.ok) throw new Error('필터를 저장하지 못했습니다.')
  return response.json()
}

export async function deleteSavedSearch(id: number) {
  const response = await apiRequest(`${API}/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('저장된 필터를 삭제하지 못했습니다.')
}
