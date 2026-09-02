/** Domain models shared by the UI, business rules and persistence layer. */

export type QuestionId = string | number

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: QuestionId
  question: string
  options: string[]
  /** Zero-based index into `options`. */
  correctAnswer: number
  explanation: string
  chapter: string
  topic: string
  difficulty: Difficulty
}

export type QuizMode = 'complete' | 'topics' | 'errors' | 'favorites'
export type TimerMode = 'free' | 'exam'
export type Theme = 'light' | 'dark' | 'system'

export interface Quiz {
  id: string
  questions: Question[]
  createdAt: string
  mode: QuizMode
  topics: string[]
  timerMode: TimerMode
  durationMinutes?: number
}

export interface QuizAnswer {
  questionId: QuestionId
  /** `null` represents an unanswered question. */
  selectedAnswer: number | null
  isCorrect?: boolean
  answeredAt?: string
  markedForReview?: boolean
}

/** A serializable answer map. Question ids are normalized with `String(id)`. */
export type QuizAnswerMap = Record<string, number | null>

/** The complete in-progress state required to safely resume a quiz. */
export interface ActiveQuiz {
  id: string
  questions: Question[]
  answers: QuizAnswerMap
  reviewQuestionIds: QuestionId[]
  currentIndex: number
  startedAt: string
  updatedAt: string
  mode: QuizMode
  topics: string[]
  timerMode: TimerMode
  durationMinutes?: number
  remainingSeconds?: number
}

/** Alias used by consumers that call an active quiz a session. */
export type QuizSession = ActiveQuiz
export type QuizDraft = ActiveQuiz

export interface QuestionResult {
  questionId: QuestionId
  selectedAnswer: number | null
  correctAnswer: number
  answered: boolean
  isCorrect: boolean
  chapter: string
  topic: string
  difficulty: Difficulty
  /** Snapshot keeps old history reviewable if the question bank later changes. */
  question: Question
}

export interface TopicStatistics {
  topic: string
  chapter?: string
  answered: number
  correct: number
  incorrect: number
  percentage: number
}

export interface ChapterStatistics {
  chapter: string
  answered: number
  correct: number
  incorrect: number
  percentage: number
}

export interface QuizResult {
  id: string
  quizId: string
  startedAt: string
  completedAt: string
  mode: QuizMode
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  percentage: number
  durationSeconds: number
  topics: string[]
  answers: QuizAnswer[]
  questionResults: QuestionResult[]
  topicStatistics: TopicStatistics[]
}

export type QuizHistory = QuizResult[]

export interface QuestionStatistics {
  questionId: QuestionId
  answered: number
  correct: number
  incorrect: number
  percentage: number
  lastAnsweredAt?: string
  lastAnswerCorrect?: boolean
}

export interface PerformancePoint {
  quizId: string
  completedAt: string
  percentage: number
}

export interface UserStatistics {
  totalQuizzes: number
  averagePercentage: number
  bestPercentage: number
  worstPercentage: number
  lastPercentage: number
  last5Average: number
  last10Average: number
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  totalIncorrectAnswers: number
  overallAccuracy: number
  topicStatistics: TopicStatistics[]
  chapterStatistics: ChapterStatistics[]
  weakTopics: TopicStatistics[]
  questionStatistics: QuestionStatistics[]
  evolution: PerformancePoint[]
}

export interface AppSettings {
  defaultQuestionCount: 10 | 20 | 30 | 40
  shuffleOptions: boolean
  defaultTimerMode: TimerMode
  examDurationMinutes: number
  theme: Theme
  syllabusVersion: string
  minWeakTopicAnswers: number
}

export interface BackupData {
  version: 1
  exportedAt: string
  history: QuizHistory
  statistics: UserStatistics
  favorites: QuestionId[]
  settings: AppSettings
  /** Optional for compatibility with backups created before draft persistence. */
  draft?: QuizDraft | null
}

export interface PerformanceClassification {
  key: 'needs-study' | 'attention' | 'good' | 'very-good' | 'excellent'
  label: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultQuestionCount: 40,
  shuffleOptions: true,
  defaultTimerMode: 'free',
  examDurationMinutes: 60,
  theme: 'system',
  syllabusVersion: '4.0',
  minWeakTopicAnswers: 2,
}
