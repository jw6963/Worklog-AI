import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import { AppShell } from './components/layout/AppShell'
import './App.css'

const HomePage = lazy(() => import('./pages/home/HomePage').then((module) => ({ default: module.HomePage })))
const DailyLogPage = lazy(() => import('./pages/logs/DailyLogPage').then((module) => ({ default: module.DailyLogPage })))
const LogsPage = lazy(() => import('./pages/logs/LogsPage').then((module) => ({ default: module.LogsPage })))
const ReviewsPage = lazy(() => import('./pages/reviews/ReviewsPage').then((module) => ({ default: module.ReviewsPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const LandingPage = lazy(() => import('./pages/auth/LandingPage').then((module) => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })))
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })))
const GuidePage = lazy(() => import('./pages/guide/GuidePage').then((module) => ({ default: module.GuidePage })))

function App() {
  return <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<div className="page-loading">화면을 불러오는 중...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route element={<AppShell />}>
              <Route path="app" element={<HomePage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="logs/:date" element={<DailyLogPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route element={<AdminRoute />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
}

export default App
