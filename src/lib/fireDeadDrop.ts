import { supabase } from './supabase';
import type { DeadDrop } from '../types';

// UUID of the system NPC inserted in migration 022.
// Used as from_npc_id for dead-drop emails to satisfy mesh_emails CHECK constraint.
export const SIGNAL_SOURCE_NPC_ID = '00000000-0000-0000-0000-000000000001';

export async function fireDeadDrop(drop: DeadDrop, targetUserId: string): Promise<void> {
  if (drop.delivery_method === 'email') {
    await supabase.from('mesh_emails').insert({
      from_npc_id: SIGNAL_SOURCE_NPC_ID,
      from_user_id: null,
      to_user_id: targetUserId,
      subject: drop.subject,
      body: drop.body,
      is_read: false,
    });
  } else if (drop.delivery_method === 'file') {
    await supabase.from('mesh_files').insert({
      owner_id: targetUserId,
      filename: drop.subject,
      content_type: 'text/plain',
      content_text: drop.body,
      source: '[SIGNAL INTERCEPT]',
      is_new: true,
    });
  } else if (drop.delivery_method === 'netsearch') {
    await supabase.from('mesh_net_content').insert({
      title: drop.subject,
      body: drop.body,
      source_name: '[UNKNOWN NODE]',
      tags: ['__dead_drop__'],
      visible_to: [targetUserId],
      created_by: drop.created_by,
      published_at: new Date().toISOString(),
    });
  }

  await supabase
    .from('mesh_dead_drops')
    .update({ is_armed: false, fired_at: new Date().toISOString() })
    .eq('id', drop.id);
}
