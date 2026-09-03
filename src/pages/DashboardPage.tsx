import { useState } from 'react'
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  History,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components'
import { TrackSelector } from '../components/TrackSelector'
import { useStudyApp } from '../hooks/useStudyApp'
import { OFFICIAL_EXAMS } from '../utils/quiz'
import { formatDate, formatPercent } from './pageHelpers'

const classificationCopy = {
  'needs-study': {
    title: 'Hora de reforçar a base',
    description: 'Comece pelos fundamentos e pratique em sessões curtas e frequentes.',
    tone: 'danger',
  },
  attention: {
    title: 'Você está ganhando ritmo',
    description: 'Revise os assuntos com mais erros antes do próximo simulado.',
    tone: 'warning',
  },
  good: {
    title: 'Bom progresso',
    description: 'Você construiu uma base consistente. Continue praticando os pontos fracos.',
    tone: 'info',
  },
  'very-good': {
    title: 'Desempenho muito bom',
    description: 'Sua preparação está sólida. Use o treino de erros para lapidar o resultado.',
    tone: 'success',
  },
  excellent: {
    title: 'Excelente consistência',
    description: 'Mantenha o ritmo e faça revisões espaçadas para consolidar o conteúdo.',
    tone: 'success',
  },
} as const

export function DashboardPage() {
  const {
    statistics,
    history,
    draft,
    draftTrackInfo,
    continueDraft,
    discardQuiz,
    favorites,
    questions,
    classification,
    activeTrack,
    activeTrackInfo,
    startQuiz,
  } = useStudyApp()
  const navigate = useNavigate()
  const [discardOpen, setDiscardOpen] = useState(false)
  const [examError, setExamError] = useState('')
  const performance = classificationCopy[classification.key]
  const latest = history.at(0)
  const hasHistory = history.length > 0

  const trackOfficialExams = OFFICIAL_EXAMS.filter((exam) => exam.track === activeTrack)

  function handleStartOfficialExam(examId: string, durationMinutes: number) {
    setExamError('')
    const outcome = startQuiz({
      mode: 'exam',
      examId,
      questionCount: 40,
      topics: [],
      timerMode: 'exam',
      durationMinutes,
      shuffleOptions: true,
    })
    if (outcome.ok) {
      navigate('/quiz')
    } else {
      setExamError(outcome.message)
    }
  }

  function handleContinue() {
    continueDraft()
    navigate('/quiz')
  }

  function handleConfirmDiscard() {
    discardQuiz()
    setDiscardOpen(false)
  }

  return (
    <main className="page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">{activeTrackInfo.code}</span>
          <h1>{activeTrackInfo.shortTitle}</h1>
          <p>{activeTrackInfo.subtitle}</p>
        </div>
        <Link className="button button--primary desktop-cta" to="/new">
          <Play size={18} fill="currentColor" /> Novo simulado
        </Link>
      </header>

      {/* Seletor de Trilha de Certificação */}
      <TrackSelector />

      {draft && (
        <section className="resume-banner" aria-label="Simulado em andamento">
          <div className="resume-banner__icon"><Clock3 size={22} /></div>
          <div className="resume-banner__copy">
            <strong>Você tem um simulado em andamento ({draftTrackInfo.code} · {draftTrackInfo.shortTitle})</strong>
            <span>
              {Object.values(draft.answers).filter((answer) => answer !== null).length} de{' '}
              {draft.questions.length} questões respondidas
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => setDiscardOpen(true)}
              style={{ color: 'var(--color-text-subtle)' }}
            >
              <Trash2 size={15} /> Descartar
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleContinue}
            >
              Continuar <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={discardOpen}
        title="Descartar simulado em andamento?"
        description={`O progresso de ${draft ? Object.values(draft.answers).filter((a) => a !== null).length : 0} questões respondidas será perdido.`}
        cancelLabel="Voltar"
        confirmLabel="Sim, descartar"
        confirmVariant="danger"
        onClose={() => setDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
      />

      {/* Simulados Oficiais Pré-Configurados da Trilha */}
      {trackOfficialExams.length > 0 && (
        <section className="section-block" aria-labelledby="official-exams-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Padrão Oficial</span>
              <h2 id="official-exams-title">Simulados Oficiais — {activeTrackInfo.code}</h2>
            </div>
            <span className="bank-count">{activeTrackInfo.passingPercentage}% para aprovação (26/40)</span>
          </div>

          {examError && (
            <div className="inline-notice inline-notice--warning" role="alert" style={{ marginBottom: '1rem' }}>
              <CircleAlert size={18} />
              <span>{examError}</span>
            </div>
          )}

          <div className="official-exams-grid">
            {trackOfficialExams.map((exam) => (
              <article key={exam.id} className="official-exam-card">
                <div>
                  <div className="official-exam-card__header">
                    <div>
                      <h3 className="official-exam-card__title">{exam.title}</h3>
                      <span className="exam-badge-tag">{exam.badge}</span>
                    </div>
                    <Award size={24} style={{ color: activeTrackInfo.accentColor }} />
                  </div>
                  <p className="official-exam-card__desc">{exam.description}</p>
                </div>

                <div className="official-exam-card__footer">
                  <div className="track-card__meta">
                    <span><BookOpenCheck size={14} /> 40 questões</span>
                    <span>·</span>
                    <span><Clock3 size={14} /> {exam.durationMinutes} min</span>
                  </div>
                  <button
                    type="button"
                    className="button button--primary button--sm"
                    onClick={() => handleStartOfficialExam(exam.id, exam.durationMinutes)}
                  >
                    Iniciar <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={`performance-hero performance-hero--${performance.tone}`}>
        <div className="performance-hero__content">
          <div className="performance-hero__label"><Sparkles size={16} /> Desempenho em {activeTrackInfo.code}</div>
          <h2>{hasHistory ? performance.title : 'Seu ponto de partida'}</h2>
          <p>
            {hasHistory
              ? performance.description
              : `Faça seu primeiro simulado de ${activeTrackInfo.shortTitle} para desbloquear métricas e recomendações.`}
          </p>
          <span className="indicator-note">Indicador de estudo — não representa regra oficial do exame.</span>
        </div>
        <div className="score-orbit" aria-label={`Taxa geral: ${formatPercent(statistics.overallAccuracy)}`}>
          <div className="score-orbit__inner">
            <strong>{hasHistory ? formatPercent(statistics.overallAccuracy, 0) : '—'}</strong>
            <span>taxa geral</span>
          </div>
        </div>
      </section>

      <section className="section-block" aria-labelledby="summary-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Resumo</span>
            <h2 id="summary-title">Sua preparação em {activeTrackInfo.code}</h2>
          </div>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--teal"><BookOpenCheck size={20} /></span>
            <span className="stat-card__label">Simulados realizados</span>
            <strong className="stat-card__value">{statistics.totalQuizzes}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--gold"><Trophy size={20} /></span>
            <span className="stat-card__label">Melhor resultado</span>
            <strong className="stat-card__value">
              {hasHistory ? formatPercent(statistics.bestPercentage) : '—'}
            </strong>
          </article>
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--blue"><Target size={20} /></span>
            <span className="stat-card__label">Média geral</span>
            <strong className="stat-card__value">
              {hasHistory ? formatPercent(statistics.averagePercentage) : '—'}
            </strong>
          </article>
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--violet"><Flame size={20} /></span>
            <span className="stat-card__label">Última nota</span>
            <strong className="stat-card__value">
              {hasHistory ? formatPercent(statistics.lastPercentage) : '—'}
            </strong>
          </article>
          <article className="stat-card stat-card--wide">
            <span className="stat-card__icon stat-card__icon--teal"><CheckCircle2 size={20} /></span>
            <span className="stat-card__label">Questões respondidas</span>
            <strong className="stat-card__value">{statistics.totalQuestionsAnswered}</strong>
            <small>{statistics.totalCorrectAnswers} acertos no total</small>
          </article>
        </div>
      </section>

      <section className="section-block" aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Praticar</span>
            <h2 id="quick-actions-title">Modos de Treino — {activeTrackInfo.code}</h2>
          </div>
          <span className="bank-count">{questions.length} questões disponíveis</span>
        </div>
        <div className="action-grid">
          <Link className="action-card action-card--primary" to="/new">
            <span className="action-card__icon"><BrainCircuit size={24} /></span>
            <div><strong>Novo simulado</strong><span>Personalizado ou por assunto</span></div>
            <ArrowRight size={20} />
          </Link>
          <Link className="action-card" to="/new?mode=errors">
            <span className="action-card__icon"><RotateCcw size={23} /></span>
            <div><strong>Treinar meus erros</strong><span>Reforce suas dúvidas em {activeTrackInfo.code}</span></div>
            <ArrowRight size={20} />
          </Link>
          <Link className="action-card" to="/new?mode=favorites">
            <span className="action-card__icon"><Star size={23} /></span>
            <div><strong>Estudar favoritas</strong><span>{favorites.length} salvas para revisar</span></div>
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="panel-card" aria-labelledby="weak-topics-title">
          <div className="panel-card__header">
            <div>
              <span className="eyebrow">Foco recomendado</span>
              <h2 id="weak-topics-title">Assuntos para revisar</h2>
            </div>
            <Link className="text-link" to="/performance">Ver análise <ArrowRight size={15} /></Link>
          </div>
          {statistics.weakTopics.length > 0 ? (
            <ol className="topic-list">
              {statistics.weakTopics.slice(0, 3).map((topic, index) => (
                <li key={topic.topic}>
                  <span className="topic-list__rank">{index + 1}</span>
                  <div className="topic-list__content">
                    <div><strong>{topic.topic}</strong><span>{topic.answered} respondidas</span></div>
                    <div className="meter"><span style={{ width: `${topic.percentage}%` }} /></div>
                  </div>
                  <strong className="topic-list__score">{formatPercent(topic.percentage)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className="compact-empty">
              <Target size={28} />
              <div><strong>Ainda sem dados suficientes</strong><span>Responda ao menos duas questões por assunto.</span></div>
            </div>
          )}
        </section>

        <section className="panel-card" aria-labelledby="recent-title">
          <div className="panel-card__header">
            <div>
              <span className="eyebrow">Atividade</span>
              <h2 id="recent-title">Último simulado</h2>
            </div>
            <Link className="text-link" to="/history">Histórico <ArrowRight size={15} /></Link>
          </div>
          {latest ? (
            <Link className="latest-attempt" to={`/result/${latest.id}`}>
              <span className="latest-attempt__icon"><History size={22} /></span>
              <div>
                <strong>{formatDate(latest.completedAt, true)}</strong>
                <span>{latest.correctAnswers} de {latest.totalQuestions} acertos</span>
              </div>
              <span className="latest-attempt__score">{formatPercent(latest.percentage)}</span>
            </Link>
          ) : (
            <div className="compact-empty">
              <History size={28} />
              <div><strong>Nenhum simulado concluído</strong><span>Seu histórico aparecerá aqui.</span></div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
