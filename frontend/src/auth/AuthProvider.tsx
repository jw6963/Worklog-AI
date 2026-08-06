import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
      setUser((current) => current ? { ...current, mustChangePassword: false } : current)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
