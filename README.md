# MESH Personal Terminal

A CRT-styled desktop campaign OS for a Cyberpunk RED tabletop RPG set in near-future Aotearoa New Zealand.

Mesh is both a player-facing in-world terminal and a GM-facing covert control surface for live campaign delivery.

## Tech Stack

- Frontend: React 19, TypeScript 5.9, Vite 8
- Desktop: Tauri 2
- Backend: Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- Distribution: GitHub Releases and Tauri updater

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npx tauri dev
npx tauri build
```

## Player Modules

- Email: in-world inbox, sent mail, replies, realtime delivery
- Chat: realtime channels and direct-message style channels
- Net Search: searchable campaign web, Sprawl articles, forums, Blackwall surprises
- ELO: in-world Elflines Online layer
- Contacts: player and GM-assigned NPC contacts
- Files: personal notes and GM-pushed documents
- Sheet: Cyberpunk RED character record
- Dice: full and mini dice rollers
- Combat: initiative and HP support
- Runner: idle/progression game with career paths, acts, bosses, crew, and prestige
- Jack In: hacking minigame
- Fixer Board: jobs, rumors, items, wanted posts, intel
- Kiri Hou: cyberware record with player notes and sealed GM notes
- Settings: colour schemes and session controls

## GM Tools

- Dashboard: campaign overview
- Users: player/campaign management
- Journal: GM notes
- Signal Board: drift, Blackwall traps, dead drops, and Kiri Hou GM controls
- NPC identity tools in supported modules
- Covert email, file, and net-content delivery

## Project Shape

`App.tsx` handles the root `boot -> login -> terminal` state machine.

`Terminal.tsx` owns shell behavior: layout, active module, floating combat panels, persistent notifications, idle effects, and drift ghost overlays.

`src/modules/registry.tsx` owns module metadata, nav order, visibility, ghost safety, and render functions. New modules should be registered there.

Canonical campaign/game state lives in Supabase. Local and session storage are reserved for cosmetic or ephemeral UI state.

## Supabase

Migrations live in `supabase/migrations` and are numbered in order. The current sequence runs `001` through `023`.

Edge functions live in `supabase/functions`:

- `delete-user`
- `get-user-emails`
- `reset-password`
- `check-blackwall`
- `fire-content-drop`

RLS is expected on campaign tables. Secret-bearing systems should use RLS, RPCs, views, or edge functions rather than client-only hiding.

## Setup

1. Clone the repo.
2. Copy `.env.example` to `.env`.
3. Set Supabase environment values:

   ```text
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Apply Supabase migrations in order.
6. Run the app:

   ```bash
   npm run dev
   ```

7. For the full desktop shell:

   ```bash
   npx tauri dev
   ```

Tauri requires the Rust toolchain and WebView2 on Windows.
