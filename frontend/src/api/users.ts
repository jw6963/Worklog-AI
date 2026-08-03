const API = '/api/admin/users'
import { apiRequest as request } from './client'

export type ManagedUser = {
  id: number
  username: string
  displayName: string
  role: 'ADMIN' | 'USER'
  enabled: boolean
  mustChangePassword: boolean
}

export type TemporaryPasswordResult = { user: ManagedUser; temporaryPassword: string }

export async function fetchUsers(): Promise<ManagedUser[]> {
  const response = await request(API)
  if (!response.ok) throw new Error('사용자 목록을 불러오지 못했습니다.')
  return response.json()
}

export async function createUser(username: string, displayName: string): Promise<TemporaryPasswordResult> {
  const response = await request(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, displayName }) })
  if (response.status === 409) throw new Error('이미 사용 중인 아이디입니다.')
  if (!response.ok) throw new Error('계정을 생성하지 못했습니다.')
  return response.json()
}

export async function setUserEnabled(id: number, enabled: boolean): Promise<ManagedUser> {
  const response = await request(`${API}/${id}/enabled`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
  if (!response.ok) throw new Error('계정 상태를 변경하지 못했습니다.')
  return response.json()
}

export async function resetUserPassword(id: number): Promise<TemporaryPasswordResult> {
  const response = await request(`${API}/${id}/reset-password`, { method: 'POST' })
  if (!response.ok) throw new Error('비밀번호를 초기화하지 못했습니다.')
  return response.json()
}
