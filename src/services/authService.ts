import { GUEST_USER, type UserProfile } from '../types'
import { userProfilesArraySchema } from '../utils/validation'
import type { StorageLike } from './storageService'

const AUTH_KEYS = {
  profiles: 'ctfl-study:profiles',
  activeUserId: 'ctfl-study:active-user-id',
} as const

function resolveBrowserStorage(): StorageLike {
  if (typeof window === 'undefined') {
    const memory = new Map<string, string>()
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
      removeItem: (k) => memory.delete(k),
    }
  }
  try {
    const storage = window.localStorage
    void storage.length
    return storage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
      removeItem: (k) => memory.delete(k),
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return ''
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(`${password}:ctfl_salt_2026`)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // Fallback if subtle crypto is unavailable
  }
  return btoa(`${password}:ctfl_salt_2026`)
}

export interface RegisterInput {
  name: string
  username: string
  password?: string
  avatar: string
}

export function createAuthService(storage: StorageLike = resolveBrowserStorage()) {
  function getProfiles(): UserProfile[] {
    try {
      const raw = storage.getItem(AUTH_KEYS.profiles)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      const result = userProfilesArraySchema.safeParse(parsed)
      return result.success ? result.data : []
    } catch {
      return []
    }
  }

  function saveProfiles(profiles: UserProfile[]): void {
    storage.setItem(AUTH_KEYS.profiles, JSON.stringify(profiles))
  }

  function getActiveUserId(): string {
    return storage.getItem(AUTH_KEYS.activeUserId) || GUEST_USER.id
  }

  function setActiveUserId(userId: string): void {
    storage.setItem(AUTH_KEYS.activeUserId, userId)
  }

  function getCurrentUser(): UserProfile {
    const activeId = getActiveUserId()
    if (activeId === GUEST_USER.id) {
      return GUEST_USER
    }
    const profiles = getProfiles()
    const user = profiles.find((p) => p.id === activeId)
    return user ?? GUEST_USER
  }

  async function register(input: RegisterInput): Promise<UserProfile> {
    const cleanName = input.name.trim()
    const cleanUsername = input.username.trim().toLowerCase()

    if (!cleanName) throw new Error('Informe um nome para o perfil.')
    if (!cleanUsername) throw new Error('Informe um nome de usuário.')
    if (cleanUsername.length < 3) throw new Error('O usuário deve ter pelo menos 3 caracteres.')

    const profiles = getProfiles()
    if (profiles.some((p) => p.username.toLowerCase() === cleanUsername)) {
      throw new Error(`O usuário "${cleanUsername}" já existe. Escolha outro ou faça login.`)
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined
    const now = new Date().toISOString()
    const newProfile: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      username: cleanUsername,
      avatar: input.avatar || '👨‍💻',
      createdAt: now,
      lastLoginAt: now,
      passwordHash,
    }

    const updated = [...profiles, newProfile]
    saveProfiles(updated)
    setActiveUserId(newProfile.id)
    return newProfile
  }

  async function login(username: string, password?: string): Promise<UserProfile> {
    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername) throw new Error('Informe o nome de usuário.')

    const profiles = getProfiles()
    const user = profiles.find((p) => p.username.toLowerCase() === cleanUsername)
    if (!user) {
      throw new Error(`Perfil "${cleanUsername}" não encontrado. Verifique ou crie uma nova conta.`)
    }

    if (user.passwordHash) {
      if (!password) {
        throw new Error('Este perfil requer uma senha para entrar.')
      }
      const hashed = await hashPassword(password)
      if (hashed !== user.passwordHash) {
        throw new Error('Senha incorreta. Tente novamente.')
      }
    }

    const updatedUser: UserProfile = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    }
    const updatedProfiles = profiles.map((p) => (p.id === user.id ? updatedUser : p))
    saveProfiles(updatedProfiles)
    setActiveUserId(user.id)
    return updatedUser
  }

  function switchProfile(userId: string): UserProfile {
    if (userId === GUEST_USER.id) {
      setActiveUserId(GUEST_USER.id)
      return GUEST_USER
    }
    const profiles = getProfiles()
    const user = profiles.find((p) => p.id === userId)
    if (!user) {
      setActiveUserId(GUEST_USER.id)
      return GUEST_USER
    }
    const updatedUser: UserProfile = { ...user, lastLoginAt: new Date().toISOString() }
    const updatedProfiles = profiles.map((p) => (p.id === user.id ? updatedUser : p))
    saveProfiles(updatedProfiles)
    setActiveUserId(user.id)
    return updatedUser
  }

  function logout(): void {
    setActiveUserId(GUEST_USER.id)
  }

  function updateProfile(userId: string, patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>): UserProfile {
    const profiles = getProfiles()
    const current = profiles.find((p) => p.id === userId)
    if (!current) throw new Error('Perfil não encontrado.')

    const updated: UserProfile = {
      id: current.id,
      name: patch.name ?? current.name,
      username: patch.username ?? current.username,
      avatar: patch.avatar ?? current.avatar,
      createdAt: current.createdAt,
      lastLoginAt: current.lastLoginAt,
      passwordHash: patch.passwordHash !== undefined ? patch.passwordHash : current.passwordHash,
    }
    const updatedProfiles = profiles.map((p) => (p.id === userId ? updated : p))
    saveProfiles(updatedProfiles)
    return updated
  }

  function deleteProfile(userId: string): void {
    const profiles = getProfiles().filter((p) => p.id !== userId)
    saveProfiles(profiles)
    if (getActiveUserId() === userId) {
      setActiveUserId(GUEST_USER.id)
    }
  }

  function migrateGuestDataToUser(userId: string): void {
    const prefixes = ['history', 'statistics', 'favorites', 'settings', 'draft']
    prefixes.forEach((key) => {
      const guestKey = `ctfl-study:user:guest:${key}`
      const legacyKey = `ctfl-study:${key}`
      const targetKey = `ctfl-study:user:${userId}:${key}`

      const sourceValue = storage.getItem(guestKey) ?? storage.getItem(legacyKey)
      if (sourceValue && !storage.getItem(targetKey)) {
        storage.setItem(targetKey, sourceValue)
      }
    })
  }

  return {
    getProfiles,
    getCurrentUser,
    getActiveUserId,
    setActiveUserId,
    register,
    login,
    switchProfile,
    logout,
    updateProfile,
    deleteProfile,
    migrateGuestDataToUser,
  }
}

export const authService = createAuthService()
