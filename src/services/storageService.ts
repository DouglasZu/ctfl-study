import { z } from 'zod'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BackupData,
  type QuestionId,
  type QuizDraft,
  type QuizHistory,
  type QuizResult,
  type Theme,
  type UserStatistics,
} from '../types'
import { calculateUserStatistics } from '../utils/statistics'
import {
  activeQuizSchema,
  appSettingsSchema,
  parseBackupData,
  questionIdSchema,
  quizResultSchema,
  userStatisticsSchema,
} from '../utils/validation'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const STORAGE_KEYS = {
  history: 'ctfl-study:history',
  statistics: 'ctfl-study:statistics',
  favorites: 'ctfl-study:favorites',
  settings: 'ctfl-study:settings',
  draft: 'ctfl-study:draft',
} as const

export const storageKeys = { ...STORAGE_KEYS }

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function resolveBrowserStorage(): StorageLike {
  if (typeof window === 'undefined') return createMemoryStorage()

  try {
    const storage = window.localStorage
    // Access can throw when cookies/storage are disabled.
    void storage.length
    return storage
  } catch {
    return createMemoryStorage()
  }
}

function cloneDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS }
}

function readParsed<T>(storage: StorageLike, key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const serialized = storage.getItem(key)
    if (serialized === null) return fallback
    const result = schema.safeParse(JSON.parse(serialized) as unknown)
    return result.success ? result.data : fallback
  } catch {
    return fallback
  }
}

function writeJson(storage: StorageLike, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value))
}

function newestFirst(history: QuizHistory): QuizHistory {
  return [...history].sort(
    (left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt),
  )
}

export interface StorageService {
  getHistory(): QuizHistory
  saveQuizResult(result: QuizResult): QuizHistory
  getStatistics(): UserStatistics
  getFavorites(): QuestionId[]
  saveFavorites(favorites: Iterable<QuestionId>): QuestionId[]
  toggleFavorite(questionId: QuestionId): QuestionId[]
  exportData(): string
  importData(input: string | unknown): BackupData
  clearData(): void
  getSettings(): AppSettings
  saveSettings(settings: Partial<AppSettings>): AppSettings
  getTheme(): Theme
  setTheme(theme: Theme): AppSettings
  getDraft(): QuizDraft | null
  saveDraft(draft: QuizDraft): QuizDraft
  clearDraft(): void
}

