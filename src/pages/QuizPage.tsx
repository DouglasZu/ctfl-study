import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Grid3X3,
  Home,
  ListChecks,
  Menu,
  Send,
  Star,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudyApp } from '../hooks/useStudyApp'
import { formatTimer, optionLetter } from './pageHelpers'

export function QuizPage() {
  const {
    draft,
    favorites,
    selectAnswer,
    setCurrentQuestion,
    toggleQuestionReview,
    toggleFavorite,
    finishQuiz,
  } = useStudyApp()
  const navigate = useNavigate()
  const [navigatorOpen, setNavigatorOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const autoFinished = useRef(false)

  const remainingSeconds = useMemo(() => {
    if (!draft || draft.timerMode !== 'exam' || !draft.durationMinutes) return null
    const endsAt = new Date(draft.startedAt).getTime() + draft.durationMinutes * 60_000
    return Math.max(0, Math.ceil((endsAt - now) / 1000))
  }, [draft, now])

  const completeAndNavigate = useCallback(() => {
    const result = finishQuiz()
    if (result) navigate(`/result/${result.id}`, { replace: true })
  }, [finishQuiz, navigate])

  useEffect(() => {
    if (!draft || draft.timerMode !== 'exam') return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [draft])

  useEffect(() => {
    if (remainingSeconds !== 0 || autoFinished.current || !draft) return
    autoFinished.current = true
    completeAndNavigate()
  }, [completeAndNavigate, draft, remainingSeconds])

  useEffect(() => {
    const preventAccidentalClose = (event: BeforeUnloadEvent) => {
      if (!draft) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', preventAccidentalClose)
    return () => window.removeEventListener('beforeunload', preventAccidentalClose)
  }, [draft])

  if (!draft || draft.questions.length === 0) {
    return (
      <main className="quiz-empty">
        <span className="quiz-empty__icon"><ListChecks size={34} /></span>
        <h1>Nenhum simulado em andamento</h1>
        <p>Prepare uma nova sessão para começar a responder.</p>
        <Link className="button button--primary" to="/new">Criar simulado <ArrowRight size={18} /></Link>
      </main>
    )
  }

  const currentIndex = Math.min(draft.currentIndex, draft.questions.length - 1)
  const currentQuestion = draft.questions[currentIndex]
  if (!currentQuestion) return null

  const totalQuestions = draft.questions.length
  const selectedAnswer = draft.answers[String(currentQuestion.id)] ?? null
  const answeredCount = Object.values(draft.answers).filter((answer) => answer !== null).length
  const unansweredCount = draft.questions.length - answeredCount
  const isReviewed = draft.reviewQuestionIds.some((id) => String(id) === String(currentQuestion.id))
  const isFavorite = favorites.some((id) => String(id) === String(currentQuestion.id))
  const progress = ((currentIndex + 1) / draft.questions.length) * 100
  const timerUrgent = remainingSeconds !== null && remainingSeconds <= 5 * 60

  function goToQuestion(index: number) {
    setCurrentQuestion(index)
    setNavigatorOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextQuestion() {
    if (currentIndex < totalQuestions - 1) goToQuestion(currentIndex + 1)
    else setFinishOpen(true)
  }

  return (
    <div className="quiz-shell">
      <header className="quiz-topbar">
        <button className="quiz-brand" type="button" onClick={() => setLeaveOpen(true)} aria-label="Voltar ao início">
          <span>CT</span><strong>CTFL Study</strong>
        </button>
        <div className="quiz-topbar__status">
          <span className="quiz-progress-label">Questão <strong>{currentIndex + 1}</strong> de {draft.questions.length}</span>
          {remainingSeconds !== null && (
            <span className={`quiz-timer${timerUrgent ? ' quiz-timer--urgent' : ''}`} aria-live={timerUrgent ? 'polite' : 'off'}>
              <Clock3 size={17} /> <span className="timer-label">Tempo restante</span> <strong>{formatTimer(remainingSeconds)}</strong>
            </span>
          )}
        </div>
        <button className="icon-button quiz-menu-button" type="button" onClick={() => setNavigatorOpen(true)} aria-label="Abrir navegador de questões">
          <Menu size={21} />
        </button>
      </header>
      <div className="quiz-progress-track"><span style={{ width: `${progress}%` }} /></div>

      <div className="quiz-layout">
        <main className="quiz-main">
          <div className="question-meta">
            {currentQuestion.track && (
              <span className="exam-badge-tag">{currentQuestion.track}</span>
            )}
            {currentQuestion.kLevel && (
              <span className={`k-level-badge k-level-badge--${currentQuestion.kLevel.toLowerCase()}`}>
                {currentQuestion.kLevel}
              </span>
            )}
            {currentQuestion.syllabusRef && (
              <span className="k-level-badge">{currentQuestion.syllabusRef}</span>
            )}
            <span>Capítulo {currentQuestion.chapter}</span>
            <span>{currentQuestion.topic}</span>
            <span className={`difficulty difficulty--${currentQuestion.difficulty}`}>
              {{ easy: 'Fácil', medium: 'Média', hard: 'Difícil' }[currentQuestion.difficulty]}
            </span>
          </div>

          <section className="question-card" aria-labelledby="question-title">
            <div className="question-card__heading">
              <span className="question-number">{String(currentIndex + 1).padStart(2, '0')}</span>
              <h1 id="question-title">{currentQuestion.question}</h1>
            </div>

            <fieldset className="answers-list">
              <legend className="sr-only">Escolha uma resposta</legend>
              {currentQuestion.options.map((option, index) => {
                const selected = selectedAnswer === index
                return (
                  <label className={`answer-option${selected ? ' answer-option--selected' : ''}`} key={`${currentQuestion.id}-${index}`}>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={index}
                      checked={selected}
                      onChange={() => selectAnswer(currentQuestion.id, index)}
                    />
                    <span className="answer-option__letter">{optionLetter(index)}</span>
                    <span className="answer-option__text">{option}</span>
                    <span className="answer-option__radio">{selected && <Check size={14} />}</span>
                  </label>
                )
              })}
            </fieldset>

            <div className="question-tools">
              <button className={`utility-button${isReviewed ? ' is-active' : ''}`} type="button" onClick={() => toggleQuestionReview(currentQuestion.id)} aria-pressed={isReviewed}>
                <Flag size={18} fill={isReviewed ? 'currentColor' : 'none'} /> {isReviewed ? 'Marcada para revisar' : 'Revisar depois'}
              </button>
              <button className={`utility-button${isFavorite ? ' is-active' : ''}`} type="button" onClick={() => toggleFavorite(currentQuestion.id)} aria-pressed={isFavorite}>
                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Favorita' : 'Adicionar às favoritas'}
              </button>
            </div>
          </section>

          <footer className="quiz-actions">
            <button className="button button--secondary" type="button" disabled={currentIndex === 0} onClick={() => goToQuestion(currentIndex - 1)}>
              <ChevronLeft size={19} /> Anterior
            </button>
            <button className="button button--primary" type="button" onClick={nextQuestion}>
              {currentIndex === draft.questions.length - 1 ? <><Send size={18} /> Revisar e finalizar</> : <>Próxima <ChevronRight size={19} /></>}
            </button>
          </footer>
        </main>

        <aside className={`question-navigator${navigatorOpen ? ' question-navigator--open' : ''}`} aria-label="Navegador de questões">
          <div className="question-navigator__header">
            <div><span className="eyebrow">Navegação</span><h2>Questões</h2></div>
            <button className="icon-button navigator-close" type="button" onClick={() => setNavigatorOpen(false)} aria-label="Fechar navegador"><X size={20} /></button>
          </div>
          <div className="question-navigator__summary">
            <div><strong>{answeredCount}</strong><span>Respondidas</span></div>
            <div><strong>{unansweredCount}</strong><span>Em branco</span></div>
            <div><strong>{draft.reviewQuestionIds.length}</strong><span>Para revisar</span></div>
          </div>
          <div className="question-grid">
            {draft.questions.map((question, index) => {
              const answered = draft.answers[String(question.id)] !== null && draft.answers[String(question.id)] !== undefined
              const review = draft.reviewQuestionIds.some((id) => String(id) === String(question.id))
              const current = index === currentIndex
              const classes = ['question-dot', answered && 'is-answered', review && 'is-review', current && 'is-current'].filter(Boolean).join(' ')
              return (
                <button className={classes} key={String(question.id)} type="button" onClick={() => goToQuestion(index)} aria-label={`Questão ${index + 1}${answered ? ', respondida' : ', não respondida'}${review ? ', marcada para revisar' : ''}`} aria-current={current ? 'step' : undefined}>
                  {index + 1}{review && <Flag size={9} fill="currentColor" />}
                </button>
              )
            })}
          </div>
          <div className="question-legend">
            <span><i className="legend-dot legend-dot--answered" /> Respondida</span>
            <span><i className="legend-dot" /> Não respondida</span>
            <span><i className="legend-dot legend-dot--review" /> Revisar</span>
          </div>
          <button className="button button--secondary button--full" type="button" onClick={() => setFinishOpen(true)}>
            <Send size={17} /> Finalizar simulado
          </button>
        </aside>
        {navigatorOpen && <button className="navigator-backdrop" type="button" onClick={() => setNavigatorOpen(false)} aria-label="Fechar navegador" />}
      </div>

      <button className="mobile-navigator-fab" type="button" onClick={() => setNavigatorOpen(true)}>
        <Grid3X3 size={18} /> <span>{answeredCount}/{draft.questions.length}</span>
      </button>

      {finishOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFinishOpen(false)}>
          <section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="finish-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-card__close" type="button" onClick={() => setFinishOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="modal-card__icon"><ListChecks size={25} /></span>
            <h2 id="finish-title">Finalizar simulado?</h2>
            <p>Você respondeu <strong>{answeredCount} de {draft.questions.length}</strong> questões.</p>
            {unansweredCount > 0 && <div className="inline-notice inline-notice--warning"><Bookmark size={18} /><span>Existem {unansweredCount} {unansweredCount === 1 ? 'questão sem resposta' : 'questões sem resposta'}.</span></div>}
            <div className="modal-card__actions">
              <button className="button button--ghost" type="button" onClick={() => setFinishOpen(false)}>Continuar revisando</button>
              <button className="button button--primary" type="button" onClick={completeAndNavigate}>Sim, finalizar</button>
            </div>
          </section>
        </div>
      )}

      {leaveOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLeaveOpen(false)}>
          <section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-card__close" type="button" onClick={() => setLeaveOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="modal-card__icon"><Home size={24} /></span>
            <h2 id="leave-title">Sair por enquanto?</h2>
            <p>Seu progresso já está salvo neste dispositivo. Você poderá continuar depois.</p>
            <div className="modal-card__actions">
              <button className="button button--ghost" type="button" onClick={() => setLeaveOpen(false)}>Permanecer</button>
              <button className="button button--primary" type="button" onClick={() => navigate('/')}>Salvar e sair</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
