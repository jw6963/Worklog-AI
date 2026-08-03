import { createContext } from 'react'

export type AuthUser = { username: string; displayName: string; role: 'ADMIN' | 'USER'; mustChangePassword: boolean }

export type AuthValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
