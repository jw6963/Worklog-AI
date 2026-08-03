import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loading">로그인 상태를 확인하는 중…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />
  if (!user.mustChangePassword && location.pathname === '/change-password') return <Navigate to="/app" replace />
  return <Outlet />
}
