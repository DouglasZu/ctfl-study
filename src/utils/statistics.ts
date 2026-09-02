import type {
  ChapterStatistics,
  PerformanceClassification,
  Question,
  QuestionId,
  QuestionResult,
  QuestionStatistics,
  Quiz,
  QuizAnswer,
  QuizAnswerMap,
  QuizHistory,
  QuizResult,
  TopicStatistics,
  UserStatistics,
} from '../types'

const questionKey = (id: QuestionId): string => String(id)

export function roundTo(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0
  const safeDecimals = Math.max(0, Math.min(10, Math.trunc(decimals)))
  const factor = 10 ** safeDecimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Returns a percentage between 0 and 100. A zero denominator yields zero. */
export function calculatePercentage(value: number, total: number, decimals = 1): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
  return roundTo(Math.max(0, Math.min(100, (value / total) * 100)), decimals)
}

export function answersToMap(
  answers: QuizAnswer[] | QuizAnswerMap,
): QuizAnswerMap {
  if (!Array.isArray(answers)) return { ...answers }

  return Object.fromEntries(
    answers.map((answer) => [questionKey(answer.questionId), answer.selectedAnswer]),
  )
}

function buildQuestionResults(
  questions: Question[],
  answers: QuizAnswer[] | QuizAnswerMap,
): QuestionResult[] {
  const answerMap = answersToMap(answers)

  return questions.map((question) => {
    const selectedAnswer = answerMap[questionKey(question.id)] ?? null

    if (
      selectedAnswer !== null &&
      (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= question.options.length)
    ) {
      throw new RangeError(`Resposta inválida para a questão ${String(question.id)}.`)
    }

    const answered = selectedAnswer !== null
    return {
      questionId: question.id,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      answered,
      isCorrect: answered && selectedAnswer === question.correctAnswer,
      chapter: question.chapter,
      topic: question.topic,
      difficulty: question.difficulty,
      question: {
        ...question,
        options: [...question.options],
      },
    }
  })
}

interface MutableGroupStatistics {
  answered: number
  correct: number
  incorrect: number
}

function addResult(
  target: MutableGroupStatistics,
  result: Pick<QuestionResult, 'answered' | 'isCorrect'>,
): void {
  if (!result.answered) return
  target.answered += 1
  if (result.isCorrect) target.correct += 1
  else target.incorrect += 1
}

function topicStatisticsFromResults(results: QuestionResult[]): TopicStatistics[] {
  const groups = new Map<string, MutableGroupStatistics & { topic: string; chapter: string }>()

  results.forEach((result) => {
    const key = `${result.chapter}\u0000${result.topic}`
    const group = groups.get(key) ?? {
      topic: result.topic,
      chapter: result.chapter,
      answered: 0,
      correct: 0,
      incorrect: 0,
    }
    addResult(group, result)
    groups.set(key, group)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      percentage: calculatePercentage(group.correct, group.answered),
    }))
    .sort((left, right) =>
      left.chapter.localeCompare(right.chapter, 'pt-BR') ||
      left.topic.localeCompare(right.topic, 'pt-BR'),
    )
}

function chapterStatisticsFromResults(results: QuestionResult[]): ChapterStatistics[] {
  const groups = new Map<string, MutableGroupStatistics>()

  results.forEach((result) => {
    const group = groups.get(result.chapter) ?? { answered: 0, correct: 0, incorrect: 0 }
    addResult(group, result)
    groups.set(result.chapter, group)
  })

  return [...groups.entries()]
    .map(([chapter, group]) => ({
      chapter,
      ...group,
      percentage: calculatePercentage(group.correct, group.answered),
    }))
    .sort((left, right) => left.chapter.localeCompare(right.chapter, 'pt-BR'))
}

export function calculateTopicStatistics(
  questions: Question[],
  answers: QuizAnswer[] | QuizAnswerMap,
): TopicStatistics[] {
  return topicStatisticsFromResults(buildQuestionResults(questions, answers))
}

export function calculateChapterStatistics(
  questions: Question[],
  answers: QuizAnswer[] | QuizAnswerMap,
): ChapterStatistics[] {
  return chapterStatisticsFromResults(buildQuestionResults(questions, answers))
}

export interface CalculateQuizResultOptions {
  completedAt?: string | Date
  durationSeconds?: number
  resultId?: string
}

