/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import rawQuestions from '../data/questions.json'
import { storageService } from '../services'
import type {
  ActiveQuiz,
  AppSettings,
  PerformanceClassification,
  Question,
  QuestionId,
  QuizHistory,
  QuizMode,
  QuizResult,
  Theme,
  TimerMode,
  UserStatistics,
} from '../types'
import {
  calculateQuizResult,
  classifyPerformance,
  createActiveQuiz,
  createQuiz,
  quizFromActiveQuiz,
  safeParseQuestions,
  selectErrorTrainingQuestions,
  selectQuestions,
} from '../utils'

export interface QuizSetup {
  mode: QuizMode
  questionCount: number
  topics: string[]
  timerMode: TimerMode
  durationMinutes?: number
  shuffleOptions: boolean
}

export type StartQuizOutcome =
  | { ok: true; draft: ActiveQuiz }
  | { ok: false; message: string }

interface StudyAppValue {
  questions: Question[]
  questionBankIssues: string[]
  history: QuizHistory
  statistics: UserStatistics
  favorites: QuestionId[]
  settings: AppSettings
  draft: ActiveQuiz | null
  classification: PerformanceClassification
  startQuiz: (setup: QuizSetup) => StartQuizOutcome
  selectAnswer: (questionId: QuestionId, selectedAnswer: number) => void
  setCurrentQuestion: (index: number) => void
  toggleQuestionReview: (questionId: QuestionId) => void
  toggleFavorite: (questionId: QuestionId) => void
  finishQuiz: () => QuizResult | null
  discardQuiz: () => void
  updateSettings: (patch: Partial<AppSettings>) => AppSettings
  setTheme: (theme: Theme) => AppSettings
  exportBackup: () => string
  importBackup: (input: string | unknown) => void
  clearAllData: () => void
}

const questionValidation = safeParseQuestions(rawQuestions)
const validQuestions = questionValidation.success ? questionValidation.data : []
const validationIssues = questionValidation.success
  ? []
  : questionValidation.error.issues.map((issue) => {
      const location = issue.path.length > 0 ? ` (${issue.path.join(' › ')})` : ''
      return `${issue.message}${location}`
    })

const EMPTY_STATISTICS: UserStatistics = {
  totalQuizzes: 0,
  averagePercentage: 0,
  bestPercentage: 0,
  worstPercentage: 0,
  lastPercentage: 0,
  last5Average: 0,
  last10Average: 0,
  totalQuestionsAnswered: 0,
  totalCorrectAnswers: 0,
  totalIncorrectAnswers: 0,
  overallAccuracy: 0,
  topicStatistics: [],
  chapterStatistics: [],
  weakTopics: [],
  questionStatistics: [],
  evolution: [],
}

const StudyAppContext = createContext<StudyAppValue | null>(null)

function applyTheme(theme: Theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeMeta?.setAttribute('content', resolved === 'dark' ? '#0d1715' : '#f5f5ef')
}

