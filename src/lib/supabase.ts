import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL oder Anon Key fehlt! Bitte .env Datei mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY erstellen.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
