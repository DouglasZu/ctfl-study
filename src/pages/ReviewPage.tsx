import { ArrowLeft, Check, CheckCircle2, FileQuestion, Lightbulb, Star, X, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useStudyApp } from '../hooks/useStudyApp'
import { optionLetter } from './pageHelpers'

export function ReviewPage() {
  const { resultId } = useParams()
  const { history, favorites, toggleFavorite } = useStudyApp()
  const result = history.find((item) => item.id === resultId)

  if (!result) {
    return (
      <main className="page centered-empty-page">
        <span className="empty-illustration"><FileQuestion size={34} /></span>
        <h1>Revisão não encontrada</h1>
        <Link className="button button--primary" to="/history">Voltar ao histórico</Link>
      </main>
    )
  }

  return (
    <main className="page review-page">
      <header className="page-heading page-heading--with-back">
        <Link className="icon-button" to={`/result/${result.id}`} aria-label="Voltar ao resultado"><ArrowLeft size={20} /></Link>
        <div><span className="eyebrow">Correção detalhada</span><h1>Revisar respostas</h1><p>Entenda seus acertos e erros sem pressa.</p></div>
      </header>

      <div className="review-summary">
        <span><i className="review-summary__dot review-summary__dot--success" /> {result.correctAnswers} corretas</span>
        <span><i className="review-summary__dot review-summary__dot--danger" /> {result.incorrectAnswers} incorretas</span>
        <span><i className="review-summary__dot" /> {result.unansweredQuestions} em branco</span>
      </div>

      <div className="review-list">
        {result.questionResults.map((item, questionIndex) => {
          const isFavorite = favorites.some((id) => String(id) === String(item.questionId))
          return (
            <article className={`review-card ${item.isCorrect ? 'review-card--correct' : 'review-card--incorrect'}`} key={String(item.questionId)}>
              <header className="review-card__header">
                <span className="review-card__number">Questão {questionIndex + 1}</span>
                <span className={`review-verdict ${item.isCorrect ? 'review-verdict--correct' : 'review-verdict--incorrect'}`}>
                  {item.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {item.isCorrect ? 'Correta' : item.answered ? 'Incorreta' : 'Não respondida'}
                </span>
                <button className={`icon-button favorite-review${isFavorite ? ' is-active' : ''}`} type="button" onClick={() => toggleFavorite(item.questionId)} aria-label={isFavorite ? 'Remover das favoritas' : 'Adicionar às favoritas'}>
                  <Star size={19} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </header>
              <div className="review-card__meta"><span>Capítulo {item.chapter}</span><span>{item.topic}</span></div>
              <h2>{item.question.question}</h2>
              <div className="review-options">
                {item.question.options.map((option, optionIndex) => {
                  const chosen = item.selectedAnswer === optionIndex
                  const correct = item.correctAnswer === optionIndex
                  const className = ['review-option', correct && 'is-correct', chosen && !correct && 'is-wrong', chosen && 'is-chosen'].filter(Boolean).join(' ')
                  return (
                    <div className={className} key={`${item.questionId}-${optionIndex}`}>
                      <span className="review-option__letter">{optionLetter(optionIndex)}</span>
                      <span>{option}</span>
                      <span className="review-option__status">
                        {correct && <><Check size={16} /><span>Correta</span></>}
                        {chosen && !correct && <><X size={16} /><span>Sua resposta</span></>}
                        {chosen && correct && <span>Sua resposta</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="explanation-box">
                <span><Lightbulb size={19} /></span>
                <div><strong>Explicação</strong><p>{item.question.explanation}</p></div>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
