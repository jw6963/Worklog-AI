import type { Project } from '../types'
import { apiRequest, jsonHeaders } from './client'

const API = '/api/projects'

export async function fetchProjects(): Promise<Project[]> {
  const response = await apiRequest(API)
  if (!response.ok) throw new Error('프로젝트 조회 실패')
  return response.json()
}

export async function createProject(name: string, color: string): Promise<Project> {
  const response = await apiRequest(API, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name, color }) })
  if (!response.ok) throw new Error('프로젝트 생성 실패')
  return response.json()
}

export async function archiveProject(id: number, archived: boolean): Promise<Project> {
  const response = await apiRequest(`${API}/${id}/archived`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ archived }) })
  if (!response.ok) throw new Error('프로젝트 보관 변경 실패')
  return response.json()
}

export async function updateProject(id: number, name: string, color: string): Promise<Project> {
  const response = await apiRequest(`${API}/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ name, color }) })
  if (!response.ok) throw new Error('프로젝트 수정 실패')
  return response.json()
}

export async function deleteProject(id: number, detachItems: boolean) {
  const response = await apiRequest(`${API}/${id}?detachItems=${detachItems}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('프로젝트 삭제 실패')
}

export async function transferProjectItems(id: number, targetProjectId: number): Promise<{ movedCount: number; targetProjectId: number }> {
  const response = await apiRequest(`${API}/${id}/transfer`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ targetProjectId }) })
  if (!response.ok) throw new Error('프로젝트 이관 실패')
  return response.json()
}
