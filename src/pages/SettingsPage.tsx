import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Check,
  CloudDownload,
  Database,
  Download,
  FileCheck2,
  HardDriveDownload,
  Laptop,
  LogOut,
  Moon,
  Palette,
  Save,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackSelector } from '../components/TrackSelector'
import { CERTIFICATION_TRACKS, DEFAULT_AVATARS, type AppSettings, type Theme } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useStudyApp } from '../hooks/useStudyApp'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const themeOptions: Array<{ value: Theme; title: string; description: string; icon: typeof Sun }> = [
  { value: 'light', title: 'Claro', description: 'Interface clara e suave', icon: Sun },
  { value: 'dark', title: 'Escuro', description: 'Confortável à noite', icon: Moon },
  { value: 'system', title: 'Do sistema', description: 'Acompanha seu aparelho', icon: Laptop },
]

type Notice = { tone: 'success' | 'error'; message: string } | null

export function SettingsPage() {
  const { currentUser, isGuest, updateProfile, logout } = useAuth()
  const {
    settings,
    allQuestions,
    questionBankIssues,
    draft,
    setTheme,
    updateSettings,
    exportBackup,
    importBackup,
    clearAllData,
    discardQuiz,
  } = useStudyApp()
  const [preferences, setPreferences] = useState(settings)
  const [profileName, setProfileName] = useState(currentUser.name)
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar)
  const [editingProfile, setEditingProfile] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => setPreferences(settings), [settings])
  useEffect(() => {
    setProfileName(currentUser.name)
    setProfileAvatar(currentUser.avatar)
  }, [currentUser])

  function handleSaveProfile() {
    try {
      updateProfile({ name: profileName, avatar: profileAvatar })
      setEditingProfile(false)
      setNotice({ tone: 'success', message: 'Perfil atualizado com sucesso.' })
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Erro ao atualizar perfil.' })
    }
  }

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const markInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  function changePreference<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  function savePreferences() {
    try {
      updateSettings({
        defaultQuestionCount: preferences.defaultQuestionCount,
        shuffleOptions: preferences.shuffleOptions,
        defaultTimerMode: preferences.defaultTimerMode,
        examDurationMinutes: Math.max(1, Math.round(preferences.examDurationMinutes)),
        syllabusVersion: preferences.syllabusVersion.trim() || 'Configurável',
        minWeakTopicAnswers: Math.max(2, Math.round(preferences.minWeakTopicAnswers)),
      })
      setNotice({ tone: 'success', message: 'Preferências salvas neste dispositivo.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Não foi possível salvar as preferências.' })
    }
  }

  function downloadBackup() {
    const content = exportBackup()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ctfl-study-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'success', message: 'Backup exportado com histórico, métricas, favoritas e preferências.' })
  }

  async function chooseImport(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      setPendingImport(text)
    } catch {
      setNotice({ tone: 'error', message: 'Não foi possível ler o arquivo selecionado.' })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function confirmImport() {
    if (pendingImport === null) return
    try {
      importBackup(pendingImport)
      setPendingImport(null)
      setNotice({ tone: 'success', message: 'Backup importado e validado com sucesso.' })
    } catch (error) {
      setPendingImport(null)
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'O arquivo de backup é inválido.' })
    }
  }

  function confirmClear() {
    clearAllData()
    setClearOpen(false)
    setNotice({ tone: 'success', message: 'Todos os dados locais deste perfil foram removidos.' })
  }

  function confirmDiscard() {
    discardQuiz()
    setDiscardOpen(false)
    setNotice({ tone: 'success', message: 'O simulado em andamento foi descartado.' })
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setNotice({ tone: 'success', message: 'Instalação iniciada no seu dispositivo.' })
    setInstallPrompt(null)
  }

  return (
    <main className="page settings-page">
      <header className="page-heading">
        <div><span className="eyebrow">Personalização e dados</span><h1>Configurações</h1><p>Ajuste sua experiência e cuide dos dados salvos neste dispositivo.</p></div>
      </header>

      {/* Seletor de Trilha de Certificação */}
      <TrackSelector />

      {notice && (
        <div className={`toast-notice toast-notice--${notice.tone}`} role="status">
          {notice.tone === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={17} /></button>
        </div>
      )}

      <div className="settings-stack">
        {/* Card de Perfil de Usuário */}
        <section className="settings-card" aria-labelledby="profile-title">
          <header className="settings-card__header">
            <span><User size={21} /></span>
            <div><h2 id="profile-title">Perfil de Usuário Ativo</h2><p>Gerencie o perfil e a conta vinculada aos seus estudos.</p></div>
          </header>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-surface-muted)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span style={{ fontSize: '2.25rem', width: '3.25rem', height: '3.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: 'var(--color-primary-subtle)' }}>
                {currentUser.avatar}
              </span>
              <div>
                <strong style={{ fontSize: '1.125rem', display: 'block' }}>{currentUser.name}</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                  {isGuest ? 'Visitante (offline, sem conta vinculada)' : `@${currentUser.username}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isGuest && (
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => setEditingProfile(!editingProfile)}
                >
                  {editingProfile ? 'Cancelar Edição' : 'Editar Perfil'}
                </button>
              )}
              <Link to="/login" className="button button--primary button--sm">
                <Users size={15} /> Trocar / Criar Conta
              </Link>
              {!isGuest && (
                <button
                  type="button"
                  className="button button--ghost button--sm text-danger"
                  onClick={logout}
                >
                  <LogOut size={15} /> Sair
                </button>
              )}
            </div>
          </div>

          {editingProfile && !isGuest && (
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div className="avatar-picker-section">
                <label className="field-label"><span>Escolha seu Avatar</span></label>
                <div className="avatar-grid">
                  {DEFAULT_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      className={`avatar-choice-btn ${profileAvatar === avatar ? 'is-selected' : ''}`}
                      onClick={() => setProfileAvatar(avatar)}
                    >
                      <span>{avatar}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="field-label" style={{ marginTop: '0.75rem' }}>
                <span>Nome de Exibição</span>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Seu nome"
                />
              </label>

              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="button button--ghost button--sm" onClick={() => setEditingProfile(false)}>
                  Cancelar
                </button>
                <button type="button" className="button button--primary button--sm" onClick={handleSaveProfile}>
                  <Save size={15} /> Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {isGuest && (
            <div className="inline-notice inline-notice--warning" style={{ marginTop: '0.75rem' }}>
              <AlertTriangle size={18} />
              <span>
                Você está estudando como Convidado. Crie um perfil com nome e avatar para manter seus dados seguros e identificados.
              </span>
            </div>
          )}
        </section>

        <section className="settings-card" aria-labelledby="appearance-title">
          <header className="settings-card__header"><span><Palette size={21} /></span><div><h2 id="appearance-title">Aparência</h2><p>Escolha o tema mais confortável para estudar.</p></div></header>
          <div className="theme-choice-grid">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const active = settings.theme === option.value
              return (
                <button className={`theme-choice${active ? ' theme-choice--active' : ''}`} type="button" key={option.value} onClick={() => setTheme(option.value)} aria-pressed={active}>
                  <span className="theme-choice__preview"><Icon size={22} /></span>
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <span className="theme-choice__check">{active && <Check size={14} />}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="settings-card" aria-labelledby="preferences-title">
          <header className="settings-card__header"><span><Save size={21} /></span><div><h2 id="preferences-title">Preferências de simulado</h2><p>Defina os valores iniciais ao criar uma sessão.</p></div></header>
          <div className="settings-form-grid">
            <label className="field-label"><span>Quantidade padrão</span><select value={preferences.defaultQuestionCount} onChange={(event) => changePreference('defaultQuestionCount', Number(event.target.value) as AppSettings['defaultQuestionCount'])}><option value={10}>10 questões</option><option value={20}>20 questões</option><option value={30}>30 questões</option><option value={40}>40 questões</option></select></label>
            <label className="field-label"><span>Ritmo padrão</span><select value={preferences.defaultTimerMode} onChange={(event) => changePreference('defaultTimerMode', event.target.value as AppSettings['defaultTimerMode'])}><option value="free">Modo livre</option><option value="exam">Modo prova</option></select></label>
            <label className="field-label"><span>Tempo do modo prova</span><div className="input-suffix"><input type="number" min={1} max={1440} value={preferences.examDurationMinutes} onChange={(event) => changePreference('examDurationMinutes', Number(event.target.value))} /><span>min</span></div></label>
            <label className="field-label"><span>Amostra mínima para ponto fraco</span><div className="input-suffix"><input type="number" min={2} max={100} value={preferences.minWeakTopicAnswers} onChange={(event) => changePreference('minWeakTopicAnswers', Number(event.target.value))} /><span>respostas</span></div></label>
            <label className="field-label field-label--wide"><span>Versão do syllabus</span><input type="text" maxLength={60} value={preferences.syllabusVersion} onChange={(event) => changePreference('syllabusVersion', event.target.value)} placeholder="Ex.: CTFL v4.0" /></label>
            <label className="switch-row field-label--wide"><span><strong>Embaralhar alternativas por padrão</strong><small>A resposta correta continua vinculada à alternativa certa.</small></span><input type="checkbox" checked={preferences.shuffleOptions} onChange={(event) => changePreference('shuffleOptions', event.target.checked)} /><span className="switch" aria-hidden="true" /></label>
          </div>
          <div className="settings-card__actions"><button className="button button--primary" type="button" onClick={savePreferences}><Save size={17} /> Salvar preferências</button></div>
        </section>

        <section className="settings-card" aria-labelledby="content-title">
          <header className="settings-card__header"><span><FileCheck2 size={21} /></span><div><h2 id="content-title">Conteúdo e Bancos de Questões</h2><p>Status dos bancos de questões carregados no projeto.</p></div></header>
          <div className={`content-status${questionBankIssues.length ? ' content-status--error' : ''}`}>
            <span className="content-status__icon">{questionBankIssues.length ? <AlertTriangle size={23} /> : <Check size={23} />}</span>
            <div><strong>{questionBankIssues.length ? 'Banco com problemas de configuração' : 'Banco validado com sucesso'}</strong><span>{allQuestions.length} questões totais (160 no padrão ISTQB) · 4 trilhas</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {CERTIFICATION_TRACKS.map((t) => {
              const count = allQuestions.filter((q) => (q.track ?? 'CTFL') === t.id).length
              return (
                <div key={t.id} style={{ padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', background: 'var(--color-surface-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Award size={16} style={{ color: t.accentColor }} />
                    <strong style={{ fontSize: '0.8125rem' }}>{t.code}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{count} questões disponíveis</div>
                </div>
              )
            })}
          </div>
          {questionBankIssues.length > 0 && <ul className="validation-issues">{questionBankIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
          <p className="settings-help">Para adicionar conteúdo, edite <code>src/data/questions.json</code>. IDs duplicados, alternativas vazias e respostas fora do intervalo são rejeitados com segurança.</p>
        </section>

        <section className="settings-card" aria-labelledby="install-title">
          <header className="settings-card__header"><span><Smartphone size={21} /></span><div><h2 id="install-title">Aplicativo e uso offline</h2><p>Instale o CTFL Study para abrir como um app no celular.</p></div></header>
          <div className="install-row">
            <span className="install-row__icon"><CloudDownload size={25} /></span>
            <div><strong>{installed ? 'Aplicativo instalado' : 'Pronto para instalar'}</strong><span>{installed ? 'Você está usando a versão instalada.' : installPrompt ? 'O navegador liberou a instalação com um toque.' : 'No celular, use “Adicionar à tela de início” no menu do navegador.'}</span></div>
            {installPrompt && !installed && <button className="button button--secondary" type="button" onClick={installApp}><Download size={17} /> Instalar</button>}
          </div>
        </section>

        <section className="settings-card" aria-labelledby="data-title">
          <header className="settings-card__header"><span><Database size={21} /></span><div><h2 id="data-title">Dados e backup</h2><p>Exporte seus dados antes de trocar de navegador ou dispositivo.</p></div></header>
          <div className="data-actions-grid">
            <button className="data-action" type="button" onClick={downloadBackup}><span><HardDriveDownload size={22} /></span><div><strong>Exportar histórico</strong><small>Baixar backup completo em JSON</small></div><Download size={18} /></button>
            <button className="data-action" type="button" onClick={() => fileInput.current?.click()}><span><Upload size={22} /></span><div><strong>Importar histórico</strong><small>Restaurar um backup validado</small></div><Upload size={18} /></button>
            {draft && <button className="data-action data-action--warning" type="button" onClick={() => setDiscardOpen(true)}><span><Trash2 size={22} /></span><div><strong>Descartar simulado atual</strong><small>Remover apenas a sessão em andamento</small></div><Trash2 size={18} /></button>}
            <button className="data-action data-action--danger" type="button" onClick={() => setClearOpen(true)}><span><Trash2 size={22} /></span><div><strong>Limpar todos os dados</strong><small>Apagar histórico, favoritas e ajustes</small></div><Trash2 size={18} /></button>
          </div>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void chooseImport(event.target.files?.[0])} />
          <div className="local-data-note"><Database size={16} /><span>Seus dados ficam somente no armazenamento local deste navegador.</span></div>
        </section>
      </div>

      {pendingImport !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPendingImport(null)}><section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="import-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-card__close" type="button" onClick={() => setPendingImport(null)} aria-label="Fechar"><X size={20} /></button><span className="modal-card__icon"><Upload size={24} /></span><h2 id="import-title">Importar este backup?</h2><p>Os dados atuais serão substituídos somente depois que o arquivo passar pela validação.</p><div className="modal-card__actions"><button className="button button--ghost" type="button" onClick={() => setPendingImport(null)}>Cancelar</button><button className="button button--primary" type="button" onClick={confirmImport}>Validar e importar</button></div></section></div>
      )}
      {clearOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setClearOpen(false)}><section className="modal-card modal-card--danger" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-card__close" type="button" onClick={() => setClearOpen(false)} aria-label="Fechar"><X size={20} /></button><span className="modal-card__icon"><AlertTriangle size={24} /></span><h2 id="clear-title">Apagar todos os dados?</h2><p>Histórico, métricas, favoritas, configurações e o simulado atual serão removidos. Esta ação não pode ser desfeita.</p><div className="modal-card__actions"><button className="button button--ghost" type="button" onClick={() => setClearOpen(false)}>Cancelar</button><button className="button button--danger" type="button" onClick={confirmClear}>Sim, apagar tudo</button></div></section></div>
      )}
      {discardOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDiscardOpen(false)}><section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-card__close" type="button" onClick={() => setDiscardOpen(false)} aria-label="Fechar"><X size={20} /></button><span className="modal-card__icon"><Trash2 size={24} /></span><h2 id="discard-title">Descartar simulado?</h2><p>As respostas desta sessão em andamento serão removidas.</p><div className="modal-card__actions"><button className="button button--ghost" type="button" onClick={() => setDiscardOpen(false)}>Cancelar</button><button className="button button--danger" type="button" onClick={confirmDiscard}>Descartar sessão</button></div></section></div>
      )}
    </main>
  )
}