export function StudyAppProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<QuizHistory>(() => storageService.getHistory())
  const [statistics, setStatistics] = useState<UserStatistics>(() => {
    try { return storageService.getStatistics() } catch { return EMPTY_STATISTICS }
  })
  const [favorites, setFavorites] = useState<QuestionId[]>(() => storageService.getFavorites())
  const [settings, setSettingsState] = useState<AppSettings>(() => storageService.getSettings())
  const [draft, setDraft] = useState<ActiveQuiz | null>(() => storageService.getDraft())

  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme('system')
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [settings.theme])

  useEffect(() => {
    const syncTabs = () => {
      setHistory(storageService.getHistory())
      setStatistics(storageService.getStatistics())
      setFavorites(storageService.getFavorites())
      setSettingsState(storageService.getSettings())
      setDraft(storageService.getDraft())
    }
    window.addEventListener('storage', syncTabs)
    return () => window.removeEventListener('storage', syncTabs)
  }, [])

  const classification = useMemo(
    () => classifyPerformance(statistics.overallAccuracy),
    [statistics.overallAccuracy],
  )

  function persistDraft(nextDraft: ActiveQuiz) {
    const saved = storageService.saveDraft(nextDraft)
    setDraft(saved)
  }

  function startQuiz(setup: QuizSetup): StartQuizOutcome {
    if (validQuestions.length === 0) {
      return { ok: false, message: 'O banco não possui questões válidas para iniciar um simulado.' }
    }

    if (!Number.isFinite(setup.questionCount) || setup.questionCount <= 0) {
      return { ok: false, message: 'Escolha uma quantidade válida de questões.' }
    }

    const durationMinutes = setup.durationMinutes
    if (
      setup.timerMode === 'exam' &&
      (typeof durationMinutes !== 'number' ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 24 * 60)
    ) {
      return { ok: false, message: 'Defina um tempo válido para o modo prova.' }
    }

    let selected: Question[]
    if (setup.mode === 'errors') {
      const wrongIds = new Set(
        history.flatMap((result) => result.questionResults)
          .filter((item) => item.answered && !item.isCorrect)
          .map((item) => String(item.questionId)),
      )
      if (wrongIds.size === 0) {
        return { ok: false, message: 'Ainda não há questões respondidas incorretamente para treinar.' }
      }
      selected = selectErrorTrainingQuestions(validQuestions, setup.questionCount, history, {
        shuffleOptions: setup.shuffleOptions,
      })
    } else if (setup.mode === 'favorites') {
      const favoriteIds = new Set(favorites.map(String))
      const favoriteQuestions = validQuestions.filter((question) => favoriteIds.has(String(question.id)))
      if (favoriteQuestions.length === 0) {
        return { ok: false, message: 'Você ainda não possui questões favoritas disponíveis.' }
      }
      selected = selectQuestions(favoriteQuestions, setup.questionCount, {
        history,
        shuffleOptions: setup.shuffleOptions,
      })
    } else {
      selected = selectQuestions(validQuestions, setup.questionCount, {
        history,
        topics: setup.mode === 'topics' ? setup.topics : undefined,
        shuffleOptions: setup.shuffleOptions,
      })
    }

    if (selected.length === 0) {
      return { ok: false, message: 'Nenhuma questão corresponde aos filtros selecionados.' }
    }

    const quiz = createQuiz(selected, {
      mode: setup.mode,
      topics: [...new Set(selected.map((question) => question.topic))],
      timerMode: setup.timerMode,
      durationMinutes: setup.timerMode === 'exam' ? durationMinutes : undefined,
    })
    const nextDraft = createActiveQuiz(quiz)
    persistDraft(nextDraft)
    return { ok: true, draft: nextDraft }
  }

  function selectAnswer(questionId: QuestionId, selectedAnswer: number) {
    if (!draft) return
    const question = draft.questions.find((item) => String(item.id) === String(questionId))
    if (!question || !Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= question.options.length) return
    persistDraft({
      ...draft,
      answers: { ...draft.answers, [String(questionId)]: selectedAnswer },
      updatedAt: new Date().toISOString(),
    })
  }

  function setCurrentQuestion(index: number) {
    if (!draft || !Number.isInteger(index)) return
    const currentIndex = Math.max(0, Math.min(draft.questions.length - 1, index))
    persistDraft({ ...draft, currentIndex, updatedAt: new Date().toISOString() })
  }

  function toggleQuestionReview(questionId: QuestionId) {
    if (!draft) return
    const exists = draft.reviewQuestionIds.some((id) => String(id) === String(questionId))
    const reviewQuestionIds = exists
      ? draft.reviewQuestionIds.filter((id) => String(id) !== String(questionId))
      : [...draft.reviewQuestionIds, questionId]
    persistDraft({ ...draft, reviewQuestionIds, updatedAt: new Date().toISOString() })
  }

  function toggleFavorite(questionId: QuestionId) {
    setFavorites(storageService.toggleFavorite(questionId))
  }

  function finishQuiz(): QuizResult | null {
    if (!draft) return null
    const elapsed = Math.max(0, Math.round((Date.now() - new Date(draft.startedAt).getTime()) / 1000))
    const durationSeconds = draft.timerMode === 'exam' && draft.durationMinutes
      ? Math.min(elapsed, draft.durationMinutes * 60)
      : elapsed
    const result = calculateQuizResult(quizFromActiveQuiz(draft), draft.answers, { durationSeconds })
    const nextHistory = storageService.saveQuizResult(result)
    storageService.clearDraft()
    setHistory(nextHistory)
    setStatistics(storageService.getStatistics())
    setDraft(null)
    return result
  }

  function discardQuiz() {
    storageService.clearDraft()
    setDraft(null)
  }

  function updateSettings(patch: Partial<AppSettings>): AppSettings {
    const next = storageService.saveSettings(patch)
    setSettingsState(next)
    setStatistics(storageService.getStatistics())
    return next
  }

  function setTheme(theme: Theme): AppSettings {
    const next = storageService.setTheme(theme)
    setSettingsState(next)
    return next
  }

  function exportBackup(): string {
    return storageService.exportData()
  }

  function importBackup(input: string | unknown) {
    storageService.importData(input)
    setHistory(storageService.getHistory())
    setStatistics(storageService.getStatistics())
    setFavorites(storageService.getFavorites())
    setSettingsState(storageService.getSettings())
    setDraft(storageService.getDraft())
  }

  function clearAllData() {
    storageService.clearData()
    setHistory([])
    setStatistics(EMPTY_STATISTICS)
    setFavorites([])
    setSettingsState(storageService.getSettings())
    setDraft(null)
  }

  const value: StudyAppValue = {
    questions: validQuestions,
    questionBankIssues: validationIssues,
    history,
    statistics,
    favorites,
    settings,
    draft,
    classification,
    startQuiz,
    selectAnswer,
    setCurrentQuestion,
    toggleQuestionReview,
    toggleFavorite,
    finishQuiz,
    discardQuiz,
    updateSettings,
    setTheme,
    exportBackup,
    importBackup,
    clearAllData,
  }

  return <StudyAppContext.Provider value={value}>{children}</StudyAppContext.Provider>
}

export function useStudyApp(): StudyAppValue {
  const context = useContext(StudyAppContext)
  if (!context) throw new Error('useStudyApp precisa ser usado dentro de StudyAppProvider.')
  return context
}
