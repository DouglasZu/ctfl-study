import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  LogOut,
  PlusCircle,
  Settings,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export interface UserProfileMenuProps {
  compact?: boolean
  className?: string
}

export function UserProfileMenu({ compact = false, className = '' }: UserProfileMenuProps) {
  const { currentUser, isGuest, profiles, switchProfile, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function handleSwitch(userId: string) {
    switchProfile(userId)
    setOpen(false)
  }

  function handleLogout() {
    logout()
    setOpen(false)
  }

  return (
    <div className={`user-profile-menu-container ${className}`} ref={menuRef}>
      <button
        type="button"
        className={`user-profile-trigger ${compact ? 'user-profile-trigger--compact' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Menu de perfil: ${currentUser.name}`}
      >
        <span className="user-profile-trigger__avatar">{currentUser.avatar}</span>
        {!compact && (
          <div className="user-profile-trigger__info">
            <strong className="user-profile-trigger__name">{currentUser.name}</strong>
            <small className="user-profile-trigger__role">
              {isGuest ? 'Visitante (Offline)' : `@${currentUser.username}`}
            </small>
          </div>
        )}
        <ChevronDown size={15} className={`user-profile-trigger__arrow ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="user-profile-dropdown" role="dialog" aria-label="Opções de perfil">
          <div className="user-profile-dropdown__header">
            <span className="user-profile-dropdown__avatar">{currentUser.avatar}</span>
            <div>
              <strong className="user-profile-dropdown__name">{currentUser.name}</strong>
              <span className="user-profile-dropdown__username">
                {isGuest ? 'Modo Visitante / Convidado' : `@${currentUser.username}`}
              </span>
            </div>
          </div>

          {profiles.length > 0 && (
            <div className="user-profile-dropdown__section">
              <span className="user-profile-dropdown__section-title">Perfis neste dispositivo</span>
              <div className="user-profile-dropdown__list">
                {profiles.map((profile) => {
                  const isActive = profile.id === currentUser.id
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`profile-item ${isActive ? 'profile-item--active' : ''}`}
                      onClick={() => handleSwitch(profile.id)}
                    >
                      <span className="profile-item__avatar">{profile.avatar}</span>
                      <div className="profile-item__info">
                        <strong>{profile.name}</strong>
                        <small>@{profile.username}</small>
                      </div>
                      {isActive && <Check size={16} className="profile-item__check" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="user-profile-dropdown__actions">
            {isGuest ? (
              <Link
                to="/login"
                className="button button--primary button--sm button--full"
                onClick={() => setOpen(false)}
              >
                <UserPlus size={16} /> Criar Perfil ou Entrar
              </Link>
            ) : (
              <>
                <Link
                  to="/login?mode=register"
                  className="dropdown-action-link"
                  onClick={() => setOpen(false)}
                >
                  <PlusCircle size={16} /> Adicionar outro perfil
                </Link>
                <Link
                  to="/settings"
                  className="dropdown-action-link"
                  onClick={() => setOpen(false)}
                >
                  <Settings size={16} /> Gerenciar perfil
                </Link>
                <button
                  type="button"
                  className="dropdown-action-link dropdown-action-link--danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Sair da conta
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
