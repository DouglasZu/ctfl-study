import { useMemo, useState } from 'react'
import { ArrowRight, BarChart3, BrainCircuit, ChartNoAxesColumnIncreasing, CircleAlert, Medal, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStudyApp } from '../hooks/useStudyApp'
import { formatPercent } from './pageHelpers'

function EvolutionChart({ points }: { points: Array<{ quizId: string; percentage: number; completedAt: string }> }) {
  const recent = points.slice(-10)
  if (recent.length === 0) {
    return <div className="chart-empty"><BarChart3 size={28} /><span>Conclua simulados para visualizar sua evolução.</span></div>
  }

  const width = 700
  const height = 250
  const plotLeft = 42
  const plotRight = 676
  const plotTop = 18
  const plotBottom = 208
  const xAt = (index: number) => recent.length === 1 ? (plotLeft + plotRight) / 2 : plotLeft + (index / (recent.length - 1)) * (plotRight - plotLeft)
  const yAt = (value: number) => plotBottom - (value / 100) * (plotBottom - plotTop)
  const path = recent.map((point, index) => `${xAt(index)},${yAt(point.percentage)}`).join(' ')

  return (
    <div className="evolution-chart" role="img" aria-label={`Evolução dos últimos ${recent.length} simulados`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((value) => {
          const y = yAt(value)
          return <g key={value}><line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="chart-gridline" /><text x="4" y={y + 4} className="chart-y-label">{value}%</text></g>
        })}
        {recent.length > 1 && <polygon points={`${plotLeft},${plotBottom} ${path} ${plotRight},${plotBottom}`} fill="url(#chartArea)" />}
        <polyline points={path} className="chart-line" />
        {recent.map((point, index) => (
          <g key={point.quizId}>
            <circle cx={xAt(index)} cy={yAt(point.percentage)} r="5" className="chart-point" />
            <text x={xAt(index)} y="237" textAnchor="middle" className="chart-x-label">{points.length - recent.length + index + 1}</text>
            <title>Simulado {points.length - recent.length + index + 1}: {formatPercent(point.percentage)}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function PerformancePage() {
  const { statistics, history, questions } = useStudyApp()
  const [breakdown, setBreakdown] = useState<'topics' | 'chapters'>('topics')
  const hasHistory = history.length > 0

  const difficultQuestions = useMemo(() => {
    return [...statistics.questionStatistics]
      .filter((item) => item.answered >= 2)
      .sort((a, b) => b.incorrect - a.incorrect || a.percentage - b.percentage)
      .slice(0, 5)
      .map((item) => ({ ...item, question: questions.find((question) => String(question.id) === String(item.questionId)) }))
  }, [questions, statistics.questionStatistics])

  const details = breakdown === 'topics' ? statistics.topicStatistics : statistics.chapterStatistics

  return (
    <main className="page performance-page">
      <header className="page-heading">
        <div><span className="eyebrow">Análise de estudo</span><h1>Meu desempenho</h1><p>Use seus dados para decidir onde concentrar a próxima revisão.</p></div>
        {hasHistory && <Link className="button button--primary desktop-cta" to="/new?mode=errors"><Target size={18} /> Treinar meus erros</Link>}
      </header>

      {!hasHistory ? (
        <section className="large-empty-state">
          <span className="large-empty-state__icon"><ChartNoAxesColumnIncreasing size={38} /></span>
          <h2>Suas métricas serão construídas aqui</h2>
          <p>Conclua seu primeiro simulado para visualizar evolução, médias e assuntos para revisar.</p>
          <Link className="button button--primary" to="/new">Começar agora <ArrowRight size={18} /></Link>
        </section>
      ) : (
        <>
          <section className="metric-strip" aria-label="Principais métricas">
            <article><span className="metric-strip__icon"><Sparkles size={20} /></span><div><span>Média geral</span><strong>{formatPercent(statistics.averagePercentage)}</strong></div></article>
            <article><span className="metric-strip__icon"><Medal size={20} /></span><div><span>Melhor resultado</span><strong>{formatPercent(statistics.bestPercentage)}</strong></div></article>
            <article><span className="metric-strip__icon"><TrendingDown size={20} /></span><div><span>Pior resultado</span><strong>{formatPercent(statistics.worstPercentage)}</strong></div></article>
            <article><span className="metric-strip__icon"><BrainCircuit size={20} /></span><div><span>Questões respondidas</span><strong>{statistics.totalQuestionsAnswered}</strong></div></article>
          </section>

          <section className="panel-card evolution-panel">
            <div className="panel-card__header">
              <div><span className="eyebrow">Linha do tempo</span><h2>Evolução dos resultados</h2></div>
              <span className="chart-legend"><i /> Percentual de acertos</span>
            </div>
            <EvolutionChart points={statistics.evolution} />
            <div className="average-chips">
              <span><small>Últimas 5 provas</small><strong>{formatPercent(statistics.last5Average)}</strong></span>
              <span><small>Últimas 10 provas</small><strong>{formatPercent(statistics.last10Average)}</strong></span>
              <span><small>Taxa geral</small><strong>{formatPercent(statistics.overallAccuracy)}</strong></span>
            </div>
          </section>

          <div className="performance-columns">
            <section className="panel-card weak-panel">
              <div className="panel-card__header">
                <div><span className="eyebrow">Prioridade</span><h2>Assuntos para revisar</h2></div>
                <CircleAlert size={21} />
              </div>
              {statistics.weakTopics.length > 0 ? (
                <ol className="weak-list">
                  {statistics.weakTopics.map((topic, index) => (
                    <li key={topic.topic}>
                      <span className="weak-list__rank">{index + 1}</span>
                      <div className="weak-list__body">
                        <div><strong>{topic.topic}</strong><span>{topic.answered} questões respondidas</span></div>
                        <div className="meter"><span className={topic.percentage < 65 ? 'meter--warning' : ''} style={{ width: `${topic.percentage}%` }} /></div>
                      </div>
                      <strong>{formatPercent(topic.percentage)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="compact-empty"><Target size={27} /><div><strong>Nenhuma fraqueza evidente</strong><span>Continue respondendo para aumentar a amostra.</span></div></div>
              )}
            </section>

            <section className="panel-card breakdown-panel">
              <div className="panel-card__header">
                <div><span className="eyebrow">Taxa de acerto</span><h2>Visão por conteúdo</h2></div>
                <div className="mini-tabs" role="tablist" aria-label="Agrupar desempenho">
                  <button type="button" role="tab" aria-selected={breakdown === 'topics'} className={breakdown === 'topics' ? 'is-active' : ''} onClick={() => setBreakdown('topics')}>Tópicos</button>
                  <button type="button" role="tab" aria-selected={breakdown === 'chapters'} className={breakdown === 'chapters' ? 'is-active' : ''} onClick={() => setBreakdown('chapters')}>Capítulos</button>
                </div>
              </div>
              <div className="breakdown-list">
                {details.map((item) => {
                  const label = 'topic' in item ? item.topic : `Capítulo ${item.chapter}`
                  return (
                    <div key={label}>
                      <div><strong>{label}</strong><span>{item.correct}/{item.answered} · {formatPercent(item.percentage)}</span></div>
                      <div className="meter"><span className={item.percentage < 65 ? 'meter--warning' : ''} style={{ width: `${item.percentage}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <section className="panel-card recurring-panel">
            <div className="panel-card__header">
              <div><span className="eyebrow">Dificuldade recorrente</span><h2>Questões que merecem atenção</h2></div>
              <TrendingUp size={21} />
            </div>
            {difficultQuestions.length > 0 ? (
              <div className="recurring-table" role="table" aria-label="Estatísticas por pergunta">
                <div className="recurring-table__header" role="row"><span>Pergunta</span><span>Respondida</span><span>Erros</span><span>Taxa de acerto</span><span>Última resposta</span></div>
                {difficultQuestions.map((item) => (
                  <div className="recurring-table__row" role="row" key={String(item.questionId)}>
                    <span><strong>Questão {item.questionId}</strong><small>{item.question?.question ?? 'Questão removida do banco atual'}</small></span>
                    <span data-label="Respondida">{item.answered}x</span>
                    <span data-label="Erros">{item.incorrect}</span>
                    <span data-label="Taxa de acerto"><strong className={item.percentage < 50 ? 'text-danger' : ''}>{formatPercent(item.percentage)}</strong></span>
                    <span data-label="Última resposta" className={item.lastAnswerCorrect ? 'text-success' : 'text-danger'}>{item.lastAnswerCorrect ? 'Correta' : 'Incorreta'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="compact-empty"><BrainCircuit size={27} /><div><strong>Continue praticando</strong><span>Uma questão precisa ser respondida ao menos duas vezes para aparecer aqui.</span></div></div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
