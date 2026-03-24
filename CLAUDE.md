# MeshApp (Mesh)

Cyberpunk Red TTRPG companion — Tauri 2 desktop app styled as a retro CRT terminal.
Stack: React 19, TypeScript 5.9, Vite 8, Supabase (auth + realtime + storage), Tauri 2.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Build | `npm run build` |
| Tauri dev | `npx tauri dev` |
| Tauri build | `npx tauri build` |

## Architecture

App.tsx manages three states: `boot → login → terminal`.
Terminal.tsx is the module shell — owns routing, renders the active module.
All data flows through Supabase (no local state persistence beyond session).
Tauri layer is minimal: plugins only (notification, updater, log). No custom Rust commands.

AppModule values: `email | chat | netsearch | contacts | files | settings | users | sheet | dice | hacking | runner | fixerboard | journal | combat | dashboard`

## Source Structure

```
src/
  App.tsx               - Root: boot/login/terminal state machine
  components/           - 30 feature components (each has a co-located .css)
    Runner/             - Largest (17 files): idle game, acts 1-4, career paths, prestige
      constants/        - bosses.ts, crew.ts, paths.ts, storyBeats.ts, upgrades.ts
  hooks/                - useAuth, useColourScheme, useRoleSkin, useSkin,
                          useRealtime, useSignalStrength, useNotifications
  lib/
    supabase.ts         - Single Supabase client export (do not create new clients)
    roleUtils.ts        - Role/skin resolution helpers
    skinUtils.ts        - CSS variable injection helpers
  styles/
    crt.css             - Global CRT scanline/flicker effects
    roleSkins.css       - Base role skin rules
    skins/              - 6 per-role CSS files (solo, exec, lawman, media, medtech, rockerboy)
  types/index.ts        - ALL shared TypeScript interfaces live here (single file)

supabase/
  migrations/           - 18 numbered SQL files (001-018), applied in order
  functions/            - delete-user, get-user-emails, reset-password (Deno edge functions)

src-tauri/
  src/lib.rs            - Plugin setup only, no custom commands
  tauri.conf.json       - App config: identifier nz.mesh.terminal, no decorations
```

## Conventions

### TypeScript
- All shared types → `src/types/index.ts` (never in component files)
- Supabase client → import from `src/lib/supabase.ts` (singleton)
- Component props interfaces defined inline at top of each component file

### Styling
- Each component owns a co-located `.css` file (e.g., `Runner.tsx` + `Runner.css`)
- CRT effects: `.crt-flicker`, `.crt-scanlines`, `.crt-glow` (from `crt.css`)
- Colour vars: `--primary`, `--primary-dim`, `--primary-bright`, `--bg`, `--bg-light`
- Role skins: activated via `data-skin` attribute, defined in `styles/skins/*.css`
- Do NOT use Tailwind — raw CSS with CSS custom properties only

### Supabase
- RLS is active on all tables — all queries run as the authenticated user
- Realtime subscriptions handled in `src/hooks/useRealtime.ts`
- Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (not committed)
- New migrations: `supabase/migrations/0XX_description.sql` (increment from 018)

### Runner Component
- State type: `RunnerState` in `src/types/index.ts`
- Game constants (upgrades, paths, bosses, crew, story beats): `src/components/Runner/constants/`
- Acts split across: `RunnerAct1.tsx` through `RunnerAct4.tsx`
- Career paths: solo, netrunner, fixer, tech, medtech, rockerboy, nomad, media

## Environment

Requires `.env` at repo root:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Tauri requires Rust toolchain + WebView2 (Windows). Dev server runs on port 5173.
