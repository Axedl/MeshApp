// MESH Signal Board — Edge Function: fire-content-drop
//
// Fires any armed dead drops triggered by a player opening a net content item.
// Uses service role to deliver content without exposing drop data to the client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SIGNAL_SOURCE_NPC_ID = '00000000-0000-0000-0000-000000000001'

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

  let contentId: string
  try {
    const body = await req.json()
    contentId = body.content_id
  } catch {
    return new Response(
      JSON.stringify({ error: '[ERROR] Invalid request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!contentId || typeof contentId !== 'string') {
    return new Response(
      JSON.stringify({ fired: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find armed drops matching this content and this user (or broadcast drops)
  const { data: drops } = await adminClient
    .from('mesh_dead_drops')
    .select('*')
    .eq('trigger_type', 'content_opened')
    .eq('trigger_content_id', contentId)
    .eq('is_armed', true)

  if (!drops?.length) {
    return new Response(
      JSON.stringify({ fired: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Filter to drops targeting this user or all players
  const applicable = drops.filter(
    (d: { target_user_id: string | null }) =>
      d.target_user_id === null || d.target_user_id === caller.id
  )

  let fired = 0
  const now = new Date().toISOString()

  for (const drop of applicable) {
    const targetUserId = drop.target_user_id ?? caller.id

    if (drop.delivery_method === 'email') {
      await adminClient.from('mesh_emails').insert({
        from_npc_id: SIGNAL_SOURCE_NPC_ID,
        from_user_id: null,
        to_user_id: targetUserId,
        subject: drop.subject,
        body: drop.body,
        is_read: false,
      })
    } else if (drop.delivery_method === 'file') {
      await adminClient.from('mesh_files').insert({
        owner_id: targetUserId,
        filename: drop.subject,
        content_type: 'text/plain',
        content_text: drop.body,
        source: '[SIGNAL INTERCEPT]',
        is_new: true,
      })
    } else if (drop.delivery_method === 'netsearch') {
      await adminClient.from('mesh_net_content').insert({
        title: drop.subject,
        body: drop.body,
        source_name: '[UNKNOWN NODE]',
        tags: ['__dead_drop__'],
        visible_to: [targetUserId],
        created_by: drop.created_by,
        published_at: now,
      })
    }

    await adminClient
      .from('mesh_dead_drops')
      .update({ is_armed: false, fired_at: now })
      .eq('id', drop.id)

    fired++
  }

  return new Response(
    JSON.stringify({ fired }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
