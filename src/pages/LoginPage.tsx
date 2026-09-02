import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  KeyRound,
  Lock,
  PlusCircle,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DEFAULT_AVATARS } from '../types'

export function LoginPage() {
  const { currentUser, profiles, login, register, switchProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : profiles.length > 0 ? 'profiles' : 'register'

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profiles'>(initialMode)
  
  // Login form
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regAvatar, setRegAvatar] = useState(DEFAULT_AVATARS[0] ?? '👨‍💻')
  const [migrateGuest, setMigrateGuest] = useState(true)

  // Pin prompt for switching profiles with password
  const [pinPromptUser, setPinPromptUser] = useState<string | null>(null)
  const [profilePin, setProfilePin] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await login(loginUsername, loginPassword)
      setSuccess('Login realizado com sucesso!')
      setTimeout(() => navigate('/'), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao realizar login.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await register(
        {
          name: regName,
          username: regUsername,
          password: regPassword || undefined,
          avatar: regAvatar,
        },
        migrateGuest,
      )
      setSuccess('Perfil criado com sucesso!')
      setTimeout(() => navigate('/'), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar perfil.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectProfile(userId: string) {
    const profile = profiles.find((p) => p.id === userId)
    if (!profile) return

    if (profile.passwordHash) {
      setPinPromptUser(profile.id)
      setProfilePin('')
      setError('')
      return
    }

    switchProfile(userId)
    navigate('/')
  }

  async function handleUnlockProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!pinPromptUser) return
    const profile = profiles.find((p) => p.id === pinPromptUser)
    if (!profile) return

    setError('')
    setLoading(true)
    try {
      await login(profile.username, profilePin)
      setPinPromptUser(null)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senha incorreta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page auth-page">
      <header className="auth-header">
        <Link to="/" className="icon-button" aria-label="Voltar"><ArrowLeft size={20} /></Link>
        <div className="auth-brand">
          <BookOpenCheck size={32} className="auth-brand__icon" />
          <h1>Contas e Perfis de Estudo</h1>
          <p>Mantenha seu histórico, favoritas e estatísticas associados ao seu perfil exclusivo.</p>
        </div>
      </header>

      <div className="auth-container">
        {/* Navegação entre Abas */}
        <div className="auth-tabs" role="tablist">
          {profiles.length > 0 && (
            <button
              type="button"
              role="tab"
              className={`auth-tab ${activeTab === 'profiles' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('profiles'); setError(''); }}
            >
              <Users size={16} /> Perfis Salvos ({profiles.length})
            </button>
          )}
          <button
            type="button"
            role="tab"
            className={`auth-tab ${activeTab === 'register' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            <UserPlus size={16} /> Criar Perfil
          </button>
          <button
            type="button"
            role="tab"
            className={`auth-tab ${activeTab === 'login' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            <KeyRound size={16} /> Entrar com Usuário
          </button>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <div className="inline-notice inline-notice--success" role="status"><CheckCircle2 size={18} /> {success}</div>}

        {/* Aba 1: Perfis Salvos no Dispositivo */}
        {activeTab === 'profiles' && (
          <div className="auth-card">
            <h2>Selecione quem vai estudar agora</h2>
            <p className="auth-card__subtitle">Escolha um dos perfis salvos neste dispositivo para continuar de onde parou.</p>

            <div className="profile-selection-grid">
              {profiles.map((profile) => {
                const isCurrent = profile.id === currentUser.id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`profile-card-btn ${isCurrent ? 'profile-card-btn--current' : ''}`}
                    onClick={() => handleSelectProfile(profile.id)}
                  >
                    <span className="profile-card-btn__avatar">{profile.avatar}</span>
                    <div className="profile-card-btn__info">
                      <strong>{profile.name}</strong>
                      <span>@{profile.username}</span>
                    </div>
                    {profile.passwordHash && (
                      <span title="Protegido por senha">
                        <Lock size={15} className="profile-card-btn__lock" />
                      </span>
                    )}
                    {isCurrent && <span className="profile-card-btn__badge">Ativo</span>}
                  </button>
                )
              })}
            </div>

            {pinPromptUser && (
              <form onSubmit={handleUnlockProfile} className="pin-prompt-box">
                <h3><Lock size={18} /> Perfil protegido por senha</h3>
                <p>Digite a senha para acessar este perfil:</p>
                <input
                  type="password"
                  value={profilePin}
                  onChange={(e) => setProfilePin(e.target.value)}
                  placeholder="Sua senha..."
                  autoFocus
                  required
                />
                <div className="pin-prompt-box__actions">
                  <button type="button" className="button button--ghost button--sm" onClick={() => setPinPromptUser(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="button button--primary button--sm" disabled={loading}>
                    Entrar <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            <div className="auth-footer-links">
              <button type="button" className="text-link" onClick={() => setActiveTab('register')}>
                <PlusCircle size={15} /> Criar um novo perfil
              </button>
              <span>·</span>
              <Link to="/" className="text-link">Continuar como visitante</Link>
            </div>
          </div>
        )}

        {/* Aba 2: Criar Perfil */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="auth-card">
            <h2>Criar Novo Perfil</h2>
            <p className="auth-card__subtitle">Crie um perfil para salvar seu progresso, histórico e questões favoritas separadamente.</p>

            {/* Seletor de Avatar */}
            <div className="avatar-picker-section">
              <label className="field-label"><span>Escolha seu Avatar</span></label>
              <div className="avatar-grid">
                {DEFAULT_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    className={`avatar-choice-btn ${regAvatar === avatar ? 'is-selected' : ''}`}
                    onClick={() => setRegAvatar(avatar)}
                  >
                    <span>{avatar}</span>
                    {regAvatar === avatar && <Check size={12} className="avatar-choice-btn__check" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">
                <span>Nome de Exibição</span>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex.: Douglas Santos"
                  required
                />
              </label>
            </div>

            <div className="form-group">
              <label className="field-label">
                <span>Nome de Usuário (@identificador)</span>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  placeholder="Ex.: douglas"
                  required
                />
              </label>
            </div>

            <div className="form-group">
              <label className="field-label">
                <span>Senha ou PIN (Opcional)</span>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Deixe em branco se não desejar senha"
                />
              </label>
            </div>

            <label className="switch-row" style={{ marginTop: '0.5rem' }}>
              <span className="switch-row__icon"><Sparkles size={18} /></span>
              <span>
                <strong>Importar progresso atual do dispositivo</strong>
                <small>Copia o histórico e favoritas anônimas existentes para o seu novo perfil.</small>
              </span>
              <input
                type="checkbox"
                checked={migrateGuest}
                onChange={(e) => setMigrateGuest(e.target.checked)}
              />
              <span className="switch" aria-hidden="true" />
            </label>

            <button type="submit" className="button button--primary button--large button--full" disabled={loading} style={{ marginTop: '1.25rem' }}>
              <UserPlus size={18} /> Criar e Entrar no Perfil
            </button>

            <div className="auth-footer-links">
              <button type="button" className="text-link" onClick={() => setActiveTab('login')}>
                Já tem uma conta? Entrar
              </button>
              <span>·</span>
              <Link to="/" className="text-link">Continuar como visitante</Link>
            </div>
          </form>
        )}

        {/* Aba 3: Entrar com Usuário */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="auth-card">
            <h2>Entrar na Conta</h2>
            <p className="auth-card__subtitle">Acesse seu perfil já cadastrado neste dispositivo.</p>

            <div className="form-group">
              <label className="field-label">
                <span>Nome de Usuário</span>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Seu @usuário..."
                  required
                  autoFocus
                />
              </label>
            </div>

            <div className="form-group">
              <label className="field-label">
                <span>Senha</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Senha (se configurada)..."
                />
              </label>
            </div>

            <button type="submit" className="button button--primary button--large button--full" disabled={loading} style={{ marginTop: '1rem' }}>
              <KeyRound size={18} /> Entrar no Perfil
            </button>

            <div className="auth-footer-links">
              <button type="button" className="text-link" onClick={() => setActiveTab('register')}>
                Não tem perfil? Criar agora
              </button>
              <span>·</span>
              <Link to="/" className="text-link">Continuar como visitante</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
