/** Domain models shared by the UI, business rules and persistence layer. */

export type QuestionId = string | number

export type Difficulty = 'easy' | 'medium' | 'hard'
export type KLevel = 'K1' | 'K2' | 'K3'
export type CertificationTrack = 'CTFL' | 'CTAL-TAE' | 'CT-FT' | 'CT-AI'

export interface CertificationTrackInfo {
  id: CertificationTrack
  code: string
  title: string
  shortTitle: string
  subtitle: string
  description: string
  badge: string
  accentColor: string
  questionCount: number
  passingPercentage: number
  durationMinutes: number
}

export const CERTIFICATION_TRACKS: readonly CertificationTrackInfo[] = [
  {
    id: 'CTFL',
    code: 'CTFL 4.0',
    title: 'CTFL 4.0 - Certified Tester Foundation Level',
    shortTitle: 'CTFL (Fundamentos)',
    subtitle: 'Base essencial e universal da engenharia de testes de software',
    description: 'Fundamentos, Ciclo de Vida, Teste Estático, Técnicas de Teste, Gerenciamento e Ferramentas.',
    badge: 'Foundation',
    accentColor: '#3b82f6',
    questionCount: 40,
    passingPercentage: 65,
    durationMinutes: 60,
  },
  {
    id: 'CTAL-TAE',
    code: 'CTAL-TAE',
    title: 'CTAL-TAE - Test Automation Engineer',
    shortTitle: 'CTAL-TAE (Automação)',
    subtitle: 'Nível Avançado para Engenharia e Arquitetura de Automação de Testes',
    description: 'Arquitetura gTAA/TAA, Estratégia e Riscos, Desenvolvimento do TAS, Métricas e Manutenção.',
    badge: 'Advanced',
    accentColor: '#8b5cf6',
    questionCount: 40,
    passingPercentage: 65,
    durationMinutes: 90,
  },
  {
    id: 'CT-FT',
    code: 'CT-FT',
    title: 'CT-FT - Financial Tester (Mercado Financeiro)',
    shortTitle: 'CT-FT (Financeiro / Fintech)',
    subtitle: 'Especialista em Testes de Sistemas Financeiros, Bancários e Pagamentos',
    description: 'Sistemas de Pagamentos/Pix/SWIFT, Reconciliação, Prevenção a Fraude, PCI-DSS e BACEN.',
    badge: 'Specialist',
    accentColor: '#10b981',
    questionCount: 40,
    passingPercentage: 65,
    durationMinutes: 60,
  },
  {
    id: 'CT-AI',
    code: 'CT-AI',
    title: 'CT-AI / CT-GenAI - AI & Generative AI Testing',
    shortTitle: 'CT-AI (Inteligência Artificial)',
    subtitle: 'Testes de Sistemas de IA, Machine Learning e Modelos Generativos (LLMs)',
    description: 'Testes de ML, Teste Metamórfico, Alucinação, Prompt Injection, Viés/Fairness e Métricas de LLMs.',
    badge: 'AI Specialist',
    accentColor: '#ec4899',
    questionCount: 40,
    passingPercentage: 65,
    durationMinutes: 60,
  },
] as const

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
  kLevel?: KLevel
  syllabusRef?: string
  examId?: string
  track?: CertificationTrack
}

export type QuizMode = 'complete' | 'topics' | 'errors' | 'favorites' | 'exam'
export type TimerMode = 'free' | 'exam'
export type Theme = 'light' | 'dark' | 'system'

export interface OfficialExamInfo {
  id: string
  track: CertificationTrack
  title: string
  badge: string
  description: string
  questionCount: number
  durationMinutes: number
}

export interface Quiz {
  id: string
  questions: Question[]
  createdAt: string
  mode: QuizMode
  topics: string[]
  timerMode: TimerMode
  durationMinutes?: number
  examId?: string
  track?: CertificationTrack
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
  examId?: string
  track?: CertificationTrack
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
  examId?: string
  track?: CertificationTrack
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
  activeTrack: CertificationTrack
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

export interface UserProfile {
  id: string
  name: string
  username: string
  avatar: string
  createdAt: string
  lastLoginAt: string
  passwordHash?: string
}

export interface AuthSession {
  userId: string
  user: UserProfile
  token: string
  createdAt: string
}

export const DEFAULT_AVATARS: readonly string[] = [
  '👨‍💻',
  '👩‍💻',
  '🚀',
  '🎯',
  '🦊',
  '🦁',
  '🤖',
  '🦉',
  '⚡',
  '💎',
  '🌟',
  '🏆',
]

export const GUEST_USER: UserProfile = {
  id: 'guest',
  name: 'Convidado',
  username: 'guest',
  avatar: '👤',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: '2026-01-01T00:00:00.000Z',
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeTrack: 'CTFL',
  defaultQuestionCount: 40,
  shuffleOptions: true,
  defaultTimerMode: 'free',
  examDurationMinutes: 60,
  theme: 'system',
  syllabusVersion: '4.0',
  minWeakTopicAnswers: 2,
}
