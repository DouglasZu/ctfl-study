import { z } from 'zod'
import type {
  ActiveQuiz,
  AppSettings,
  BackupData,
  ChapterStatistics,
  PerformancePoint,
  Question,
  QuestionId,
  QuestionResult,
  QuestionStatistics,
  QuizAnswer,
  QuizResult,
  TopicStatistics,
  UserStatistics,
} from '../types'

export const questionIdSchema: z.ZodType<QuestionId> = z.union([
  z.string().trim().min(1, 'O id não pode estar vazio.'),
  z.number().int().finite(),
])

const nonEmptyText = z.string().trim().min(1)
const isoDate = z.string().datetime({ offset: true })
const percentage = z.number().finite().min(0).max(100)
const nonNegativeInteger = z.number().int().nonnegative()

export const questionSchema: z.ZodType<Question> = z
  .object({
    id: questionIdSchema,
    question: nonEmptyText,
    options: z.array(nonEmptyText).min(2, 'Cada questão precisa ter ao menos duas alternativas.'),
    correctAnswer: nonNegativeInteger,
    explanation: nonEmptyText,
    chapter: nonEmptyText,
    topic: nonEmptyText,
    difficulty: z.enum(['easy', 'medium', 'hard']),
    kLevel: z.enum(['K1', 'K2', 'K3']).optional(),
    syllabusRef: z.string().trim().optional(),
    examId: z.string().trim().optional(),
    track: z.enum(['CTFL', 'CTAL-TAE', 'CT-FT', 'CT-AI']).optional(),
  })
  .superRefine((question, context) => {
    if (question.correctAnswer >= question.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswer'],
        message: 'A resposta correta deve apontar para uma alternativa existente.',
      })
    }
  })

const questionsArraySchema = z.array(questionSchema).superRefine((questions, context) => {
  const seen = new Map<string, number>()

  questions.forEach((question, index) => {
    const normalizedId = String(question.id)
    const firstIndex = seen.get(normalizedId)

    if (firstIndex !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: `ID duplicado; ele já foi usado na questão ${firstIndex + 1}.`,
      })
      return
    }

    seen.set(normalizedId, index)
  })
})

export const questionBankSchema = z.union([
  questionsArraySchema,
  z.object({ questions: questionsArraySchema }).transform(({ questions }) => questions),
])

export interface QuestionsValidationSuccess {
  success: true
  data: Question[]
}

export interface QuestionsValidationFailure {
  success: false
  error: z.ZodError
}

export type QuestionsValidationResult = QuestionsValidationSuccess | QuestionsValidationFailure

export class QuestionBankValidationError extends Error {
  readonly issues: z.ZodIssue[]

  constructor(error: z.ZodError) {
    super(`Banco de questões inválido: ${error.issues.map((issue) => issue.message).join(' ')}`)
    this.name = 'QuestionBankValidationError'
    this.issues = error.issues
  }
}

/** Validates both a bare question array and `{ questions: [...] }`. */
export function parseQuestions(input: unknown): Question[] {
  const result = questionBankSchema.safeParse(input)
  if (!result.success) throw new QuestionBankValidationError(result.error)
  return result.data
}

export const validateQuestions = parseQuestions

