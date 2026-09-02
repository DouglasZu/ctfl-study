import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock3,
  Focus,
  Layers3,
  ListChecks,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  TimerOff,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../components'
import { TrackSelector } from '../components/TrackSelector'
import type { QuizMode, TimerMode } from '../types'
import { useStudyApp } from '../hooks/useStudyApp'
import { OFFICIAL_EXAMS } from '../utils/quiz'

const quantities = [10, 20, 30, 40] as const

const modes: Array<{
  id: QuizMode
  title: string
  description: string
  icon: typeof Layers3
}> = [
  { id: 'exam', title: 'Simulado Oficial (Padrão Exame)', description: '40 questões no tempo e regras oficiais', icon: Award },
  { id: 'complete', title: 'Treino Personalizado', description: 'Escolha quantidade e ritmo livremente', icon: Layers3 },
  { id: 'topics', title: 'Por Assunto / Capítulo', description: 'Pratique capítulos específicos', icon: Focus },
  { id: 'errors', title: 'Treinar meus erros', description: 'Prioriza suas dificuldades nesta trilha', icon: RotateCcw },
  { id: 'favorites', title: 'Estudar favoritas', description: 'Use as questões que você salvou', icon: Star },
]

export function NewQuizPage() {
  const { questions, history, favorites, settings, draft, startQuiz, activeTrack, activeTrackInfo } = useStudyApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedMode = searchParams.get('mode')
  const initialMode: QuizMode = modes.some((mode) => mode.id === requestedMode)
    ? (requestedMode as QuizMode)
    : 'exam'

  const trackOfficialExams = useMemo(
    () => OFFICIAL_EXAMS.filter((exam) => exam.track === activeTrack),
    [activeTrack],
  )

  const [mode, setMode] = useState<QuizMode>(initialMode)
  const [selectedExamId, setSelectedExamId] = useState<string>(() => trackOfficialExams[0]?.id || '')
  const [questionCount, setQuestionCount] = useState(settings.defaultQuestionCount)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [timerMode, setTimerMode] = useState<TimerMode>(settings.defaultTimerMode)
  const [durationMinutes, setDurationMinutes] = useState(activeTrackInfo.durationMinutes)
  const [shuffleOptions, setShuffleOptions] = useState(settings.shuffleOptions)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (requestedMode && modes.some((m) => m.id === requestedMode)) {
      setMode(requestedMode as QuizMode)
    }
  }, [requestedMode])

  useEffect(() => {
    const firstExam = trackOfficialExams[0]
    if (firstExam && !trackOfficialExams.some((e) => e.id === selectedExamId)) {
      setSelectedExamId(firstExam.id)
    }
    setDurationMinutes(activeTrackInfo.durationMinutes)
  }, [activeTrack, trackOfficialExams, selectedExamId, activeTrackInfo.durationMinutes])

  useEffect(() => {
    if (mode === 'exam') {
      setQuestionCount(40)
      setTimerMode('exam')
      setDurationMinutes(activeTrackInfo.durationMinutes)
    }
  }, [mode, activeTrackInfo.durationMinutes])

  const topics = useMemo(() => {
    const unique = new Map<string, { topic: string; chapter: string; count: number }>()
    questions.forEach((question) => {
      const existing = unique.get(question.topic)
      unique.set(question.topic, {
        topic: question.topic,
        chapter: question.chapter,
        count: (existing?.count ?? 0) + 1,
      })
    })
    return [...unique.values()].sort((a, b) =>
      a.chapter.localeCompare(b.chapter, 'pt-BR', { numeric: true }) || a.topic.localeCompare(b.topic, 'pt-BR'),
    )
  }, [questions])

  const errorIds = useMemo(() => {
    const ids = new Set<string>()
    history.forEach((result) => result.questionResults.forEach((item) => {
      if (!item.isCorrect && item.answered) ids.add(String(item.questionId))
    }))
    return ids
  }, [history])

  const errorQuestionCount = useMemo(
    () => questions.filter((question) => errorIds.has(String(question.id))).length,
    [errorIds, questions],
  )

  const availableCount = useMemo(() => {
    let pool = questions
    if (mode === 'topics' && selectedTopics.length > 0) {
      pool = pool.filter((question) => selectedTopics.includes(question.topic))
    }
    if (mode === 'errors') return errorQuestionCount > 0 ? questions.length : 0
    if (mode === 'favorites') pool = pool.filter((question) => favorites.some((id) => String(id) === String(question.id)))
    return pool.length
  }, [errorQuestionCount, favorites, mode, questions, selectedTopics])

  function toggleTopic(topic: string) {
    setSelectedTopics((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic],
    )
  }

  function launchQuiz() {
    setError('')
    const result = startQuiz({
      mode,
      examId: mode === 'exam' ? selectedExamId : undefined,
      questionCount: mode === 'exam' ? 40 : questionCount,
      topics: mode === 'topics' ? selectedTopics : [],
      timerMode: mode === 'exam' ? 'exam' : timerMode,
      durationMinutes: (timerMode === 'exam' || mode === 'exam') ? durationMinutes : undefined,
      shuffleOptions,
    })

    if (!result.ok) {
      setError(result.message)
      setReplaceOpen(false)
      return
    }

    navigate('/quiz')
  }

  function requestLaunch() {
    if (draft) setReplaceOpen(true)
    else launchQuiz()
  }

  const noModeQuestions = availableCount === 0 && (mode === 'errors' || mode === 'favorites')

  return (
    <main className="page setup-page">
      <header className="page-heading page-heading--with-back">
        <Link className="icon-button" to="/" aria-label="Voltar ao início"><ArrowLeft size={20} /></Link>
        <div>
          <span className="eyebrow">{activeTrackInfo.code} — Sessão de Estudo</span>
          <h1>Novo simulado</h1>
          <p>Configure seu treino para a certificação {activeTrackInfo.shortTitle}.</p>
        </div>
      </header>

      {/* Seletor de Certificação */}
      <TrackSelector compact showDescription={false} />

      <div className="setup-layout">
        <div className="setup-main">
          <section className="setup-section" aria-labelledby="mode-title">
            <div className="setup-section__number">1</div>
            <div className="setup-section__body">
              <div className="setup-section__heading">
                <div><h2 id="mode-title">Como você quer praticar?</h2><p>Escolha o formato desta sessão para {activeTrackInfo.code}.</p></div>
              </div>
              <div className="mode-grid">
                {modes.map((item) => {
                  const Icon = item.icon
                  const selected = mode === item.id
                  return (
                    <button
                      className={`mode-card${selected ? ' mode-card--selected' : ''}`}
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMode(item.id)}
                    >
                      <span className="mode-card__icon"><Icon size={22} /></span>
                      <span><strong>{item.title}</strong><small>{item.description}</small></span>
                      <span className="mode-card__check">{selected && <Check size={15} />}</span>
                    </button>
                  )
                })}
              </div>
              {noModeQuestions && (
                <div className="inline-notice inline-notice--warning">
                  {mode === 'errors' ? <RotateCcw size={18} /> : <Star size={18} />}
                  <span>
                    {mode === 'errors'
                      ? `Conclua algumas questões de ${activeTrackInfo.code} incorretamente para liberar este modo.`
                      : 'Marque questões como favoritas durante um simulado ou na revisão.'}
                  </span>
                </div>
              )}
              {questions.length === 0 && (
                <div className="inline-notice inline-notice--warning" role="alert">
                  <BookOpen size={18} />
                  <span>O banco não possui questões válidas para {activeTrackInfo.code}.</span>
                </div>
              )}
            </div>
          </section>

          {mode === 'exam' && trackOfficialExams.length > 0 && (
            <section className="setup-section" aria-labelledby="exam-select-title">
              <div className="setup-section__number">2</div>
              <div className="setup-section__body">
                <div className="setup-section__heading">
                  <div>
                    <h2 id="exam-select-title">Escolha o simulado oficial</h2>
                    <p>Simulados balanceados no padrão de 40 questões da prova.</p>
                  </div>
                </div>
                <div className="mode-grid">
                  {trackOfficialExams.map((exam) => {
                    const isSelected = selectedExamId === exam.id
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        className={`mode-card${isSelected ? ' mode-card--selected' : ''}`}
                        onClick={() => setSelectedExamId(exam.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="mode-card__icon"><Award size={22} /></span>
                        <span>
                          <strong>{exam.title}</strong>
                          <small>{exam.description}</small>
                          <span className="exam-badge-tag" style={{ marginTop: '0.25rem' }}>{exam.badge}</span>
                        </span>
                        <span className="mode-card__check">{isSelected && <Check size={15} />}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {mode === 'topics' && (
            <section className="setup-section" aria-labelledby="topics-title">
              <div className="setup-section__number">2</div>
              <div className="setup-section__body">
                <div className="setup-section__heading">
                  <div><h2 id="topics-title">Selecione os assuntos</h2><p>Sem seleção, todos os assuntos serão incluídos.</p></div>
                  {selectedTopics.length > 0 && (
                    <button className="text-button" type="button" onClick={() => setSelectedTopics([])}>Selecionar todos</button>
                  )}
                </div>
                <div className="topic-check-grid">
                  {topics.map((item) => {
                    const selected = selectedTopics.includes(item.topic)
                    return (
                      <label className={`topic-check${selected ? ' topic-check--selected' : ''}`} key={item.topic}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTopic(item.topic)}
                        />
                        <span className="custom-checkbox">{selected && <Check size={14} />}</span>
                        <span className="topic-check__copy">
                          <strong>{item.topic}</strong>
                          <small>Capítulo {item.chapter} · {item.count} questões</small>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {mode !== 'exam' && (
            <section className="setup-section" aria-labelledby="count-title">
              <div className="setup-section__number">{mode === 'topics' ? 3 : 2}</div>
              <div className="setup-section__body">
                <div className="setup-section__heading">
                  <div><h2 id="count-title">Quantidade de questões</h2><p>Se houver menos disponíveis, usaremos o total existente.</p></div>
                  <span className="availability"><BookOpen size={15} /> {availableCount} disponíveis</span>
                </div>
                <div className="quantity-control" role="group" aria-label="Quantidade de questões">
                  {quantities.map((quantity) => (
                    <button
                      type="button"
                      key={quantity}
                      className={questionCount === quantity ? 'is-selected' : ''}
                      aria-pressed={questionCount === quantity}
                      onClick={() => setQuestionCount(quantity)}
                    >
                      <strong>{quantity}</strong><span>questões</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="setup-section" aria-labelledby="timer-title">
            <div className="setup-section__number">{mode === 'topics' ? 4 : mode === 'exam' ? 3 : 3}</div>
            <div className="setup-section__body">
              <div className="setup-section__heading">
                <div><h2 id="timer-title">Ritmo do simulado</h2><p>Estude sem pressão ou pratique com limite de tempo.</p></div>
              </div>
              <div className="timer-options">
                <button
                  type="button"
                  className={`timer-option${timerMode === 'free' ? ' timer-option--selected' : ''}`}
                  onClick={() => setTimerMode('free')}
                  aria-pressed={timerMode === 'free'}
                >
                  <TimerOff size={21} /><span><strong>Modo livre</strong><small>Sem limite de tempo</small></span>
                  {timerMode === 'free' && <Check size={17} />}
                </button>
                <button
                  type="button"
                  className={`timer-option${timerMode === 'exam' ? ' timer-option--selected' : ''}`}
                  onClick={() => setTimerMode('exam')}
                  aria-pressed={timerMode === 'exam'}
                >
                  <Clock3 size={21} /><span><strong>Modo prova ({activeTrackInfo.durationMinutes} min)</strong><small>Com cronômetro regressivo</small></span>
                  {timerMode === 'exam' && <Check size={17} />}
                </button>
              </div>
              {timerMode === 'exam' && (
                <label className="duration-field">
                  <span>Tempo disponível</span>
                  <div><input min={1} max={1440} type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value)))} /><span>minutos</span></div>
                </label>
              )}
              <label className="switch-row">
                <span className="switch-row__icon"><Shuffle size={19} /></span>
                <span><strong>Embaralhar alternativas</strong><small>A posição da resposta correta é preservada com segurança.</small></span>
                <input type="checkbox" checked={shuffleOptions} onChange={(event) => setShuffleOptions(event.target.checked)} />
                <span className="switch" aria-hidden="true" />
              </label>
            </div>
          </section>
        </div>

        <aside className="setup-summary">
          <div className="setup-summary__icon"><Sparkles size={23} /></div>
          <span className="eyebrow">{activeTrackInfo.code}</span>
          <h2>Resumo da sessão</h2>
          <dl>
            <div><dt>Certificação</dt><dd>{activeTrackInfo.shortTitle}</dd></div>
            <div><dt>Formato</dt><dd>{modes.find((item) => item.id === mode)?.title}</dd></div>
            <div><dt>Questões</dt><dd>{mode === 'exam' ? 40 : Math.min(questionCount, availableCount)}</dd></div>
            <div><dt>Assuntos</dt><dd>{mode === 'topics' && selectedTopics.length ? selectedTopics.length : 'Todos'}</dd></div>
            <div><dt>Tempo</dt><dd>{timerMode === 'exam' ? `${durationMinutes} min` : 'Livre'}</dd></div>
          </dl>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button--primary button--large button--full" type="button" onClick={requestLaunch} disabled={noModeQuestions || questions.length === 0}>
            Começar agora <ArrowRight size={19} />
          </button>
          <p className="setup-summary__note"><ListChecks size={15} /> Você poderá navegar e revisar respostas antes de finalizar.</p>
        </aside>
      </div>

      <div className="mobile-start-bar">
        <div><span>{Math.min(questionCount, availableCount)} questões</span><strong>{timerMode === 'exam' ? `${durationMinutes} min` : 'Modo livre'}</strong></div>
        <button className="button button--primary" type="button" onClick={requestLaunch} disabled={noModeQuestions || questions.length === 0}>
          Começar <ArrowRight size={18} />
        </button>
      </div>

      <ConfirmDialog
        open={replaceOpen}
        title="Substituir simulado em andamento?"
        description="O progresso do simulado atual será descartado ao iniciar esta nova sessão."
        cancelLabel="Continuar o atual"
        confirmLabel="Descartar e começar"
        confirmVariant="danger"
        onClose={() => setReplaceOpen(false)}
        onConfirm={launchQuiz}
      />
    </main>
  )
}
