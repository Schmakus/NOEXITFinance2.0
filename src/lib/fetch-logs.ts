
import { supabase } from './supabase'

export const fetchLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
