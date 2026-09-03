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

function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount))
  }
  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  let i = 0
  let j = 0
  let result = ''

  const asciiBitLength = ascii.length * 8

  const hash = new Uint32Array(8)
  const k = new Uint32Array(64)
  let primeCounter = 0

  const isComposite: Record<number, boolean> = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      }
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }

  let padded = ascii + '\x80'
  while ((padded.length % 64) - 56) padded += '\x00'

  const wordCount = (padded.length / 4) + 2
  const words = new Uint32Array(wordCount)
  for (i = 0; i < padded.length; i++) {
    const code = padded.charCodeAt(i)
    words[i >> 2] = (words[i >> 2] ?? 0) | (code << (((3 - i) % 4) * 8))
  }
  words[words.length - 2] = (asciiBitLength / maxWord) | 0
  words[words.length - 1] = asciiBitLength

  const w = new Uint32Array(64)

  for (j = 0; j < words.length; j += 16) {
    for (i = 0; i < 16; i++) {
      w[i] = words[j + i] ?? 0
    }
    for (i = 16; i < 64; i++) {
      const w15 = w[i - 15] ?? 0
      const w2 = w[i - 2] ?? 0
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0
    }

    let a = hash[0] ?? 0
    let b = hash[1] ?? 0
    let c = hash[2] ?? 0
    let d = hash[3] ?? 0
    let e = hash[4] ?? 0
    let f = hash[5] ?? 0
    let g = hash[6] ?? 0
    let h = hash[7] ?? 0

    for (i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + maj) | 0

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    hash[0] = ((hash[0] ?? 0) + a) | 0
    hash[1] = ((hash[1] ?? 0) + b) | 0
    hash[2] = ((hash[2] ?? 0) + c) | 0
    hash[3] = ((hash[3] ?? 0) + d) | 0
    hash[4] = ((hash[4] ?? 0) + e) | 0
    hash[5] = ((hash[5] ?? 0) + f) | 0
    hash[6] = ((hash[6] ?? 0) + g) | 0
    hash[7] = ((hash[7] ?? 0) + h) | 0
  }

  for (i = 0; i < 8; i++) {
    const val = hash[i] ?? 0
    for (j = 3; j >= 0; j--) {
      const byte = (val >>> (j * 8)) & 255
      result += (byte < 16 ? '0' : '') + byte.toString(16)
    }
  }
  return result
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return ''
  const salted = `${password}:ctfl_salt_2026`
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(salted)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // Fallback if subtle crypto is unavailable
  }
  return sha256Sync(salted)
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
