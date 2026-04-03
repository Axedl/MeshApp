// MESH Signal Board — Edge Function: check-blackwall
//
// Checks if a player's search query matches any armed Blackwall trap keyword.
// The trigger_keyword never leaves the server — only matching trap content is returned.
// Records the fire so each trap fires at most once per player.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: '[AUTH] Missing authorization header.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response(
      JSON.stringify({ error: '[AUTH] Invalid or expired session.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let query: string
  try {
    const body = await req.json()
    query = body.query
  } catch {
    return new Response(
      JSON.stringify({ error: '[ERROR] Invalid request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!query || typeof query !== 'string') {
    return new Response(
      JSON.stringify({ trap: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const normalizedQuery = query.toLowerCase()

  // Fetch all armed traps using service role (bypasses RLS)
  const { data: traps, error: trapsError } = await adminClient
    .from('mesh_blackwall_traps')
    .select('id, title, body, corruption_level, trigger_keyword, created_by, is_armed, created_at')
    .eq('is_armed', true)

  if (trapsError || !traps?.length) {
    return new Response(
      JSON.stringify({ trap: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch traps already fired for this user
  const { data: fires } = await adminClient
    .from('mesh_blackwall_trap_fires')
    .select('trap_id')
    .eq('user_id', caller.id)

  const firedIds = new Set((fires ?? []).map((f: { trap_id: string }) => f.trap_id))

  // Find first matching trap not yet fired for this user
  const matched = traps.find(
    (t: { id: string; trigger_keyword: string }) =>
      !firedIds.has(t.id) &&
      normalizedQuery.includes(t.trigger_keyword.toLowerCase())
  )

  if (!matched) {
    return new Response(
      JSON.stringify({ trap: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Record the fire
  await adminClient
    .from('mesh_blackwall_trap_fires')
    .insert({ trap_id: matched.id, user_id: caller.id })

  // Return trap content WITHOUT trigger_keyword
  const { trigger_keyword: _omit, ...safeTrap } = matched

  return new Response(
    JSON.stringify({ trap: safeTrap }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
