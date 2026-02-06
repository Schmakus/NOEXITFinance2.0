import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchMusicianByUserId } from '@/lib/api-client'

export interface User {
  id: string          // musicians.id (UUID)
  authId: string      // auth.users.id (UUID)
  name: string
  email: string
  role: string        // 'administrator' | 'superuser' | 'user'
  balance: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load musician profile from Supabase
  const loadProfile = useCallback(async (authUserId: string, email: string) => {
    try {
      const musician = await fetchMusicianByUserId(authUserId)
      if (musician) {
        setUser({
          id: musician.id,
          authId: authUserId,
          name: musician.name,
          email: musician.email,
          role: musician.role,
          balance: musician.balance,
        })
      } else {
        // Auth user exists but no musician record — log out
        console.warn('Kein Musiker-Profil für Auth-User gefunden:', email)
        await supabase.auth.signOut()
        setUser(null)
      }
    } catch (err) {
      console.error('Profil laden fehlgeschlagen:', err)
      setUser(null)
    }
  }, [])

  // Listen for auth state changes (Supabase v2.39+ fires INITIAL_SESSION)
  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsLoading(false)
          return
        }

        // Handle INITIAL_SESSION (page reload), SIGNED_IN (login), TOKEN_REFRESHED
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email ?? '')
        } else {
          setUser(null)
        }
        if (isMounted) setIsLoading(false)
      }
    )

    // Safety timeout: prevent permanent "Lade..." if no auth event fires
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false)
    }, 3000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Profile is loaded by onAuthStateChange listener
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
