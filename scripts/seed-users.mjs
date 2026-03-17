#!/usr/bin/env node
/**
 * MESH — Seed Users Script
 *
 * Creates the initial GM and test player accounts.
 * Run once against your Supabase project:
 *
 *   node scripts/seed-users.mjs
 *
 * Prerequisites:
 *   - The mesh_users table must already exist (run the migration first)
 *   - npm install @supabase/supabase-js (already in project deps)
 *
 * NOTE: This uses Supabase Auth signUp, which works with the anon key.
 *       After running, you may need to confirm emails in the Supabase
 *       dashboard (Auth > Users) if email confirmation is enabled.
 *       Alternatively, disable "Confirm email" in Authentication > Settings.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://esjpbxkfieunasnniggv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UG7kICnhqzq-jrpDpYKPFw_0MSZcm-q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = [
  {
    email: 'ethan@mesh.local',
    password: 'Ethan',
    handle: 'GM',
    display_name: 'Ethan',
    role: 'Game Master',
    is_gm: true,
  },
  {
    email: 'testplayer@mesh.local',
    password: 'test',
    handle: 'TestPlayer',
    display_name: 'Test Player',
    role: 'Solo',
    is_gm: false,
  },
];

async function seedUser(user) {
  console.log(`\n[SEED] Creating user: ${user.handle} (${user.email})...`);

  // 1. Create auth account
  const { data, error: authError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (authError) {
    console.error(`  [ERROR] Auth signup failed: ${authError.message}`);
    return;
  }

  if (!data.user) {
    console.error('  [ERROR] No user returned from signup');
    return;
  }

  console.log(`  [OK] Auth user created: ${data.user.id}`);

  // 2. Create mesh_users profile
  const { error: profileError } = await supabase.from('mesh_users').insert({
    id: data.user.id,
    handle: user.handle,
    display_name: user.display_name,
    role: user.role,
    colour_scheme: 'green',
    is_gm: user.is_gm,
    is_online: false,
  });

  if (profileError) {
    console.error(`  [ERROR] Profile insert failed: ${profileError.message}`);
    return;
  }

  console.log(`  [OK] mesh_users profile created`);
  console.log(`  [INFO] Handle: ${user.handle}`);
  console.log(`  [INFO] Email: ${user.email}`);
  console.log(`  [INFO] Password: ${user.password}`);
  console.log(`  [INFO] GM: ${user.is_gm}`);
}

async function main() {
  console.log('=============================================');
  console.log(' MESH — User Seed Script');
  console.log('=============================================');

  // Sign out first to start clean
  await supabase.auth.signOut();

  for (const user of USERS) {
    await seedUser(user);
    // Sign out between users so we can create the next one
    await supabase.auth.signOut();
  }

  console.log('\n=============================================');
  console.log(' SEED COMPLETE');
  console.log('=============================================');
  console.log('\nLogin credentials:');
  console.log('  GM:          ethan@mesh.local / Ethan');
  console.log('  Test Player: testplayer@mesh.local / test');
  console.log('\nIMPORTANT: If email confirmation is enabled in your');
  console.log('Supabase project, go to Authentication > Users in the');
  console.log('dashboard and confirm both users manually.');
}

main().catch(console.error);
