import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { localDate } from '../../utils/date'
import { ScrollToTop } from './ScrollToTop'

type IconName = 'home' | 'edit' | 'logs' | 'project' | 'review' | 'settings' | 'guide' | 'users'

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4M4 20h16" /></>,
    logs: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    project: <><path d="M4 6.5h6l2 2h8v10H4z" /><path d="M4 9h16" /></>,
    review: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2M4.5 5.5 3 4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>,
    guide: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.9c-1 .7-1.5 1.2-1.5 2.6M12 17.5h.01" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 6.5a3 3 0 0 1 0 5.8M17 15a5 5 0 0 1 3.5 4.8" /></>,
  }
  return <span className="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg></span>
}

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
        <NavLink to="/app" end><NavIcon name="home" />홈</NavLink>
        <NavLink to={`/logs/${localDate()}`}><NavIcon name="edit" />오늘 일지</NavLink>
        <NavLink to="/logs" end><NavIcon name="logs" />모아보기</NavLink>
        <NavLink to="/projects"><NavIcon name="project" />프로젝트</NavLink>
        <NavLink to="/reviews"><NavIcon name="review" />회고</NavLink>
        <NavLink to="/settings"><NavIcon name="settings" />설정</NavLink>
        <NavLink to="/guide"><NavIcon name="guide" />사용 가이드</NavLink>
        {user?.role === 'ADMIN' && <NavLink to="/users"><NavIcon name="users" />사용자</NavLink>}
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