export function safeParseQuestions(input: unknown): QuestionsValidationResult {
  const result = questionBankSchema.safeParse(input)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export const quizAnswerSchema: z.ZodType<QuizAnswer> = z.object({
  questionId: questionIdSchema,
  selectedAnswer: z.number().int().nonnegative().nullable(),
  isCorrect: z.boolean().optional(),
  answeredAt: isoDate.optional(),
  markedForReview: z.boolean().optional(),
})

export const topicStatisticsSchema: z.ZodType<TopicStatistics> = z
  .object({
    topic: nonEmptyText,
    chapter: nonEmptyText.optional(),
    answered: nonNegativeInteger,
    correct: nonNegativeInteger,
    incorrect: nonNegativeInteger,
    percentage,
  })
  .refine((statistic) => statistic.correct + statistic.incorrect === statistic.answered, {
    message: 'Os totais do assunto não são consistentes.',
  })

export const chapterStatisticsSchema: z.ZodType<ChapterStatistics> = z
  .object({
    chapter: nonEmptyText,
    answered: nonNegativeInteger,
    correct: nonNegativeInteger,
    incorrect: nonNegativeInteger,
    percentage,
  })
  .refine((statistic) => statistic.correct + statistic.incorrect === statistic.answered, {
    message: 'Os totais do capítulo não são consistentes.',
  })

export const questionResultSchema: z.ZodType<QuestionResult> = z
  .object({
    questionId: questionIdSchema,
    selectedAnswer: z.number().int().nonnegative().nullable(),
    correctAnswer: nonNegativeInteger,
    answered: z.boolean(),
    isCorrect: z.boolean(),
    chapter: nonEmptyText,
    topic: nonEmptyText,
    difficulty: z.enum(['easy', 'medium', 'hard']),
    question: questionSchema,
  })
  .superRefine((result, context) => {
    const selectedIsValid =
      result.selectedAnswer === null || result.selectedAnswer < result.question.options.length
    const metadataMatches =
      String(result.questionId) === String(result.question.id) &&
      result.correctAnswer === result.question.correctAnswer &&
      result.chapter === result.question.chapter &&
      result.topic === result.question.topic &&
      result.difficulty === result.question.difficulty
    const expectedAnswered = result.selectedAnswer !== null
    const expectedCorrect = expectedAnswered && result.selectedAnswer === result.correctAnswer

    if (!selectedIsValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedAnswer'],
        message: 'A resposta escolhida não existe na questão.',
      })
    }
    if (!metadataMatches || result.answered !== expectedAnswered || result.isCorrect !== expectedCorrect) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Os dados da resposta não são consistentes com a questão.',
      })
    }
  })

export const quizResultSchema: z.ZodType<QuizResult> = z
  .object({
    id: nonEmptyText,
    quizId: nonEmptyText,
    startedAt: isoDate,
    completedAt: isoDate,
    mode: z.enum(['complete', 'topics', 'errors', 'favorites', 'exam']),
    examId: z.string().trim().optional(),
    track: z.enum(['CTFL', 'CTAL-TAE', 'CT-FT', 'CT-AI']).optional(),
    totalQuestions: nonNegativeInteger,
    answeredQuestions: nonNegativeInteger,
    correctAnswers: nonNegativeInteger,
    incorrectAnswers: nonNegativeInteger,
    unansweredQuestions: nonNegativeInteger,
    percentage,
    durationSeconds: nonNegativeInteger,
    topics: z.array(nonEmptyText),
    answers: z.array(quizAnswerSchema),
    questionResults: z.array(questionResultSchema),
    topicStatistics: z.array(topicStatisticsSchema),
  })
  .superRefine((result, context) => {
    const answeredQuestions = result.questionResults.filter((item) => item.answered).length
    const correctAnswers = result.questionResults.filter((item) => item.isCorrect).length
    const sumsCorrectly =
      result.answeredQuestions + result.unansweredQuestions === result.totalQuestions &&
      result.correctAnswers + result.incorrectAnswers === result.answeredQuestions &&
      result.questionResults.length === result.totalQuestions &&
      result.answers.length === result.totalQuestions &&
      result.answeredQuestions === answeredQuestions &&
      result.correctAnswers === correctAnswers &&
      Math.abs(
        result.percentage -
          (result.totalQuestions === 0 ? 0 : (result.correctAnswers / result.totalQuestions) * 100),
      ) < 0.051

    if (!sumsCorrectly) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Os totais do resultado não são consistentes.',
      })
    }
  })

export const questionStatisticsSchema: z.ZodType<QuestionStatistics> = z.object({
  questionId: questionIdSchema,
  answered: nonNegativeInteger,
  correct: nonNegativeInteger,
  incorrect: nonNegativeInteger,
  percentage,
  lastAnsweredAt: isoDate.optional(),
  lastAnswerCorrect: z.boolean().optional(),
})

