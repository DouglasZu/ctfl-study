/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import rawQuestions from '../data/questions.json'
import { storageService } from '../services'
import {
  CERTIFICATION_TRACKS,
  type ActiveQuiz,
  type AppSettings,
  type CertificationTrack,
  type CertificationTrackInfo,
  type PerformanceClassification,
  type Question,
  type QuestionId,
  type QuizHistory,
  type QuizMode,
  type QuizResult,
  type Theme,
  type TimerMode,
  type UserStatistics,
} from '../types'
import {
  calculateQuizResult,
  calculateUserStatistics,
  classifyPerformance,
  createActiveQuiz,
  createQuiz,
  quizFromActiveQuiz,
  safeParseQuestions,
  selectErrorTrainingQuestions,
  selectQuestions,
  shuffleQuestionOptions,
} from '../utils'
import { useAuth } from './useAuth'

export interface QuizSetup {
  mode: QuizMode
  questionCount: number
  topics: string[]
  chapters?: string[]
  examId?: string
  timerMode: TimerMode
  durationMinutes?: number
  shuffleOptions: boolean
}

export type StartQuizOutcome =
  | { ok: true; draft: ActiveQuiz }
  | { ok: false; message: string }

interface StudyAppValue {
  activeTrack: CertificationTrack
  activeTrackInfo: CertificationTrackInfo
  setActiveTrack: (track: CertificationTrack) => void
  allQuestions: Question[]
  questions: Question[]
  questionBankIssues: string[]
  history: QuizHistory
  allHistory: QuizHistory
  statistics: UserStatistics
  favorites: QuestionId[]
  settings: AppSettings
  draft: ActiveQuiz | null
  draftTrackInfo: CertificationTrackInfo
  continueDraft: () => void
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
  const { currentUser } = useAuth()
  const [allHistory, setAllHistory] = useState<QuizHistory>(() => storageService.getHistory(currentUser.id))
  const [favorites, setFavorites] = useState<QuestionId[]>(() => storageService.getFavorites(currentUser.id))
  const [settings, setSettingsState] = useState<AppSettings>(() => storageService.getSettings(currentUser.id))
  const [rawDraft, setRawDraft] = useState<ActiveQuiz | null>(() => storageService.getDraft(currentUser.id))

  useEffect(() => {
    setAllHistory(storageService.getHistory(currentUser.id))
    setFavorites(storageService.getFavorites(currentUser.id))
    setSettingsState(storageService.getSettings(currentUser.id))
    setRawDraft(storageService.getDraft(currentUser.id))
  }, [currentUser.id])

  const activeTrack = settings.activeTrack ?? 'CTFL'
  const activeTrackInfo: CertificationTrackInfo = useMemo(
    () => (CERTIFICATION_TRACKS.find((track) => track.id === activeTrack) ?? CERTIFICATION_TRACKS[0]) as CertificationTrackInfo,
    [activeTrack],
  )

  const draftTrack = rawDraft?.track ?? activeTrack
  const draftTrackInfo: CertificationTrackInfo = useMemo(
    () => (CERTIFICATION_TRACKS.find((track) => track.id === draftTrack) ?? CERTIFICATION_TRACKS[0]) as CertificationTrackInfo,
    [draftTrack],
  )

  const trackQuestions = useMemo(
    () => validQuestions.filter((q) => (q.track ?? 'CTFL') === activeTrack),
    [activeTrack],
  )

  const trackHistory = useMemo(
    () => allHistory.filter((h) => (h.track ?? 'CTFL') === activeTrack),
    [allHistory, activeTrack],
  )

