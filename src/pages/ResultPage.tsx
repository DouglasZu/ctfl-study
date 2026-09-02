import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Home,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useStudyApp } from '../hooks/useStudyApp'
import { formatDate, formatDuration, formatPercent } from './pageHelpers'

function resultMessage(percentage: number) {
  if (percentage >= 90) return { title: 'Excelente resultado!', text: 'Você demonstrou grande domínio dos assuntos desta sessão.' }
  if (percentage >= 80) return { title: 'Ótimo trabalho!', text: 'Seu desempenho está consistente. Continue refinando os pontos fracos.' }
  if (percentage >= 65) return { title: 'Bom progresso!', text: 'Você está no caminho certo. Uma revisão direcionada pode elevar sua nota.' }
  if (percentage >= 50) return { title: 'Siga praticando', text: 'Use a revisão detalhada para transformar os erros em aprendizado.' }
  return { title: 'Cada tentativa conta', text: 'Revise as explicações com calma e fortaleça os fundamentos.' }
}

export function ResultPage() {
  const { resultId } = useParams()
  const { history } = useStudyApp()
  const result = history.find((item) => item.id === resultId)

  if (!result) {
    return (
      <main className="page centered-empty-page">
        <span className="empty-illustration"><FileQuestion size={34} /></span>
        <h1>Resultado não encontrado</h1>
        <p>Este simulado pode ter sido removido ou pertencer a outro dispositivo.</p>
        <Link className="button button--primary" to="/history">Ver histórico</Link>
      </main>
    )
  }

  const message = resultMessage(result.percentage)

  return (
    <main className="page result-page">
      <header className="page-heading page-heading--with-back result-heading">
        <Link className="icon-button" to="/" aria-label="Voltar ao início"><ArrowLeft size={20} /></Link>
        <div><span className="eyebrow">Simulado concluído</span><h1>Seu resultado</h1><p>{formatDate(result.completedAt, true)}</p></div>
      </header>

      <section className="result-hero">
        <div className="result-ring" style={{ '--score': `${result.percentage * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{formatPercent(result.percentage)}</strong><span>{result.correctAnswers} / {result.totalQuestions}</span></div>
        </div>
        <div className="result-hero__copy">
          <span className="result-kicker"><Trophy size={17} /> Resultado registrado</span>
          <h2>{message.title}</h2>
          <p>{message.text}</p>
          <span className="indicator-note">Indicador de estudo pessoal — não representa critério oficial do exame.</span>
        </div>
      </section>

      <section className="result-stats" aria-label="Resumo do resultado">
        <article><span className="result-stat-icon result-stat-icon--success"><CheckCircle2 size={20} /></span><div><span>Acertos</span><strong>{result.correctAnswers}</strong></div></article>
        <article><span className="result-stat-icon result-stat-icon--danger"><XCircle size={20} /></span><div><span>Erros</span><strong>{result.incorrectAnswers}</strong></div></article>
        <article><span className="result-stat-icon result-stat-icon--neutral"><FileQuestion size={20} /></span><div><span>Em branco</span><strong>{result.unansweredQuestions}</strong></div></article>
        <article><span className="result-stat-icon result-stat-icon--blue"><Clock3 size={20} /></span><div><span>Tempo utilizado</span><strong>{formatDuration(result.durationSeconds)}</strong></div></article>
      </section>

      <div className="result-content-grid">
        <section className="panel-card topic-performance" aria-labelledby="topic-result-title">
          <div className="panel-card__header">
            <div><span className="eyebrow">Detalhamento</span><h2 id="topic-result-title">Desempenho por assunto</h2></div>
            <BarChart3 size={21} />
          </div>
          <div className="topic-performance__list">
            {result.topicStatistics.map((topic) => (
              <div className="topic-performance__item" key={topic.topic}>
                <div><strong>{topic.topic}</strong><span>{topic.correct}/{topic.answered} acertos</span></div>
                <strong>{formatPercent(topic.percentage)}</strong>
                <div className="meter"><span className={topic.percentage < 65 ? 'meter--warning' : ''} style={{ width: `${topic.percentage}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <aside className="result-next panel-card">
          <span className="result-next__icon"><Target size={24} /></span>
          <span className="eyebrow">Próximo passo</span>
          <h2>Transforme resultado em progresso</h2>
          <p>Veja cada resposta, leia as explicações e marque o que quiser estudar de novo.</p>
          <Link className="button button--primary button--full" to={`/result/${result.id}/review`}>
            Revisar respostas <ArrowRight size={18} />
          </Link>
          <Link className="button button--secondary button--full" to="/new?mode=errors">
            <RotateCcw size={17} /> Treinar meus erros
          </Link>
        </aside>
      </div>

      <footer className="result-footer-actions">
        <Link className="button button--ghost" to="/"><Home size={18} /> Ir ao início</Link>
        <Link className="button button--secondary" to="/new">Novo simulado <ArrowRight size={18} /></Link>
      </footer>
    </main>
  )
}
