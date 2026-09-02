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
  setUserId(userId: string | null): void
  getUserId(): string
  getHistory(userId?: string): QuizHistory
  saveQuizResult(result: QuizResult, userId?: string): QuizHistory
  getStatistics(userId?: string): UserStatistics
  getFavorites(userId?: string): QuestionId[]
  saveFavorites(favorites: Iterable<QuestionId>, userId?: string): QuestionId[]
  toggleFavorite(questionId: QuestionId, userId?: string): QuestionId[]
  exportData(userId?: string): string
  importData(input: string | unknown, userId?: string): BackupData
  clearData(userId?: string): void
  getSettings(userId?: string): AppSettings
  saveSettings(settings: Partial<AppSettings>, userId?: string): AppSettings
  getTheme(userId?: string): Theme
  setTheme(theme: Theme, userId?: string): AppSettings
  getDraft(userId?: string): QuizDraft | null
  saveDraft(draft: QuizDraft, userId?: string): QuizDraft
  clearDraft(userId?: string): void
}

export function createStorageService(
  storage: StorageLike = resolveBrowserStorage(),
  initialUserId: string | null = null,
): StorageService {
  const historySchema = z.array(quizResultSchema)
  const favoritesSchema = z.array(questionIdSchema)
  let activeUser = initialUserId || 'guest'

  function getKeys(userId?: string) {
    const uid = userId || activeUser || 'guest'
    if (uid === 'guest') {
      return STORAGE_KEYS
    }
    return {
      history: `ctfl-study:user:${uid}:history`,
      statistics: `ctfl-study:user:${uid}:statistics`,
      favorites: `ctfl-study:user:${uid}:favorites`,
      settings: `ctfl-study:user:${uid}:settings`,
      draft: `ctfl-study:user:${uid}:draft`,
    }
  }

  function setUserId(userId: string | null): void {
    activeUser = userId || 'guest'
  }

  function getUserId(): string {
    return activeUser
  }

  function getHistory(userId?: string): QuizHistory {
    const keys = getKeys(userId)
    return newestFirst(readParsed(storage, keys.history, historySchema, []))
  }

  function getSettings(userId?: string): AppSettings {
    const keys = getKeys(userId)
    const stored = readParsed<unknown>(storage, keys.settings, z.unknown(), null)
    const merged = {
      ...cloneDefaultSettings(),
      ...(stored && typeof stored === 'object' ? stored : {}),
    }
    const result = appSettingsSchema.safeParse(merged)
    return result.success ? result.data : cloneDefaultSettings()
  }

  function getStatistics(userId?: string): UserStatistics {
    const keys = getKeys(userId)
    const settings = getSettings(userId)
    const calculated = calculateUserStatistics(getHistory(userId), settings.minWeakTopicAnswers)

    // A derived value is preferred over a potentially stale stored snapshot.
    const stored = readParsed(storage, keys.statistics, userStatisticsSchema, calculated)
    return stored.totalQuizzes === calculated.totalQuizzes &&
      stored.totalQuestionsAnswered === calculated.totalQuestionsAnswered &&
      stored.totalCorrectAnswers === calculated.totalCorrectAnswers
      ? stored
      : calculated
  }

  function saveQuizResult(result: QuizResult, userId?: string): QuizHistory {
    const keys = getKeys(userId)
    const parsed = quizResultSchema.parse(result)
    const withoutSameId = getHistory(userId).filter((entry) => entry.id !== parsed.id)
    const history = newestFirst([...withoutSameId, parsed])
    writeJson(storage, keys.history, history)
    writeJson(
      storage,
      keys.statistics,
      calculateUserStatistics(history, getSettings(userId).minWeakTopicAnswers),
    )
    return history
  }

  function getFavorites(userId?: string): QuestionId[] {
    const keys = getKeys(userId)
    const values = readParsed(storage, keys.favorites, favoritesSchema, [])
    return [...new Map(values.map((id) => [String(id), id])).values()]
  }

  function saveFavorites(favorites: Iterable<QuestionId>, userId?: string): QuestionId[] {
    const keys = getKeys(userId)
    const parsed = favoritesSchema.parse([...favorites])
    const unique = [...new Map(parsed.map((id) => [String(id), id])).values()]
    writeJson(storage, keys.favorites, unique)
    return unique
  }

  function toggleFavorite(questionId: QuestionId, userId?: string): QuestionId[] {
    const parsedId = questionIdSchema.parse(questionId)
    const favorites = getFavorites(userId)
    const key = String(parsedId)
    const exists = favorites.some((favorite) => String(favorite) === key)
    return saveFavorites(
      exists ? favorites.filter((favorite) => String(favorite) !== key) : [...favorites, parsedId],
      userId,
    )
  }

  function saveSettings(settings: Partial<AppSettings>, userId?: string): AppSettings {
    const keys = getKeys(userId)
    const next = appSettingsSchema.parse({ ...getSettings(userId), ...settings })
    writeJson(storage, keys.settings, next)

    // The weak-topic threshold is part of settings and changes derived statistics.
    writeJson(
      storage,
      keys.statistics,
      calculateUserStatistics(getHistory(userId), next.minWeakTopicAnswers),
    )
    return next
  }

  function getTheme(userId?: string): Theme {
    return getSettings(userId).theme
  }

  function setTheme(theme: Theme, userId?: string): AppSettings {
    return saveSettings({ theme }, userId)
  }

  function getDraft(userId?: string): QuizDraft | null {
    const keys = getKeys(userId)
    return readParsed(storage, keys.draft, activeQuizSchema.nullable(), null)
  }

  function saveDraft(draft: QuizDraft, userId?: string): QuizDraft {
    const keys = getKeys(userId)
    const parsed = activeQuizSchema.parse({ ...draft, updatedAt: new Date().toISOString() })
    writeJson(storage, keys.draft, parsed)
    return parsed
  }

  function clearDraft(userId?: string): void {
    const keys = getKeys(userId)
    storage.removeItem(keys.draft)
  }

  function exportData(userId?: string): string {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      history: getHistory(userId),
      statistics: getStatistics(userId),
      favorites: getFavorites(userId),
      settings: getSettings(userId),
      draft: getDraft(userId),
    }
    return JSON.stringify(backup, null, 2)
  }

  function importData(input: string | unknown, userId?: string): BackupData {
    const keys = getKeys(userId)
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
      Object.values(keys).map((key) => [key, storage.getItem(key)]),
    ) as Record<string, string | null>

    try {
      writeJson(storage, keys.history, normalized.history)
      writeJson(storage, keys.statistics, normalized.statistics)
      writeJson(storage, keys.favorites, normalized.favorites)
      writeJson(storage, keys.settings, normalized.settings)
      if (normalized.draft) writeJson(storage, keys.draft, normalized.draft)
      else storage.removeItem(keys.draft)
    } catch (error) {
      Object.values(keys).forEach((key) => {
        const value = previous[key]
        if (value === null || value === undefined) storage.removeItem(key)
        else storage.setItem(key, value)
      })
      throw error
    }

    return normalized
  }

  function clearData(userId?: string): void {
    const keys = getKeys(userId)
    Object.values(keys).forEach((key) => storage.removeItem(key))
  }

  return {
    setUserId,
    getUserId,
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