  const trackStatistics = useMemo(
    () => (trackHistory.length > 0 ? calculateUserStatistics(trackHistory) : EMPTY_STATISTICS),
    [trackHistory],
  )

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
      setAllHistory(storageService.getHistory(currentUser.id))
      setFavorites(storageService.getFavorites(currentUser.id))
      setSettingsState(storageService.getSettings(currentUser.id))
      setRawDraft(storageService.getDraft(currentUser.id))
    }
    window.addEventListener('storage', syncTabs)
    return () => window.removeEventListener('storage', syncTabs)
  }, [currentUser.id])

  const classification = useMemo(
    () => classifyPerformance(trackStatistics.overallAccuracy),
    [trackStatistics.overallAccuracy],
  )

  function setActiveTrack(track: CertificationTrack) {
    updateSettings({ activeTrack: track })
  }

  function continueDraft() {
    if (rawDraft && rawDraft.track && rawDraft.track !== activeTrack) {
      setActiveTrack(rawDraft.track)
    }
  }

  function persistDraft(nextDraft: ActiveQuiz) {
    const saved = storageService.saveDraft(nextDraft, currentUser.id)
    setRawDraft(saved)
  }

  function startQuiz(setup: QuizSetup): StartQuizOutcome {
    if (trackQuestions.length === 0) {
      return { ok: false, message: `O banco não possui questões válidas para a trilha ${activeTrackInfo.shortTitle}.` }
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
    if (setup.mode === 'exam' && setup.examId) {
      const examQuestions = trackQuestions.filter((q) => q.examId === setup.examId)
      if (examQuestions.length === 0) {
        return { ok: false, message: 'Simulado oficial não encontrado para esta certificação.' }
      }
      selected = setup.shuffleOptions
        ? examQuestions.map((q) => shuffleQuestionOptions(q))
        : examQuestions.map((q) => ({ ...q, options: [...q.options] }))
    } else if (setup.mode === 'errors') {
      const wrongIds = new Set(
        trackHistory.flatMap((result) => result.questionResults)
          .filter((item) => item.answered && !item.isCorrect)
          .map((item) => String(item.questionId)),
      )
      if (wrongIds.size === 0) {
        return { ok: false, message: `Ainda não há erros registrados nesta trilha (${activeTrackInfo.shortTitle}).` }
      }
      selected = selectErrorTrainingQuestions(trackQuestions, setup.questionCount, trackHistory, {
        shuffleOptions: setup.shuffleOptions,
      })
    } else if (setup.mode === 'favorites') {
      const favoriteIds = new Set(favorites.map(String))
      const favoriteQuestions = trackQuestions.filter((question) => favoriteIds.has(String(question.id)))
      if (favoriteQuestions.length === 0) {
        return { ok: false, message: `Você não possui questões favoritas salvas nesta trilha (${activeTrackInfo.shortTitle}).` }
      }
      selected = selectQuestions(favoriteQuestions, setup.questionCount, {
        history: trackHistory,
        shuffleOptions: setup.shuffleOptions,
      })
    } else {
      selected = selectQuestions(trackQuestions, setup.questionCount, {
        history: trackHistory,
        topics: setup.mode === 'topics' && setup.topics.length > 0 ? setup.topics : undefined,
        chapters: setup.chapters && setup.chapters.length > 0 ? setup.chapters : undefined,
        shuffleOptions: setup.shuffleOptions,
      })
    }

    if (selected.length === 0) {
      return { ok: false, message: 'Nenhuma questão corresponde aos filtros selecionados nesta certificação.' }
    }

    const quiz = createQuiz(selected, {
      mode: setup.mode,
      topics: [...new Set(selected.map((question) => question.topic))],
      timerMode: setup.timerMode,
      durationMinutes: setup.timerMode === 'exam' ? durationMinutes : undefined,
      examId: setup.examId,
      track: activeTrack,
    })
    const nextDraft = createActiveQuiz(quiz)
    persistDraft(nextDraft)
    return { ok: true, draft: nextDraft }
  }

  function selectAnswer(questionId: QuestionId, selectedAnswer: number) {
    if (!rawDraft) return
    const question = rawDraft.questions.find((item) => String(item.id) === String(questionId))
    if (!question || !Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= question.options.length) return
    persistDraft({
      ...rawDraft,
      answers: { ...rawDraft.answers, [String(questionId)]: selectedAnswer },
      updatedAt: new Date().toISOString(),
    })
  }

  function setCurrentQuestion(index: number) {
    if (!rawDraft || !Number.isInteger(index)) return
    const currentIndex = Math.max(0, Math.min(rawDraft.questions.length - 1, index))
    persistDraft({ ...rawDraft, currentIndex, updatedAt: new Date().toISOString() })
  }

  function toggleQuestionReview(questionId: QuestionId) {
    if (!rawDraft) return
    const exists = rawDraft.reviewQuestionIds.some((id) => String(id) === String(questionId))
    const reviewQuestionIds = exists
      ? rawDraft.reviewQuestionIds.filter((id) => String(id) !== String(questionId))
      : [...rawDraft.reviewQuestionIds, questionId]
    persistDraft({ ...rawDraft, reviewQuestionIds, updatedAt: new Date().toISOString() })
  }

  function toggleFavorite(questionId: QuestionId) {
    setFavorites(storageService.toggleFavorite(questionId, currentUser.id))
  }

  function finishQuiz(): QuizResult | null {
    if (!rawDraft) return null
    const elapsed = Math.max(0, Math.round((Date.now() - new Date(rawDraft.startedAt).getTime()) / 1000))
    const durationSeconds = rawDraft.timerMode === 'exam' && rawDraft.durationMinutes
      ? Math.min(elapsed, rawDraft.durationMinutes * 60)
      : elapsed
    const result = calculateQuizResult(quizFromActiveQuiz(rawDraft), rawDraft.answers, { durationSeconds })
    const nextHistory = storageService.saveQuizResult(result, currentUser.id)
    storageService.clearDraft(currentUser.id)
    setAllHistory(nextHistory)
    setRawDraft(null)
    return result
  }

  function discardQuiz() {
    storageService.clearDraft(currentUser.id)
    setRawDraft(null)
  }

  function updateSettings(patch: Partial<AppSettings>): AppSettings {
    const next = storageService.saveSettings(patch, currentUser.id)
    setSettingsState(next)
    return next
  }

  function setTheme(theme: Theme): AppSettings {
    const next = storageService.setTheme(theme, currentUser.id)
    setSettingsState(next)
    return next
  }

  function exportBackup(): string {
    return storageService.exportData(currentUser.id)
  }

  function importBackup(input: string | unknown) {
    storageService.importData(input, currentUser.id)
    setAllHistory(storageService.getHistory(currentUser.id))
    setFavorites(storageService.getFavorites(currentUser.id))
    setSettingsState(storageService.getSettings(currentUser.id))
    setRawDraft(storageService.getDraft(currentUser.id))
  }

  function clearAllData() {
    storageService.clearData(currentUser.id)
    setAllHistory([])
    setFavorites([])
    setSettingsState(storageService.getSettings(currentUser.id))
    setRawDraft(null)
  }

  const value: StudyAppValue = {
    activeTrack,
    activeTrackInfo,
    setActiveTrack,
    allQuestions: validQuestions,
    questions: trackQuestions,
    questionBankIssues: validationIssues,
    history: trackHistory,
    allHistory,
    statistics: trackStatistics,
    favorites,
    settings,
    draft: rawDraft,
    draftTrackInfo,
    continueDraft,
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
