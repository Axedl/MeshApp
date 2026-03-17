// MESH Personal Terminal — Edge Function: get-user-emails
//
// Returns a map of userId → email for all auth users.
// Requires the caller to be authenticated as a GM.
//
// Deploy with: supabase functions deploy get-user-emails

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

  // Verify caller's JWT
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response(
      JSON.stringify({ error: '[AUTH] Invalid or expired session.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Verify GM status
  const { data: callerProfile, error: profileError } = await adminClient
    .from('mesh_users')
    .select('is_gm')
    .eq('id', caller.id)
    .single()

  if (profileError || !callerProfile?.is_gm) {
    return new Response(
      JSON.stringify({ error: '[ACCESS DENIED] GM clearance required.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch all auth users and build userId → email map
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

  if (listError) {
    return new Response(
      JSON.stringify({ error: `[DB] ${listError.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const emails: Record<string, string> = {}
  for (const u of users) {
    if (u.email) emails[u.id] = u.email
  }

  return new Response(
    JSON.stringify({ emails }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
