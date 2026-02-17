// Supabase Edge Function: log-action
// POST /functions/v1/log-action
// Body: { type, action, label, description, user_id, user_name }
import { serve } from '@std/http'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const { type, action, label, description, user_id, user_name } = await req.json()
  if (!type || !action || !label || !description || !user_id || !user_name) {
    return new Response('Missing fields', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const { error } = await supabase.from('logs').insert({
    type,
    action,
    label,
    description,
    user_id,
    user_name
  })
  if (error) {
    return new Response('Insert failed', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    })
  }
  return new Response('OK', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  })
})
