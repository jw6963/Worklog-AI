import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { AuthContext, LoginError, type AuthUser, type AuthValue } from './context'

const AUTH_API = '/api/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${AUTH_API}/me`, { credentials: 'include' })
      .then(async (response) => setUser(response.ok ? await response.json() : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    login: async (username, password) => {
      const response = await fetch(`${AUTH_API}/login`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { message?: string; lockedUntil?: string; failedAttempts?: number; remainingAttempts?: number } | null
        throw new LoginError(failure?.message ?? '아이디 또는 비밀번호를 확인해 주세요.', failure?.lockedUntil,
          failure?.failedAttempts, failure?.remainingAttempts)
      }
      setUser(await response.json())
    },
    logout: async () => {
      await fetch(`${AUTH_API}/logout`, { method: 'POST', credentials: 'include' })
      setUser(null)
    },
    changePassword: async (newPassword, currentPassword) => {
      const response = await fetch(`${AUTH_API}/change-password`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!response.ok) throw new Error('10자 이상의 새 비밀번호를 입력하고 기존 비밀번호와 다르게 설정해 주세요.')
      const result = await response.json() as { showGuide: boolean }
      flushSync(() => setUser((current) => current ? { ...current, mustChangePassword: false } : current))
      return result.showGuide
    },
    updateProfile: async (displayName) => {
      const response = await fetch(`${AUTH_API}/profile`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })
      if (!response.ok) throw new Error('표시 이름을 변경하지 못했습니다.')
      setUser(await response.json())
    },
    uploadAvatar: async (file) => {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(`${AUTH_API}/avatar`, { method: 'POST', credentials: 'include', body: form })
      if (!response.ok) throw new Error('JPEG, PNG 또는 WebP 이미지를 2MB 이하로 선택해 주세요.')
      setUser(await response.json())
    },
    removeAvatar: async () => {
      const response = await fetch(`${AUTH_API}/avatar`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) throw new Error('프로필 이미지를 삭제하지 못했습니다.')
      setUser(await response.json())
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
