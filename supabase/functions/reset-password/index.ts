// MESH Personal Terminal — Edge Function: reset-password
//
// Resets a Supabase Auth user's password.
// Requires the caller to be authenticated as a GM.
//
// Deploy with: supabase functions deploy reset-password

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

  // Parse request body
  let userId: string
  let newPassword: string
  try {
    const body = await req.json()
    userId = body.userId
    newPassword = body.newPassword
  } catch {
    return new Response(
      JSON.stringify({ error: '[ERROR] Invalid request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!userId || typeof userId !== 'string') {
    return new Response(
      JSON.stringify({ error: '[ERROR] Missing or invalid userId.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return new Response(
      JSON.stringify({ error: '[ERROR] Password must be at least 6 characters.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (updateError) {
    return new Response(
      JSON.stringify({ error: `[DB] ${updateError.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
