import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { createActiveQuiz, createQuiz } from '../utils/quiz'
import { calculateQuizResult } from '../utils/statistics'
import { createStorageService, storageKeys, type StorageLike } from './storageService'

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }
}

const question: Question = {
  id: 1,
  question: 'Qual é um objetivo de teste?',
  options: ['Provar ausência de defeitos', 'Reduzir riscos'],
  correctAnswer: 1,
  explanation: 'Testes oferecem informação sobre qualidade e risco.',
  chapter: '1',
  topic: 'Fundamentos',
  difficulty: 'easy',
}

function quizResult() {
  const quiz = createQuiz([question], {
    id: 'quiz-1',
    createdAt: '2026-01-01T10:00:00.000Z',
  })
  return calculateQuizResult(quiz, { '1': 1 }, {
    completedAt: '2026-01-01T10:01:00.000Z',
    resultId: 'result-1',
  })
}

describe('storage service', () => {
  it('persists results and derives user statistics', () => {
    const service = createStorageService(new MemoryStorage())
    service.saveQuizResult(quizResult())

    expect(service.getHistory()).toHaveLength(1)
    expect(service.getStatistics()).toMatchObject({
      totalQuizzes: 1,
      totalQuestionsAnswered: 1,
      totalCorrectAnswers: 1,
      averagePercentage: 100,
      overallAccuracy: 100,
    })
  })

  it('replaces a result with the same id instead of duplicating it', () => {
    const service = createStorageService(new MemoryStorage())
    const result = quizResult()
    service.saveQuizResult(result)
    service.saveQuizResult(result)
    expect(service.getHistory()).toHaveLength(1)
  })

  it('exports and imports a validated round-trip backup', () => {
    const source = createStorageService(new MemoryStorage())
    source.saveQuizResult(quizResult())
    source.saveFavorites([1, 1, 'extra'])
    source.saveSettings({ theme: 'dark', syllabusVersion: '4.0' })

    const draft = createActiveQuiz(
      createQuiz([question], {
        id: 'draft-quiz',
        createdAt: '2026-01-02T10:00:00.000Z',
        timerMode: 'exam',
        durationMinutes: 60,
      }),
    )
    source.saveDraft(draft)

    const serialized = source.exportData()
    const destination = createStorageService(new MemoryStorage())
    const imported = destination.importData(serialized)

    expect(imported.version).toBe(1)
    expect(destination.getHistory()).toEqual(source.getHistory())
    expect(destination.getStatistics()).toEqual(source.getStatistics())
    expect(destination.getFavorites()).toEqual([1, 'extra'])
    expect(destination.getSettings()).toMatchObject({ theme: 'dark', syllabusVersion: '4.0' })
    expect(destination.getDraft()?.id).toBe('draft-quiz')
  })

  it('rejects invalid imports before changing existing data', () => {
    const service = createStorageService(new MemoryStorage())
    service.saveFavorites([1])

    expect(() => service.importData('{"version":1,"history":"bad"}')).toThrow(/backup/i)
    expect(service.getFavorites()).toEqual([1])
  })

  it('falls back safely when local data is absent or malformed', () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKeys.history, '{not-json')
    storage.setItem(storageKeys.settings, JSON.stringify({ theme: 'unknown' }))
    const service = createStorageService(storage)

    expect(service.getHistory()).toEqual([])
    expect(service.getStatistics().totalQuizzes).toBe(0)
    expect(service.getSettings().defaultQuestionCount).toBe(40)
    expect(service.getTheme()).toBe('system')
  })

  it('clears only application-owned keys', () => {
    const storage = new MemoryStorage()
    const service = createStorageService(storage)
    storage.setItem('another-app', 'keep')
    service.saveFavorites([1])
    service.clearData()

    expect(service.getFavorites()).toEqual([])
    expect(storage.getItem('another-app')).toBe('keep')
  })
})
