import type {
  ActiveQuiz,
  CertificationTrack,
  OfficialExamInfo,
  Question,
  Quiz,
  QuizHistory,
  QuizMode,
  TimerMode,
} from '../types'
import { calculateUserStatistics } from './statistics'

export const OFFICIAL_EXAMS: readonly OfficialExamInfo[] = [
  // CTFL (Foundation Level)
  {
    id: 'ctfl-mock-1',
    track: 'CTFL',
    title: 'Simulado Oficial CTFL 1',
    badge: 'CTFL Mock 1',
    description: 'Exame oficial padrão ISTQB/BSTQB com 40 questões balanceadas conforme o Syllabus CTFL 4.0.',
    questionCount: 40,
    durationMinutes: 60,
  },
  {
    id: 'ctfl-mock-2',
    track: 'CTFL',
    title: 'Simulado Oficial CTFL 2',
    badge: 'CTFL Mock 2',
    description: 'Segundo exame oficial completo para consolidar todo o conteúdo e técnicas fundamentais.',
    questionCount: 40,
    durationMinutes: 60,
  },
  // CTAL-TAE (Test Automation Engineer)
  {
    id: 'tae-mock-1',
    track: 'CTAL-TAE',
    title: 'Simulado Oficial CTAL-TAE 1',
    badge: 'TAE Mock 1',
    description: 'Exame avançado com 40 questões sobre Arquitetura TAA/TAS, Estratégia de Automação e Riscos.',
    questionCount: 40,
    durationMinutes: 90,
  },
  {
    id: 'tae-mock-2',
    track: 'CTAL-TAE',
    title: 'Simulado Oficial CTAL-TAE 2',
    badge: 'TAE Mock 2',
    description: 'Segundo exame avançado cobrindo Métricas, Implantação, Manutenção e Evolução da Automação.',
    questionCount: 40,
    durationMinutes: 90,
  },
  // CT-FT (Financial Tester)
  {
    id: 'ft-mock-1',
    track: 'CT-FT',
    title: 'Simulado Oficial CT-FT 1',
    badge: 'FT Mock 1',
    description: 'Exame especialista com 40 questões sobre Sistemas Financeiros, Pagamentos/Pix, Reconciliação e BACEN.',
    questionCount: 40,
    durationMinutes: 60,
  },
  {
    id: 'ft-mock-2',
    track: 'CT-FT',
    title: 'Simulado Oficial CT-FT 2',
    badge: 'FT Mock 2',
    description: 'Segundo exame oficial com foco em Fraude, Risco de Crédito, PCI-DSS e Segurança Financeira.',
    questionCount: 40,
    durationMinutes: 60,
  },
  // CT-AI / CT-GenAI (AI & Generative AI Testing)
  {
    id: 'ai-mock-1',
    track: 'CT-AI',
    title: 'Simulado Oficial CT-AI 1',
    badge: 'AI Mock 1',
    description: 'Exame especialista com 40 questões sobre Machine Learning, Teste Metamórfico e Métricas de IA.',
    questionCount: 40,
    durationMinutes: 60,
  },
  {
    id: 'ai-mock-2',
    track: 'CT-AI',
    title: 'Simulado Oficial CT-GenAI 2',
    badge: 'GenAI Mock 2',
    description: 'Segundo exame oficial focado em IA Generativa, LLMs, Prompt Injection, Alucinação e Ética.',
    questionCount: 40,
    durationMinutes: 60,
  },
] as const

export type RandomSource = () => number

function normalizedRandom(random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(0.999_999_999, value))
}

export function shuffleArray<T>(values: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizedRandom(random) * (index + 1))
    const current = copy[index]
    const other = copy[swapIndex]
    if (current === undefined || other === undefined) continue
    copy[index] = other
    copy[swapIndex] = current
  }
  return copy
}

/** Shuffles alternatives and remaps `correctAnswer` to the same semantic answer. */
export function shuffleQuestionOptions(
  question: Question,
  random: RandomSource = Math.random,
): Question {
  const alternatives = question.options.map((text, originalIndex) => ({ text, originalIndex }))
  const shuffled = shuffleArray(alternatives, random)
  const correctAnswer = shuffled.findIndex(
    (alternative) => alternative.originalIndex === question.correctAnswer,
  )

  if (correctAnswer < 0) {
    throw new RangeError(`A questão ${String(question.id)} não possui uma resposta correta válida.`)
  }

  return {
    ...question,
    options: shuffled.map((alternative) => alternative.text),
    correctAnswer,
  }
}

export interface QuestionFilters {
  track?: CertificationTrack
  topics?: readonly string[]
  chapters?: readonly string[]
  examId?: string
  kLevels?: readonly string[]
}

