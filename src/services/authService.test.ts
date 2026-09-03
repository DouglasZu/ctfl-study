import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthService } from './authService'
import type { StorageLike } from './storageService'
import { GUEST_USER } from '../types'

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
  }
}

describe('authService', () => {
  let storage: StorageLike
  let auth: ReturnType<typeof createAuthService>

  beforeEach(() => {
    storage = createMemoryStorage()
    auth = createAuthService(storage)
  })

  it('starts with guest user by default', () => {
    expect(auth.getCurrentUser().id).toBe(GUEST_USER.id)
    expect(auth.getProfiles()).toHaveLength(0)
  })

  it('registers a new user profile and activates it', async () => {
    const user = await auth.register({
      name: 'Douglas',
      username: 'douglas',
      password: '123',
      avatar: '👨‍💻',
    })

    expect(user.name).toBe('Douglas')
    expect(user.username).toBe('douglas')
    expect(user.avatar).toBe('👨‍💻')
    expect(user.passwordHash).toBeTruthy()
    expect(auth.getCurrentUser().id).toBe(user.id)
    expect(auth.getProfiles()).toHaveLength(1)
  })

  it('rejects registration with duplicate username', async () => {
    await auth.register({
      name: 'Douglas',
      username: 'douglas',
      avatar: '👨‍💻',
    })

    await expect(
      auth.register({
        name: 'Outro Douglas',
        username: 'douglas',
        avatar: '🦊',
      }),
    ).rejects.toThrow(/já existe/i)
  })

  it('authenticates user with correct password and rejects wrong password', async () => {
    await auth.register({
      name: 'Ana',
      username: 'ana',
      password: 'secretPassword',
      avatar: '👩‍💻',
    })

    auth.logout()
    expect(auth.getCurrentUser().id).toBe(GUEST_USER.id)

    // Wrong password
    await expect(auth.login('ana', 'wrongPassword')).rejects.toThrow(/incorreta/i)

    // Correct password
    const logged = await auth.login('ana', 'secretPassword')
    expect(logged.username).toBe('ana')
    expect(auth.getCurrentUser().id).toBe(logged.id)
  })

  it('switches between profiles smoothly', async () => {
    const u1 = await auth.register({ name: 'User 1', username: 'user1', avatar: '🦁' })
    const u2 = await auth.register({ name: 'User 2', username: 'user2', avatar: '🦉' })

    expect(auth.getCurrentUser().id).toBe(u2.id)

    auth.switchProfile(u1.id)
    expect(auth.getCurrentUser().id).toBe(u1.id)

    auth.switchProfile(GUEST_USER.id)
    expect(auth.getCurrentUser().id).toBe(GUEST_USER.id)
  })

  it('updates profile name and avatar', async () => {
    const u = await auth.register({ name: 'Old Name', username: 'editme', avatar: '🚀' })
    const updated = auth.updateProfile(u.id, { name: 'New Name', avatar: '🎯' })

    expect(updated.name).toBe('New Name')
    expect(updated.avatar).toBe('🎯')
    expect(auth.getCurrentUser().name).toBe('New Name')
  })

  it('deletes profile and resets active user to guest if active was deleted', async () => {
    const u = await auth.register({ name: 'To Delete', username: 'del', avatar: '🤖' })
    expect(auth.getProfiles()).toHaveLength(1)

    auth.deleteProfile(u.id)
    expect(auth.getProfiles()).toHaveLength(0)
    expect(auth.getCurrentUser().id).toBe(GUEST_USER.id)
  })

  it('migrates guest study data to registered user', async () => {
    // Set guest data
    storage.setItem('ctfl-study:history', JSON.stringify([{ id: 'mock-result' }]))

    const u = await auth.register({ name: 'Migrated User', username: 'migrated', avatar: '⚡' })
    auth.migrateGuestDataToUser(u.id)

    const userHistory = storage.getItem(`ctfl-study:user:${u.id}:history`)
    expect(userHistory).toBeTruthy()
    expect(JSON.parse(userHistory!)).toEqual([{ id: 'mock-result' }])
  })

  it('hashes passwords into a 64-char SHA-256 hexadecimal string', async () => {
    const { hashPassword } = await import('./authService')
    const hash = await hashPassword('testPass123')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    // Never returns base64 format with colons
    expect(hash).not.toContain(':')
  })
})
