import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getLogActionUrl } from '@/lib/log-action-url'
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
  isAdmin: boolean
  isSuperuser: boolean
  isUser: boolean
  canManageMusicians: boolean    // admin only
  canManageBookings: boolean     // admin + superuser
  canAccessSettings: boolean     // admin only (user gets own settings page)
  canAccessArchive: boolean      // admin + superuser
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateEmail: (newEmail: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const profileLoadedRef = useRef(false)

  // Load musician profile from Supabase
  const loadProfile = useCallback(async (authUserId: string, email: string): Promise<boolean> => {
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
        return true
      } else {
        console.warn('Kein Musiker-Profil für Auth-User gefunden:', email)
        setUser(null)
        return false
      }
    } catch (err) {
      console.error('Profil laden fehlgeschlagen:', err)
      setUser(null)
      return false
    }
  }, [])

  // Handle initial session on mount
  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      if (session?.user) {
        const success = await loadProfile(session.user.id, session.user.email ?? '')
        if (isMounted) {
          profileLoadedRef.current = success
          if (!success) await supabase.auth.signOut()
        }
      }
      if (isMounted) setIsLoading(false)
    }).catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [loadProfile])

  // Listen for auth state changes (token refresh, sign out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          profileLoadedRef.current = false
          return
        }

        // Skip events that are handled elsewhere (login / initial load)
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') return

        // TOKEN_REFRESHED — reload profile if needed
        if (event === 'TOKEN_REFRESHED' && session?.user && !profileLoadedRef.current) {
          const success = await loadProfile(session.user.id, session.user.email ?? '')
          profileLoadedRef.current = success
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.session?.user) {
      const success = await loadProfile(data.session.user.id, data.session.user.email ?? '');
      profileLoadedRef.current = success;
      if (!success) {
        await supabase.auth.signOut();
        throw new Error('Kein Musiker-Profil gefunden. Bitte wende dich an den Administrator.');
      }
      // Logging-Aufruf
      try {
        const now = new Date().toLocaleString();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        await supabase.from('logs').insert({
          type: 'login',
          action: 'login',
          label: data.session.user.email,
          description: `Login am ${now} (${data.session.user.email})`,
          user_id: uuidRegex.test(data.session.user.id) ? data.session.user.id : null,
          user_name: data.session.user.email,
        });
      } catch {}
    }
  }, [loadProfile])

  const logout = useCallback(async () => {
    // Logging-Aufruf (before signOut, while user is still available)
    if (user) {
      try {
        const now = new Date().toLocaleString();
        // user_id nur setzen, wenn es wie ein UUID aussieht (vereinfachte Prüfung)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        // Fallbacks für label und user_name
        const label = user.email || user.name || 'Unbekannt';
        const userName = user.name || user.email || 'Unbekannt';
        await supabase.from('logs').insert({
          type: 'login',
          action: 'logout',
          label,
          description: `Logout am ${now} (${label})`,
          user_id: uuidRegex.test(user.id) ? user.id : null,
          user_name: userName,
        });
      } catch {}
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [user])

  const updateEmail = useCallback(async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }, [])

  const role = user?.role ?? ''
  const isAdmin = role === 'administrator'
  const isSuperuser = role === 'superuser'
  const isUser = role === 'user'

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isSuperuser,
        isUser,
        canManageMusicians: isAdmin,
        canManageBookings: isAdmin || isSuperuser,
        canAccessSettings: isAdmin,
        canAccessArchive: isAdmin || isSuperuser,
        login,
        logout,
        updateEmail,
        updatePassword,
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
