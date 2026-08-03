import { useContext } from 'react'
import { AuthContext } from './context'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider가 필요합니다.')
  return value
}
