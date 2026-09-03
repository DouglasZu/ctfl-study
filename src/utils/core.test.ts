import { describe, expect, it } from 'vitest'
import rawQuestions from '../data/questions.json'
import type { Question, QuizHistory, QuizResult } from '../types'
import {
  calculatePercentage,
  calculateQuizResult,
  calculateUserStatistics,
  createQuiz,
  identifyWeakTopics,
  parseQuestions,
  selectErrorTrainingQuestions,
  selectIncorrectQuestions,
  selectQuestions,
  shuffleQuestionOptions,
} from './index'

const question = (
  id: number,
  topic = 'Fundamentos',
  chapter = '1',
): Question => ({
  id,
  question: `Pergunta ${id}`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 1,
  explanation: 'Explicação de demonstração.',
  chapter,
  topic,
  difficulty: 'medium',
})

function resultAt(
  questions: Question[],
  answers: Record<string, number | null>,
  completedAt: string,
  id = `result-${completedAt}`,
): QuizResult {
  const quiz = createQuiz(questions, {
    id: `quiz-${id}`,
    createdAt: new Date(Date.parse(completedAt) - 60_000),
  })
  return calculateQuizResult(quiz, answers, { completedAt, durationSeconds: 60, resultId: id })
}

describe('score and percentage', () => {
  it('calculates a score while keeping unanswered questions separate', () => {
    const quiz = createQuiz(
      [question(1, 'A'), question(2, 'A'), question(3, 'B')],
      { id: 'quiz-1', createdAt: '2026-01-01T10:00:00.000Z' },
    )
    const result = calculateQuizResult(
      quiz,
      { '1': 1, '2': 0, '3': null },
      { completedAt: '2026-01-01T10:02:00.000Z' },
    )

    expect(result.correctAnswers).toBe(1)
    expect(result.incorrectAnswers).toBe(1)
    expect(result.unansweredQuestions).toBe(1)
    expect(result.answeredQuestions).toBe(2)
    expect(result.percentage).toBe(33.3)
    expect(result.durationSeconds).toBe(120)
    expect(result.topicStatistics.find((item) => item.topic === 'A')).toMatchObject({
      answered: 2,
      correct: 1,
      incorrect: 1,
      percentage: 50,
    })
  })

  it('handles zero and rounds percentages consistently', () => {
    expect(calculatePercentage(0, 0)).toBe(0)
    expect(calculatePercentage(7, 8)).toBe(87.5)
    expect(calculatePercentage(2, 3)).toBe(66.7)
  })

  it('rejects an option index that does not exist', () => {
    const quiz = createQuiz([question(1)], {
      id: 'quiz',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(() => calculateQuizResult(quiz, { '1': 99 })).toThrow(RangeError)
  })
})

describe('question selection', () => {
  it('never returns duplicate ids and caps the requested quantity', () => {
    const questions = [question(1), question(2), question(2), question(3)]
    const selected = selectQuestions(questions, 40, { random: () => 0.5 })

    expect(selected).toHaveLength(3)
    expect(new Set(selected.map(({ id }) => String(id))).size).toBe(3)
  })

  it('prefers unseen questions, followed by the least recently answered', () => {
    const questions = [question(1), question(2), question(3)]
    const history: QuizHistory = [
      resultAt([questions[0]!], { '1': 1 }, '2026-01-03T00:00:00.000Z', 'recent'),
      resultAt([questions[1]!], { '2': 1 }, '2026-01-01T00:00:00.000Z', 'old'),
    ]

    expect(
      selectQuestions(questions, 3, { history, random: () => 0.5 }).map(({ id }) => id),
    ).toEqual([3, 2, 1])
  })

  it('preserves the correct semantic answer when alternatives are shuffled', () => {
    const original = question(1)
    const shuffled = shuffleQuestionOptions(original, () => 0)

    expect(shuffled.options).not.toEqual(original.options)
    expect(shuffled.options[shuffled.correctAnswer]).toBe(original.options[original.correctAnswer])
    expect(original.options).toEqual(['A', 'B', 'C', 'D'])
    expect(original.correctAnswer).toBe(1)
  })
})

describe('statistics', () => {
  it('calculates aggregates, recent averages and weak topics', () => {
    const history = [
      resultAt(
        [question(1, 'Estático', '3'), question(2, 'Estático', '3')],
        { '1': 0, '2': 0 },
        '2026-01-01T00:00:00.000Z',
        'r1',
      ),
      resultAt(
        [question(1, 'Estático', '3'), question(3, 'Fundamentos', '1')],
        { '1': 1, '3': 1 },
        '2026-01-02T00:00:00.000Z',
        'r2',
      ),
    ]

    const statistics = calculateUserStatistics(history)
    expect(statistics).toMatchObject({
      totalQuizzes: 2,
      averagePercentage: 50,
      bestPercentage: 100,
      worstPercentage: 0,
      lastPercentage: 100,
      totalQuestionsAnswered: 4,
      totalCorrectAnswers: 2,
      totalIncorrectAnswers: 2,
      overallAccuracy: 50,
    })
    expect(statistics.weakTopics[0]).toMatchObject({
      topic: 'Estático',
      answered: 3,
      correct: 1,
      percentage: 33.3,
    })
    expect(statistics.questionStatistics.find(({ questionId }) => questionId === 1)).toMatchObject({
      answered: 2,
      correct: 1,
      incorrect: 1,
      percentage: 50,
      lastAnswerCorrect: true,
    })
  })

  it('does not call a topic weak from only one answer', () => {
    expect(
      identifyWeakTopics(
        [{ topic: 'Único', answered: 1, correct: 0, incorrect: 1, percentage: 0 }],
        2,
      ),
    ).toEqual([])
  })
})

describe('error training', () => {
  it('orders repeated errors before recent one-off errors', () => {
    const questions = [question(1, 'Fraco'), question(2, 'Fraco'), question(3, 'Novo')]
    const history = [
      resultAt([questions[0]!], { '1': 0 }, '2026-01-01T00:00:00.000Z', 'r1'),
      resultAt([questions[0]!], { '1': 0 }, '2026-01-02T00:00:00.000Z', 'r2'),
      resultAt([questions[1]!], { '2': 0 }, '2026-01-03T00:00:00.000Z', 'r3'),
    ]

    expect(
      selectIncorrectQuestions(questions, 3, history, { random: () => 0.5 }).map(({ id }) => id),
    ).toEqual([1, 2])
    expect(
      selectErrorTrainingQuestions(questions, 3, history, { random: () => 0.5 }).map(
        ({ id }) => id,
      ),
    ).toEqual([1, 2, 3])
  })
})

describe('question validation', () => {
  it('loads the repository question bank through the runtime validator', () => {
    const loaded = parseQuestions(rawQuestions)
    expect(loaded).toHaveLength(320)
  })

  it('contains exactly 80 questions per certification track (40 per official mock) without overlap', () => {
    const loaded = parseQuestions(rawQuestions)
    const ctfl = loaded.filter((q) => q.track === 'CTFL')
    const ctalTae = loaded.filter((q) => q.track === 'CTAL-TAE')
    const ctFt = loaded.filter((q) => q.track === 'CT-FT')
    const ctAi = loaded.filter((q) => q.track === 'CT-AI')

    expect(ctfl).toHaveLength(80)
    expect(ctalTae).toHaveLength(80)
    expect(ctFt).toHaveLength(80)
    expect(ctAi).toHaveLength(80)

    // Ensure all 8 official exams contain exactly 40 questions each
    const officialExamIds = [
      'ctfl-mock-1',
      'ctfl-mock-2',
      'tae-mock-1',
      'tae-mock-2',
      'ft-mock-1',
      'ft-mock-2',
      'ai-mock-1',
      'ai-mock-2',
    ]
    officialExamIds.forEach((examId) => {
      const examQuestions = loaded.filter((q) => q.examId === examId)
      expect(examQuestions).toHaveLength(40)
    })

    // Ensure all question IDs are completely unique across all tracks
    const allIds = new Set(loaded.map((q) => String(q.id)))
    expect(allIds.size).toBe(320)

    // Ensure all questions have valid options and correctAnswer in range
    loaded.forEach((q) => {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(q.correctAnswer).toBeLessThan(q.options.length)
      expect(q.explanation.length).toBeGreaterThan(10)
      expect(['K1', 'K2', 'K3']).toContain(q.kLevel)
    })
  })

  it('accepts a valid object wrapper and rejects duplicate ids', () => {
    expect(parseQuestions({ questions: [question(1)] })).toHaveLength(1)
    expect(() => parseQuestions([question(1), question(1)])).toThrow(/duplicado/i)
  })

  it('rejects a missing correct alternative without crashing the caller', () => {
    expect(() => parseQuestions([{ ...question(1), correctAnswer: 4 }])).toThrow(/resposta correta/i)
  })
})
