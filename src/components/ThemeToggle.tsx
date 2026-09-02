import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from './utils'

export type Theme = 'light' | 'dark'

export interface ThemeToggleProps {
  theme?: Theme
  onChange?: (theme: Theme) => void
  showLabel?: boolean
  className?: string
}

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme
    if (current === 'light' || current === 'dark') return current
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

export function ThemeToggle({ theme, onChange, showLabel = false, className }: ThemeToggleProps) {
  const [internalTheme, setInternalTheme] = useState<Theme>(getInitialTheme)
  const activeTheme = theme ?? internalTheme
  const nextTheme = activeTheme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme
    document.documentElement.style.colorScheme = activeTheme
  }, [activeTheme])

  const toggleTheme = () => {
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme
    if (theme === undefined) setInternalTheme(nextTheme)
    onChange?.(nextTheme)
  }

  return (
    <button
      type="button"
      className={cx('theme-toggle', showLabel && 'theme-toggle--with-label', className)}
      onClick={toggleTheme}
      aria-label={nextTheme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro'}
      title={nextTheme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {activeTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </span>
      {showLabel ? (
        <span className="theme-toggle__label">
          <span>Tema</span>
          <strong>{activeTheme === 'dark' ? 'Escuro' : 'Claro'}</strong>
        </span>
      ) : null}
    </button>
  )
}
