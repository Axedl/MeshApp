// MESH Personal Terminal — Edge Function: delete-user
//
// Deletes a Supabase Auth user and all associated data.
// Requires the caller to be authenticated as a GM.
// The auth user deletion cascades to mesh_users, which cascades
// to mesh_contacts and mesh_files. FK constraints in migration 002
// handle mesh_emails (CASCADE on to_user_id, SET NULL on from_user_id)
// and mesh_chat_messages (SET NULL on from_user_id).
//
// Deploy with: supabase functions deploy delete-user

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

  // Admin client — used for both token verification and the final delete
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller's JWT via the admin client (getUser with explicit token)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response(
      JSON.stringify({ error: '[AUTH] Invalid or expired session.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Verify GM status from mesh_users table
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
  try {
    const body = await req.json()
    userId = body.userId
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

  // Block self-deletion
  if (userId === caller.id) {
    return new Response(
      JSON.stringify({ error: '[ERROR] Cannot delete your own account.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Use admin client to delete the auth user
  // This cascades: auth.users → mesh_users → mesh_contacts, mesh_files
  // Migration 002 handles mesh_emails and mesh_chat_messages FK constraints
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: `[DB] ${deleteError.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
