# MeshApp (Mesh)

Cyberpunk RED TTRPG campaign OS: a Tauri 2 desktop app styled as a retro CRT terminal for player immersion and GM covert orchestration.

Stack: React 19, TypeScript 5.9, Vite 8, Supabase (auth, Postgres, realtime, storage, edge functions), Tauri 2.

## North Star

Mesh is diegetic first. Build features as tools a character could plausibly access inside the world, except for clearly separated GM-only control surfaces.

Player-facing features should feel like in-world systems: email, chat, net search, files, character records, dice, combat support, runner gameplay, ELO, and Kiri Hou cyberware records.

GM-facing features are campaign machinery: dashboards, user management, journal, Signal Board, drift, Blackwall traps, dead drops, sealed Kiri Hou notes, and covert content delivery.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run typecheck` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Tauri dev | `npx tauri dev` |
| Tauri build | `npx tauri build` |

## Architecture

`App.tsx` manages the root state machine: `boot -> login -> terminal`.

`Terminal.tsx` is the shell: layout, active module state, floating combat panels, persistent notifications, idle/ghost effects, and sidebar rendering.

Module metadata and rendering live in `src/modules/registry.tsx`. New modules must be added there instead of hand-editing multiple nav/render switch blocks.

Canonical campaign and game data lives in Supabase. Local/session storage is allowed only for cosmetic or ephemeral UI state such as last role tint, panel position, and one-session jack-in animation state.

The Tauri layer is intentionally minimal: plugin setup only unless there is a strong desktop capability reason to add Rust commands.

## Modules

`AppModule` values:

`email | chat | netsearch | elo | contacts | files | settings | users | sheet | dice | hacking | runner | fixerboard | journal | combat | dashboard | signalboard | kirihOU`

When adding a module, define:

- registry entry in `src/modules/registry.tsx`
- player/GM visibility
- label and icon
- render function and any wrapper such as `JackIn`
- whether it is safe for drift ghost rendering
- co-located component CSS
- shared types in `src/types/index.ts`
- Supabase migration/RLS changes when data is stored

## Source Structure

```text
src/
  App.tsx                 - Root boot/login/terminal state machine
  components/             - Feature components, each with co-located CSS
    Runner/               - Idle game, acts 1-4, career paths, prestige
      constants/          - bosses, crew, paths, story beats, upgrades
  hooks/                  - Auth, skin, realtime, signal, notifications, drift
  lib/
    supabase.ts           - Single Supabase client export
    fireDeadDrop.ts       - Client-side GM manual dead-drop delivery helper
    roleUtils.ts          - Role/skin resolution helpers
    skinUtils.ts          - CSS variable injection helpers
  modules/
    registry.tsx          - Module metadata, nav order, routing/rendering
  styles/
    crt.css               - Global CRT scanline/flicker effects
    roleSkins.css         - Base role skin rules
    skins/                - Per-role and special-mode CSS files
  types/index.ts          - Shared TypeScript interfaces

supabase/
  migrations/             - Numbered SQL files, currently 001-023
  functions/              - Deno edge functions

src-tauri/
  src/lib.rs              - Plugin setup only
  tauri.conf.json         - App config, identifier nz.mesh.terminal
```

## Conventions

### TypeScript

- Shared app/domain types live in `src/types/index.ts`.
- Component props interfaces may stay inline at the top of the component file.
- Import the Supabase singleton from `src/lib/supabase.ts`; do not create browser-side clients elsewhere.
- Prefer typed helpers around repeated Supabase payload shapes instead of spreading ad hoc casts through components.

### Styling

- Each component owns a co-located `.css` file.
- Use raw CSS and CSS custom properties; do not add Tailwind.
- CRT effects: `.crt-flicker`, `.crt-scanlines`, `.crt-glow`.
- Colour vars: `--primary`, `--primary-dim`, `--primary-bright`, `--bg`, `--bg-light`.
- Role skins activate via `data-skin` and live under `src/styles/skins/`.
- Preserve the terminal feel, but keep controls usable on small screens and during live play.

### Supabase And Secrets

- RLS is active on campaign tables. Client queries run as the authenticated user.
- GM-only and secret campaign mechanics must be protected with RLS, RPCs, or edge functions, not hidden only by React conditionals.
- Player-safe views/RPCs are preferred when exposing partial secret state, such as drift effects without raw drift level.
- Edge functions that use the service role must authenticate the caller and return only safe payloads.
- New migrations use the next unique number: `supabase/migrations/0XX_description.sql`.
- Timed or covert campaign automation should prefer server-side execution. UI polling is acceptable only as a temporary/manual GM convenience.

### Realtime

- Shared realtime subscription helpers live in `src/hooks/useRealtime.ts`.
- Long-lived cross-module subscriptions may live in `Terminal.tsx` when they need to fire regardless of active module.
- Always unsubscribe on unmount.

### Runner

- `RunnerState` lives in `src/types/index.ts`.
- Game constants live in `src/components/Runner/constants/`.
- Acts are split across `RunnerAct1.tsx` through `RunnerAct4.tsx`.
- Career paths: solo, netrunner, fixer, tech, medtech, rockerboy, nomad, media.
- Keep game tuning constants isolated and named; avoid burying balance values inside JSX.

### Signal Board

- Signal Board is GM-only campaign control infrastructure.
- Drift, Blackwall traps, dead drops, and Kiri Hou sealed notes are secret-bearing systems.
- Do not expose trigger keywords, drift levels, armed dead drops, or sealed GM notes directly to player clients unless an RLS/RPC/edge function path intentionally allows it.

## Environment

Requires `.env` at repo root:

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Tauri requires Rust toolchain and WebView2 on Windows. The Vite dev server runs on port 5173 by default.