export function filterQuestions(
  questions: readonly Question[],
  filters: QuestionFilters = {},
): Question[] {
  const topicSet = filters.topics && filters.topics.length > 0 ? new Set(filters.topics) : null
  const chapterSet =
    filters.chapters && filters.chapters.length > 0 ? new Set(filters.chapters) : null
  const kLevelSet =
    filters.kLevels && filters.kLevels.length > 0 ? new Set(filters.kLevels) : null

  return questions.filter(
    (question) =>
      (!filters.track || (question.track ?? 'CTFL') === filters.track) &&
      (!topicSet || topicSet.has(question.topic)) &&
      (!chapterSet || chapterSet.has(question.chapter)) &&
      (!filters.examId || question.examId === filters.examId) &&
      (!kLevelSet || (question.kLevel && kLevelSet.has(question.kLevel))),
  )
}

function uniqueQuestions(questions: readonly Question[]): Question[] {
  const seen = new Set<string>()
  return questions.filter((question) => {
    const key = String(question.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function safeCount(count: number, available: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.min(Math.trunc(count), available)
}

function lastAnsweredByQuestion(history: QuizHistory): Map<string, number> {
  const lastAnswered = new Map<string, number>()

  history.forEach((result) => {
    const timestamp = Date.parse(result.completedAt)
    result.questionResults.forEach((questionResult) => {
      if (!questionResult.answered) return
      const key = String(questionResult.questionId)
      const previous = lastAnswered.get(key) ?? Number.NEGATIVE_INFINITY
      lastAnswered.set(key, Math.max(previous, Number.isNaN(timestamp) ? 0 : timestamp))
    })
  })

  return lastAnswered
}

export interface SelectQuestionsOptions extends QuestionFilters {
  history?: QuizHistory
  shuffleOptions?: boolean
  random?: RandomSource
}

/**
 * Selects unique questions, preferring never-answered ones and then the least
 * recently answered. Randomness only decides ties, making the priority reliable.
 */
export function selectQuestions(
  questions: readonly Question[],
  count: number,
  historyOrOptions: QuizHistory | SelectQuestionsOptions = {},
): Question[] {
  const options: SelectQuestionsOptions = Array.isArray(historyOrOptions)
    ? { history: historyOrOptions }
    : historyOrOptions
  const random = options.random ?? Math.random
  const candidates = uniqueQuestions(filterQuestions(questions, options))
  const limit = safeCount(count, candidates.length)
  const lastAnswered = lastAnsweredByQuestion(options.history ?? [])

  const prioritized = candidates
    .map((question) => ({
      question,
      lastAnswered: lastAnswered.get(String(question.id)) ?? Number.NEGATIVE_INFINITY,
      tieBreaker: normalizedRandom(random),
    }))
    .sort(
      (left, right) =>
        left.lastAnswered - right.lastAnswered || left.tieBreaker - right.tieBreaker,
    )
    .slice(0, limit)
    .map(({ question }) => question)

  return options.shuffleOptions
    ? prioritized.map((question) => shuffleQuestionOptions(question, random))
    : prioritized.map((question) => ({ ...question, options: [...question.options] }))
}

export function selectRandomQuestions(
  questions: readonly Question[],
  count: number,
  history: QuizHistory = [],
  random: RandomSource = Math.random,
): Question[] {
  return selectQuestions(questions, count, { history, random })
}

interface ErrorPriority {
  wrongCount: number
  latestWrongAt: number
  topicPercentage: number
}

function errorPriorities(history: QuizHistory): Map<string, ErrorPriority> {
  const priorities = new Map<string, ErrorPriority>()
  const statistics = calculateUserStatistics(history)
  const topicPercentages = new Map(
    statistics.topicStatistics.map((statistic) => [
      `${statistic.chapter ?? ''}\u0000${statistic.topic}`,
      statistic.percentage,
    ]),
  )

  history.forEach((result) => {
    const timestamp = Date.parse(result.completedAt)
    result.questionResults.forEach((questionResult) => {
      if (!questionResult.answered || questionResult.isCorrect) return
      const key = String(questionResult.questionId)
      const previous = priorities.get(key)
      const latestWrongAt = Number.isNaN(timestamp) ? 0 : timestamp
      priorities.set(key, {
        wrongCount: (previous?.wrongCount ?? 0) + 1,
        latestWrongAt: Math.max(previous?.latestWrongAt ?? Number.NEGATIVE_INFINITY, latestWrongAt),
        topicPercentage:
          topicPercentages.get(`${questionResult.chapter}\u0000${questionResult.topic}`) ?? 100,
      })
    })
  })

  return priorities
}

export interface ErrorTrainingOptions extends QuestionFilters {
  /** Fill a short error pool with ordinary prioritized questions. Defaults to true. */
  fillWithOtherQuestions?: boolean
  shuffleOptions?: boolean
  random?: RandomSource
}

export function selectErrorTrainingQuestions(
  questions: readonly Question[],
  count: number,
  history: QuizHistory,
  options: ErrorTrainingOptions = {},
): Question[] {
  const random = options.random ?? Math.random
  const candidates = uniqueQuestions(filterQuestions(questions, options))
  const limit = safeCount(count, candidates.length)
  const priorities = errorPriorities(history)

  const errors = candidates
    .filter((question) => priorities.has(String(question.id)))
    .map((question) => ({
      question,
      priority: priorities.get(String(question.id))!,
      tieBreaker: normalizedRandom(random),
    }))
    .sort(
      (left, right) =>
        right.priority.wrongCount - left.priority.wrongCount ||
        right.priority.latestWrongAt - left.priority.latestWrongAt ||
        left.priority.topicPercentage - right.priority.topicPercentage ||
        left.tieBreaker - right.tieBreaker,
    )
    .slice(0, limit)
    .map(({ question }) => question)

  let selected = errors
  if ((options.fillWithOtherQuestions ?? true) && selected.length < limit) {
    const selectedIds = new Set(selected.map((question) => String(question.id)))
    const remaining = candidates.filter((question) => !selectedIds.has(String(question.id)))
    selected = [
      ...selected,
      ...selectQuestions(remaining, limit - selected.length, {
        history,
        random,
      }),
    ]
  }

  return options.shuffleOptions
    ? selected.map((question) => shuffleQuestionOptions(question, random))
    : selected.map((question) => ({ ...question, options: [...question.options] }))
}

/** Returns only questions with at least one recorded wrong answer. */
export function selectIncorrectQuestions(
  questions: readonly Question[],
  count: number,
  history: QuizHistory,
  options: Omit<ErrorTrainingOptions, 'fillWithOtherQuestions'> = {},
): Question[] {
  return selectErrorTrainingQuestions(questions, count, history, {
    ...options,
    fillWithOtherQuestions: false,
  })
}

function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  return randomId ? `${prefix}-${randomId}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface CreateQuizOptions {
  id?: string
  createdAt?: string | Date
  mode?: QuizMode
  topics?: string[]
  timerMode?: TimerMode
  durationMinutes?: number
  examId?: string
  track?: CertificationTrack
}

export function createQuiz(
  questions: readonly Question[],
  options: CreateQuizOptions = {},
): Quiz {
  const createdAt =
    options.createdAt instanceof Date
      ? options.createdAt.toISOString()
      : new Date(options.createdAt ?? Date.now()).toISOString()
  const timerMode = options.timerMode ?? 'free'
  const track = options.track ?? questions[0]?.track ?? 'CTFL'

  return {
    id: options.id ?? createId('quiz'),
    questions: questions.map((question) => ({ ...question, options: [...question.options] })),
    createdAt,
    mode: options.mode ?? 'complete',
    topics: options.topics ?? [...new Set(questions.map((question) => question.topic))],
    timerMode,
    track,
    ...(options.examId ? { examId: options.examId } : {}),
    ...(timerMode === 'exam' && options.durationMinutes
      ? { durationMinutes: options.durationMinutes }
      : {}),
  }
}

export function createActiveQuiz(quiz: Quiz): ActiveQuiz {
  const now = new Date().toISOString()
  const durationMinutes = quiz.durationMinutes
  return {
    id: quiz.id,
    questions: quiz.questions.map((question) => ({ ...question, options: [...question.options] })),
    answers: Object.fromEntries(quiz.questions.map((question) => [String(question.id), null])),
    reviewQuestionIds: [],
    currentIndex: 0,
    startedAt: quiz.createdAt,
    updatedAt: now,
    mode: quiz.mode,
    topics: [...quiz.topics],
    timerMode: quiz.timerMode,
    track: quiz.track,
    ...(quiz.examId ? { examId: quiz.examId } : {}),
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
    ...(durationMinutes === undefined ? {} : { remainingSeconds: durationMinutes * 60 }),
  }
}

export const createQuizSession = createActiveQuiz

export function quizFromActiveQuiz(activeQuiz: ActiveQuiz): Quiz {
  const durationMinutes = activeQuiz.durationMinutes
  return {
    id: activeQuiz.id,
    questions: activeQuiz.questions,
    createdAt: activeQuiz.startedAt,
    mode: activeQuiz.mode,
    topics: activeQuiz.topics,
    timerMode: activeQuiz.timerMode,
    track: activeQuiz.track,
    ...(activeQuiz.examId ? { examId: activeQuiz.examId } : {}),
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
  }
}
