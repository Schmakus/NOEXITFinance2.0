import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL oder Anon Key fehlt! Bitte .env Datei mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY erstellen.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Admin client for user management (uses service role key, bypasses RLS)
// Created lazily to avoid "Multiple GoTrueClient instances" warning
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseServiceRoleKey) return null
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-admin-auth-token',
      },
    })
  }
  return _supabaseAdmin
}