export function createStorageService(storage: StorageLike = resolveBrowserStorage()): StorageService {
  const historySchema = z.array(quizResultSchema)
  const favoritesSchema = z.array(questionIdSchema)

  function getHistory(): QuizHistory {
    return newestFirst(readParsed(storage, STORAGE_KEYS.history, historySchema, []))
  }

  function getSettings(): AppSettings {
    const stored = readParsed<unknown>(storage, STORAGE_KEYS.settings, z.unknown(), null)
    const merged = {
      ...cloneDefaultSettings(),
      ...(stored && typeof stored === 'object' ? stored : {}),
    }
    const result = appSettingsSchema.safeParse(merged)
    return result.success ? result.data : cloneDefaultSettings()
  }

  function getStatistics(): UserStatistics {
    const settings = getSettings()
    const calculated = calculateUserStatistics(getHistory(), settings.minWeakTopicAnswers)

    // A derived value is preferred over a potentially stale stored snapshot.
    const stored = readParsed(storage, STORAGE_KEYS.statistics, userStatisticsSchema, calculated)
    return stored.totalQuizzes === calculated.totalQuizzes &&
      stored.totalQuestionsAnswered === calculated.totalQuestionsAnswered &&
      stored.totalCorrectAnswers === calculated.totalCorrectAnswers
      ? stored
      : calculated
  }

  function saveQuizResult(result: QuizResult): QuizHistory {
    const parsed = quizResultSchema.parse(result)
    const withoutSameId = getHistory().filter((entry) => entry.id !== parsed.id)
    const history = newestFirst([...withoutSameId, parsed])
    writeJson(storage, STORAGE_KEYS.history, history)
    writeJson(
      storage,
      STORAGE_KEYS.statistics,
      calculateUserStatistics(history, getSettings().minWeakTopicAnswers),
    )
    return history
  }

  function getFavorites(): QuestionId[] {
    const values = readParsed(storage, STORAGE_KEYS.favorites, favoritesSchema, [])
    return [...new Map(values.map((id) => [String(id), id])).values()]
  }

  function saveFavorites(favorites: Iterable<QuestionId>): QuestionId[] {
    const parsed = favoritesSchema.parse([...favorites])
    const unique = [...new Map(parsed.map((id) => [String(id), id])).values()]
    writeJson(storage, STORAGE_KEYS.favorites, unique)
    return unique
  }

  function toggleFavorite(questionId: QuestionId): QuestionId[] {
    const parsedId = questionIdSchema.parse(questionId)
    const favorites = getFavorites()
    const key = String(parsedId)
    const exists = favorites.some((favorite) => String(favorite) === key)
    return saveFavorites(
      exists ? favorites.filter((favorite) => String(favorite) !== key) : [...favorites, parsedId],
    )
  }

  function saveSettings(settings: Partial<AppSettings>): AppSettings {
    const next = appSettingsSchema.parse({ ...getSettings(), ...settings })
    writeJson(storage, STORAGE_KEYS.settings, next)

    // The weak-topic threshold is part of settings and changes derived statistics.
    writeJson(
      storage,
      STORAGE_KEYS.statistics,
      calculateUserStatistics(getHistory(), next.minWeakTopicAnswers),
    )
    return next
  }

  function getTheme(): Theme {
    return getSettings().theme
  }

  function setTheme(theme: Theme): AppSettings {
    return saveSettings({ theme })
  }

  function getDraft(): QuizDraft | null {
    return readParsed(storage, STORAGE_KEYS.draft, activeQuizSchema.nullable(), null)
  }

  function saveDraft(draft: QuizDraft): QuizDraft {
    const parsed = activeQuizSchema.parse({ ...draft, updatedAt: new Date().toISOString() })
    writeJson(storage, STORAGE_KEYS.draft, parsed)
    return parsed
  }

  function clearDraft(): void {
    storage.removeItem(STORAGE_KEYS.draft)
  }

  function exportData(): string {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      history: getHistory(),
      statistics: getStatistics(),
      favorites: getFavorites(),
      settings: getSettings(),
      draft: getDraft(),
    }
    return JSON.stringify(backup, null, 2)
  }

  function importData(input: string | unknown): BackupData {
    const parsed = parseBackupData(input)
    const settings = appSettingsSchema.parse(parsed.settings)
    const history = newestFirst(historySchema.parse(parsed.history))
    const favorites = [...new Map(parsed.favorites.map((id) => [String(id), id])).values()]
    const statistics = calculateUserStatistics(history, settings.minWeakTopicAnswers)
    const normalized: BackupData = {
      ...parsed,
      history,
      statistics,
      favorites,
      draft: parsed.draft ?? null,
    }

    const previous = Object.fromEntries(
      Object.values(STORAGE_KEYS).map((key) => [key, storage.getItem(key)]),
    ) as Record<string, string | null>

    try {
      writeJson(storage, STORAGE_KEYS.history, normalized.history)
      writeJson(storage, STORAGE_KEYS.statistics, normalized.statistics)
      writeJson(storage, STORAGE_KEYS.favorites, normalized.favorites)
      writeJson(storage, STORAGE_KEYS.settings, normalized.settings)
      if (normalized.draft) writeJson(storage, STORAGE_KEYS.draft, normalized.draft)
      else storage.removeItem(STORAGE_KEYS.draft)
    } catch (error) {
      Object.values(STORAGE_KEYS).forEach((key) => {
        const value = previous[key]
        if (value === null || value === undefined) storage.removeItem(key)
        else storage.setItem(key, value)
      })
      throw error
    }

    return normalized
  }

  function clearData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key))
  }

  return {
    getHistory,
    saveQuizResult,
    getStatistics,
    getFavorites,
    saveFavorites,
    toggleFavorite,
    exportData,
    importData,
    clearData,
    getSettings,
    saveSettings,
    getTheme,
    setTheme,
    getDraft,
    saveDraft,
    clearDraft,
  }
}

export const storageService = createStorageService()

export const getHistory = (): QuizHistory => storageService.getHistory()
export const saveQuizResult = (result: QuizResult): QuizHistory =>
  storageService.saveQuizResult(result)
export const getStatistics = (): UserStatistics => storageService.getStatistics()
export const getFavorites = (): QuestionId[] => storageService.getFavorites()
export const saveFavorites = (favorites: Iterable<QuestionId>): QuestionId[] =>
  storageService.saveFavorites(favorites)
export const toggleFavorite = (questionId: QuestionId): QuestionId[] =>
  storageService.toggleFavorite(questionId)
export const exportData = (): string => storageService.exportData()
export const importData = (input: string | unknown): BackupData => storageService.importData(input)
export const clearData = (): void => storageService.clearData()
export const getSettings = (): AppSettings => storageService.getSettings()
export const saveSettings = (settings: Partial<AppSettings>): AppSettings =>
  storageService.saveSettings(settings)
export const getTheme = (): Theme => storageService.getTheme()
export const setTheme = (theme: Theme): AppSettings => storageService.setTheme(theme)
export const getDraft = (): QuizDraft | null => storageService.getDraft()
export const saveDraft = (draft: QuizDraft): QuizDraft => storageService.saveDraft(draft)
export const clearDraft = (): void => storageService.clearDraft()