export function calculateQuizResult(
  quiz: Quiz,
  answers: QuizAnswer[] | QuizAnswerMap,
  options: CalculateQuizResultOptions | number = {},
): QuizResult {
  const normalizedOptions: CalculateQuizResultOptions =
    typeof options === 'number' ? { durationSeconds: options } : options
  const completedDate =
    normalizedOptions.completedAt instanceof Date
      ? normalizedOptions.completedAt
      : new Date(normalizedOptions.completedAt ?? Date.now())
  const startedDate = new Date(quiz.createdAt)

  if (Number.isNaN(completedDate.getTime()) || Number.isNaN(startedDate.getTime())) {
    throw new TypeError('As datas do simulado precisam ser válidas.')
  }

  const questionResults = buildQuestionResults(quiz.questions, answers)
  const answerDetails = questionResults.map<QuizAnswer>((result) => ({
    questionId: result.questionId,
    selectedAnswer: result.selectedAnswer,
    isCorrect: result.isCorrect,
  }))
  const answeredQuestions = questionResults.filter((result) => result.answered).length
  const correctAnswers = questionResults.filter((result) => result.isCorrect).length
  const incorrectAnswers = answeredQuestions - correctAnswers
  const durationSeconds = Math.max(
    0,
    Math.round(
      normalizedOptions.durationSeconds ??
        (completedDate.getTime() - startedDate.getTime()) / 1_000,
    ),
  )

  return {
    id: normalizedOptions.resultId ?? `${quiz.id}-${completedDate.getTime()}`,
    quizId: quiz.id,
    startedAt: startedDate.toISOString(),
    completedAt: completedDate.toISOString(),
    mode: quiz.mode,
    ...(quiz.examId ? { examId: quiz.examId } : {}),
    ...(quiz.track ? { track: quiz.track } : {}),
    totalQuestions: questionResults.length,
    answeredQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions: questionResults.length - answeredQuestions,
    percentage: calculatePercentage(correctAnswers, questionResults.length),
    durationSeconds,
    topics: [...new Set(quiz.questions.map((question) => question.topic))],
    answers: answerDetails,
    questionResults,
    topicStatistics: topicStatisticsFromResults(questionResults),
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return roundTo(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function chronologicalHistory(history: QuizHistory): QuizHistory {
  return [...history].sort(
    (left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt),
  )
}

function allQuestionResults(history: QuizHistory): Array<QuestionResult & { completedAt: string }> {
  return history.flatMap((result) =>
    result.questionResults.map((questionResult) => ({
      ...questionResult,
      completedAt: result.completedAt,
    })),
  )
}

export function calculateQuestionStatistics(history: QuizHistory): QuestionStatistics[] {
  interface Accumulator extends MutableGroupStatistics {
    questionId: QuestionId
    lastAnsweredAt?: string
    lastAnswerCorrect?: boolean
  }

  const groups = new Map<string, Accumulator>()

  allQuestionResults(history).forEach((result) => {
    if (!result.answered) return
    const key = questionKey(result.questionId)
    const group = groups.get(key) ?? {
      questionId: result.questionId,
      answered: 0,
      correct: 0,
      incorrect: 0,
    }

    addResult(group, result)
    if (!group.lastAnsweredAt || Date.parse(result.completedAt) >= Date.parse(group.lastAnsweredAt)) {
      group.lastAnsweredAt = result.completedAt
      group.lastAnswerCorrect = result.isCorrect
    }
    groups.set(key, group)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      percentage: calculatePercentage(group.correct, group.answered),
    }))
    .sort((left, right) => left.percentage - right.percentage || right.answered - left.answered)
}

function aggregateTopicStatistics(history: QuizHistory): TopicStatistics[] {
  return topicStatisticsFromResults(allQuestionResults(history))
}

function aggregateChapterStatistics(history: QuizHistory): ChapterStatistics[] {
  return chapterStatisticsFromResults(allQuestionResults(history))
}

export function identifyWeakTopics(
  statistics: TopicStatistics[],
  minAnswers = 2,
): TopicStatistics[] {
  const minimum = Math.max(1, Math.trunc(minAnswers))
  return statistics
    .filter((statistic) => statistic.answered >= minimum)
    .sort(
      (left, right) =>
        left.percentage - right.percentage ||
        right.incorrect - left.incorrect ||
        right.answered - left.answered ||
        left.topic.localeCompare(right.topic, 'pt-BR'),
    )
}

export function calculateUserStatistics(
  history: QuizHistory,
  minWeakTopicAnswers = 2,
): UserStatistics {
  const chronological = chronologicalHistory(history)
  const percentages = chronological.map((result) => result.percentage)
  const totalQuestionsAnswered = chronological.reduce(
    (sum, result) => sum + result.answeredQuestions,
    0,
  )
  const totalCorrectAnswers = chronological.reduce(
    (sum, result) => sum + result.correctAnswers,
    0,
  )
  const totalIncorrectAnswers = chronological.reduce(
    (sum, result) => sum + result.incorrectAnswers,
    0,
  )
  const topicStatistics = aggregateTopicStatistics(chronological)

  return {
    totalQuizzes: chronological.length,
    averagePercentage: mean(percentages),
    bestPercentage: percentages.length > 0 ? Math.max(...percentages) : 0,
    worstPercentage: percentages.length > 0 ? Math.min(...percentages) : 0,
    lastPercentage: percentages.at(-1) ?? 0,
    last5Average: mean(percentages.slice(-5)),
    last10Average: mean(percentages.slice(-10)),
    totalQuestionsAnswered,
    totalCorrectAnswers,
    totalIncorrectAnswers,
    overallAccuracy: calculatePercentage(totalCorrectAnswers, totalQuestionsAnswered),
    topicStatistics,
    chapterStatistics: aggregateChapterStatistics(chronological),
    weakTopics: identifyWeakTopics(topicStatistics, minWeakTopicAnswers),
    questionStatistics: calculateQuestionStatistics(chronological),
    evolution: chronological.map((result) => ({
      quizId: result.quizId,
      completedAt: result.completedAt,
      percentage: result.percentage,
    })),
  }
}

export const getStatisticsFromHistory = calculateUserStatistics

export function classifyPerformance(percentageValue: number): PerformanceClassification {
  const value = Number.isFinite(percentageValue)
    ? Math.max(0, Math.min(100, percentageValue))
    : 0
  if (value < 50) return { key: 'needs-study', label: 'Precisa reforçar os estudos' }
  if (value < 65) return { key: 'attention', label: 'Atenção' }
  if (value < 80) return { key: 'good', label: 'Bom' }
  if (value < 90) return { key: 'very-good', label: 'Muito bom' }
  return { key: 'excellent', label: 'Excelente' }
}
