// Returns the correct Supabase Edge Function URL for log-action
// Usage: fetch(getLogActionUrl(), ...)

const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_REF || '<your-project-ref>'

export function getLogActionUrl() {
  if (import.meta.env.PROD) {
    return '/functions/v1/log-action'
  }
  return `https://${SUPABASE_PROJECT_REF}.functions.supabase.co/log-action`
}
