import { createContext } from 'react'

export type AuthUser = { username: string; displayName: string; role: 'ADMIN' | 'USER'; mustChangePassword: boolean }

export class LoginError extends Error {
  lockedUntil?: string
  failedAttempts?: number
  remainingAttempts?: number

  constructor(message: string, lockedUntil?: string, failedAttempts?: number, remainingAttempts?: number) {
    super(message)
    this.name = 'LoginError'
    this.lockedUntil = lockedUntil
    this.failedAttempts = failedAttempts
    this.remainingAttempts = remainingAttempts
  }
}

export type AuthValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (newPassword: string, currentPassword?: string) => Promise<boolean>
}

export const AuthContext = createContext<AuthValue | null>(null)
