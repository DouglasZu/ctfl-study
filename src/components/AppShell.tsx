import {
  BookOpenCheck,
  ChartNoAxesCombined,
  History,
  Home,
  PlusCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle, type Theme } from './ThemeToggle'
import { UserProfileMenu } from './UserProfileMenu'
import { cx } from './utils'

export interface AppNavigationItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  end?: boolean
}

const defaultNavigationItems: readonly AppNavigationItem[] = [
  { to: '/', label: 'Visão geral', shortLabel: 'Início', icon: Home, end: true },
  { to: '/new', label: 'Novo simulado', shortLabel: 'Simulado', icon: PlusCircle },
  { to: '/history', label: 'Histórico', icon: History },
  { to: '/performance', label: 'Desempenho', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings },
]

export interface AppShellProps {
  children: ReactNode
  navigationItems?: readonly AppNavigationItem[]
  brandName?: string
  brandSubtitle?: string
  theme?: Theme
  onThemeChange?: (theme: Theme) => void
  sidebarFooter?: ReactNode
}

function NavigationLink({ item, mobile = false }: { item: AppNavigationItem; mobile?: boolean }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(mobile ? 'bottom-nav__link' : 'sidebar-nav__link', isActive && 'is-active')
      }
    >
      <Icon size={mobile ? 21 : 19} strokeWidth={1.9} aria-hidden="true" />
      <span>{mobile ? (item.shortLabel ?? item.label) : item.label}</span>
    </NavLink>
  )
}

export function AppShell({
  children,
  navigationItems = defaultNavigationItems,
  brandName = 'CTFL Study',
  brandSubtitle = 'Sua jornada de estudos',
  theme,
  onThemeChange,
  sidebarFooter,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <aside className="sidebar" aria-label="Navegação principal">
        <NavLink to="/" className="app-brand" aria-label={`${brandName} — página inicial`}>
          <span className="app-brand__mark" aria-hidden="true">
            <BookOpenCheck size={24} strokeWidth={1.8} />
          </span>
          <span className="app-brand__copy">
            <strong>{brandName}</strong>
            <small>{brandSubtitle}</small>
          </span>
        </NavLink>

        {/* Menu do Perfil do Usuário na Sidebar */}
        <div className="sidebar-profile-box" style={{ padding: '0 0.5rem 0.75rem 0.5rem' }}>
          <UserProfileMenu />
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-nav__label">Menu</span>
          {navigationItems.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="sidebar__footer">
          {sidebarFooter}
          <ThemeToggle theme={theme} onChange={onThemeChange} showLabel />
          <p className="sidebar__disclaimer">Indicadores para estudo, não regras oficiais do exame.</p>
        </div>
      </aside>

      <div id="main-content" className="app-main" tabIndex={-1}>
        <header className="mobile-header" style={{ display: 'none' }}>
          <UserProfileMenu compact />
        </header>
        <div className="app-content">{children}</div>
      </div>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="bottom-nav__inner">
          {navigationItems.map((item) => (
            <NavigationLink key={item.to} item={item} mobile />
          ))}
        </div>
      </nav>
    </div>
  )
}
