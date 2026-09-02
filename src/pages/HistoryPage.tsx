import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileQuestion, History, RotateCcw, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { QuizMode } from '../types'
import { useStudyApp } from '../hooks/useStudyApp'
import { formatDate, formatDuration, formatPercent } from './pageHelpers'

const modeLabels: Record<QuizMode, string> = {
  complete: 'Simulado completo',
  topics: 'Por assunto',
  errors: 'Treino de erros',
  favorites: 'Questões favoritas',
}

export function HistoryPage() {
  const { history } = useStudyApp()

  return (
    <main className="page history-page">
      <header className="page-heading">
        <div><span className="eyebrow">Sua jornada</span><h1>Histórico de simulados</h1><p>Reveja tentativas e acompanhe a consistência dos seus estudos.</p></div>
        {history.length > 0 && <Link className="button button--primary desktop-cta" to="/new"><RotateCcw size={18} /> Novo simulado</Link>}
      </header>

      {history.length === 0 ? (
        <section className="large-empty-state">
          <span className="large-empty-state__icon"><History size={38} /></span>
          <h2>Seu histórico começa aqui</h2>
          <p>Ao concluir um simulado, o resultado e todos os detalhes ficarão salvos neste dispositivo.</p>
          <Link className="button button--primary" to="/new">Fazer primeiro simulado <ArrowRight size={18} /></Link>
        </section>
      ) : (
        <>
          <div className="history-overview">
            <span><History size={17} /><strong>{history.length}</strong> {history.length === 1 ? 'tentativa registrada' : 'tentativas registradas'}</span>
            <small>Mais recentes primeiro</small>
          </div>
          <div className="history-list">
            {history.map((result) => (
              <article className="history-card" key={result.id}>
                <div className="history-card__date">
                  <span><CalendarDays size={17} /></span>
                  <div><strong>{formatDate(result.completedAt)}</strong><small>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(result.completedAt))}</small></div>
                </div>
                <div className="history-card__main">
                  <div className="history-card__title"><span className="mode-badge">{modeLabels[result.mode]}</span><h2>{result.correctAnswers} de {result.totalQuestions} acertos</h2></div>
                  <div className="history-card__facts">
                    <span><CheckCircle2 size={15} /> {result.correctAnswers} acertos</span>
                    <span><XCircle size={15} /> {result.incorrectAnswers} erros</span>
                    <span><Clock3 size={15} /> {formatDuration(result.durationSeconds)}</span>
                    <span><FileQuestion size={15} /> {result.answeredQuestions} respondidas</span>
                  </div>
                  <div className="history-card__topics">
                    {result.topics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}
                    {result.topics.length > 3 && <span>+{result.topics.length - 3}</span>}
                  </div>
                </div>
                <div className="history-card__score">
                  <span className={result.percentage >= 65 ? 'score-good' : 'score-low'}>{formatPercent(result.percentage)}</span>
                  <div className="meter"><span className={result.percentage < 65 ? 'meter--warning' : ''} style={{ width: `${result.percentage}%` }} /></div>
                  <Link className="text-link" to={`/result/${result.id}`}>Ver resultado <ArrowRight size={15} /></Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
