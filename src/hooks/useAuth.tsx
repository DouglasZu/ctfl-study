/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService, storageService, type RegisterInput } from '../services'
import { GUEST_USER, type UserProfile } from '../types'

interface AuthContextValue {
  currentUser: UserProfile
  isGuest: boolean
  profiles: UserProfile[]
  login: (username: string, password?: string) => Promise<UserProfile>
  register: (input: RegisterInput, migrateGuestData?: boolean) => Promise<UserProfile>
  logout: () => void
  switchProfile: (userId: string) => UserProfile
  updateProfile: (patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) => UserProfile
  deleteProfile: (userId: string) => void
  migrateGuestData: (userId?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser())
  const [profiles, setProfiles] = useState<UserProfile[]>(() => authService.getProfiles())

  useEffect(() => {
    storageService.setUserId(currentUser.id)
  }, [currentUser.id])

  useEffect(() => {
    const syncAuthTabs = () => {
      const user = authService.getCurrentUser()
      setCurrentUser(user)
      setProfiles(authService.getProfiles())
      storageService.setUserId(user.id)
    }
    window.addEventListener('storage', syncAuthTabs)
    return () => window.removeEventListener('storage', syncAuthTabs)
  }, [])

  async function register(input: RegisterInput, migrateGuest = false): Promise<UserProfile> {
    const newProfile = await authService.register(input)
    if (migrateGuest) {
      authService.migrateGuestDataToUser(newProfile.id)
    }
    storageService.setUserId(newProfile.id)
    setCurrentUser(newProfile)
    setProfiles(authService.getProfiles())
    return newProfile
  }

  async function login(username: string, password?: string): Promise<UserProfile> {
    const user = await authService.login(username, password)
    storageService.setUserId(user.id)
    setCurrentUser(user)
    setProfiles(authService.getProfiles())
    return user
  }

  function switchProfile(userId: string): UserProfile {
    const user = authService.switchProfile(userId)
    storageService.setUserId(user.id)
    setCurrentUser(user)
    setProfiles(authService.getProfiles())
    return user
  }

  function logout(): void {
    authService.logout()
    storageService.setUserId(GUEST_USER.id)
    setCurrentUser(GUEST_USER)
  }

  function updateProfile(patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>): UserProfile {
    if (currentUser.id === GUEST_USER.id) {
      return GUEST_USER
    }
    const updated = authService.updateProfile(currentUser.id, patch)
    setCurrentUser(updated)
    setProfiles(authService.getProfiles())
    return updated
  }

  function deleteProfile(userId: string): void {
    authService.deleteProfile(userId)
    const nextProfiles = authService.getProfiles()
    setProfiles(nextProfiles)
    if (currentUser.id === userId) {
      storageService.setUserId(GUEST_USER.id)
      setCurrentUser(GUEST_USER)
    }
  }

  function migrateGuestData(userId?: string): void {
    const targetId = userId || currentUser.id
    if (targetId && targetId !== GUEST_USER.id) {
      authService.migrateGuestDataToUser(targetId)
    }
  }

  const isGuest = currentUser.id === GUEST_USER.id

  const value: AuthContextValue = {
    currentUser,
    isGuest,
    profiles,
    login,
    register,
    logout,
    switchProfile,
    updateProfile,
    deleteProfile,
    migrateGuestData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.')
  return context
}