export const performancePointSchema: z.ZodType<PerformancePoint> = z.object({
  quizId: nonEmptyText,
  completedAt: isoDate,
  percentage,
})

export const userStatisticsSchema: z.ZodType<UserStatistics> = z.object({
  totalQuizzes: nonNegativeInteger,
  averagePercentage: percentage,
  bestPercentage: percentage,
  worstPercentage: percentage,
  lastPercentage: percentage,
  last5Average: percentage,
  last10Average: percentage,
  totalQuestionsAnswered: nonNegativeInteger,
  totalCorrectAnswers: nonNegativeInteger,
  totalIncorrectAnswers: nonNegativeInteger,
  overallAccuracy: percentage,
  topicStatistics: z.array(topicStatisticsSchema),
  chapterStatistics: z.array(chapterStatisticsSchema),
  weakTopics: z.array(topicStatisticsSchema),
  questionStatistics: z.array(questionStatisticsSchema),
  evolution: z.array(performancePointSchema),
})

export const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  activeTrack: z.enum(['CTFL', 'CTAL-TAE', 'CT-FT', 'CT-AI']),
  defaultQuestionCount: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(40)]),
  shuffleOptions: z.boolean(),
  defaultTimerMode: z.enum(['free', 'exam']),
  examDurationMinutes: z.number().int().positive().max(24 * 60),
  theme: z.enum(['light', 'dark', 'system']),
  syllabusVersion: nonEmptyText,
  minWeakTopicAnswers: z.number().int().positive(),
})

export const activeQuizSchema: z.ZodType<ActiveQuiz> = z
  .object({
    id: nonEmptyText,
    questions: questionsArraySchema,
    answers: z.record(z.string(), z.number().int().nonnegative().nullable()),
    reviewQuestionIds: z.array(questionIdSchema),
    currentIndex: nonNegativeInteger,
    startedAt: isoDate,
    updatedAt: isoDate,
    mode: z.enum(['complete', 'topics', 'errors', 'favorites', 'exam']),
    topics: z.array(nonEmptyText),
    timerMode: z.enum(['free', 'exam']),
    durationMinutes: z.number().int().positive().optional(),
    remainingSeconds: nonNegativeInteger.optional(),
    examId: z.string().trim().optional(),
    track: z.enum(['CTFL', 'CTAL-TAE', 'CT-FT', 'CT-AI']).optional(),
  })
  .superRefine((draft, context) => {
    if (draft.questions.length > 0 && draft.currentIndex >= draft.questions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentIndex'],
        message: 'A questão atual não existe no simulado.',
      })
    }

    const questionsById = new Map(draft.questions.map((question) => [String(question.id), question]))
    Object.entries(draft.answers).forEach(([id, selectedAnswer]) => {
      const question = questionsById.get(id)
      if (!question || (selectedAnswer !== null && selectedAnswer >= question.options.length)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answers', id],
          message: 'A resposta salva não corresponde a uma alternativa deste simulado.',
        })
      }
    })
  })

export const userProfileSchema = z.object({
  id: nonEmptyText,
  name: nonEmptyText,
  username: nonEmptyText,
  avatar: nonEmptyText,
  createdAt: isoDate,
  lastLoginAt: isoDate,
  passwordHash: z.string().optional(),
})

export const userProfilesArraySchema = z.array(userProfileSchema)

export const backupDataSchema: z.ZodType<BackupData> = z.object({
  version: z.literal(1),
  exportedAt: isoDate,
  history: z.array(quizResultSchema),
  statistics: userStatisticsSchema,
  favorites: z.array(questionIdSchema),
  settings: appSettingsSchema,
  draft: activeQuizSchema.nullable().optional(),
})

export function parseBackupData(input: string | unknown): BackupData {
  let value: unknown = input

  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown
    } catch {
      throw new Error('O arquivo de backup não contém JSON válido.')
    }
  }

  const result = backupDataSchema.safeParse(value)
  if (!result.success) {
    throw new Error(`Backup inválido: ${result.error.issues.map((issue) => issue.message).join(' ')}`)
  }

  return result.data
}
