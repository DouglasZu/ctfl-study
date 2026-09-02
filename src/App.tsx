import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, BookOpenCheck } from 'lucide-react'
import { Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components'
import { StudyAppProvider, useStudyApp } from './hooks/useStudyApp'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { NewQuizPage } from './pages/NewQuizPage'
import { PerformancePage } from './pages/PerformancePage'
import { QuizPage } from './pages/QuizPage'
import { ResultPage } from './pages/ResultPage'
import { ReviewPage } from './pages/ReviewPage'
import { SettingsPage } from './pages/SettingsPage'

function resolveTheme(preference: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function StandardLayout() {
  const { settings, setTheme, activeTrackInfo } = useStudyApp()
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(settings.theme))

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setResolvedTheme(resolveTheme(settings.theme))
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [settings.theme])

  return (
    <AppShell
      brandName="Simulados ISTQB"
      brandSubtitle={activeTrackInfo.shortTitle}
      theme={resolvedTheme}
      onThemeChange={setTheme}
      sidebarFooter={
        <div className="syllabus-pill">
          <BookOpenCheck size={16} />
          <span><small>Trilha Ativa</small><strong>{activeTrackInfo.code} · {activeTrackInfo.shortTitle}</strong></span>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  )
}

function NotFoundPage() {
  return (
    <main className="page centered-empty-page">
      <span className="empty-illustration">404</span>
      <h1>Página não encontrada</h1>
      <p>Este endereço não existe no CTFL Study.</p>
      <Link className="button button--primary" to="/">Voltar ao início <ArrowRight size={18} /></Link>
    </main>
  )
}

interface ErrorBoundaryState { failed: boolean }

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha não recuperável na interface:', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fatal-error-page">
        <span><AlertTriangle size={32} /></span>
        <h1>Não foi possível abrir esta tela</h1>
        <p>Seus dados locais continuam seguros. Recarregue a página para tentar novamente.</p>
        <button className="button button--primary" type="button" onClick={() => window.location.reload()}>Recarregar aplicação</button>
      </main>
    )
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <StudyAppProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<StandardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="new" element={<NewQuizPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="result/:resultId" element={<ResultPage />} />
            <Route path="result/:resultId/review" element={<ReviewPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="quiz" element={<QuizPage />} />
        </Routes>
      </StudyAppProvider>
    </AppErrorBoundary>
  )
}
