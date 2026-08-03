import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { localDate } from '../../utils/date'
import { ScrollToTop } from './ScrollToTop'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/app">W<span>AI</span></NavLink>
      <nav aria-label="주 메뉴">
        <NavLink to="/app" end><span>⌂</span>홈</NavLink>
        <NavLink to={`/logs/${localDate()}`}><span>✎</span>오늘 일지</NavLink>
        <NavLink to="/logs" end><span>▤</span>모아보기</NavLink>
        <NavLink to="/projects"><span>◆</span>프로젝트</NavLink>
        <NavLink to="/reviews"><span>◷</span>회고</NavLink>
        <NavLink to="/settings"><span>⚙</span>설정</NavLink>
        {user?.role === 'ADMIN' && <NavLink to="/users"><span>♙</span>사용자</NavLink>}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="avatar">{user?.displayName.slice(0, 1) ?? 'W'}</div>
          <div><strong>{user?.displayName}</strong><span>{user?.username}</span></div>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>로그아웃</button>
      </div>
    </aside>
    <div className="app-content"><Outlet /></div>
    <ScrollToTop />
  </div>
}
