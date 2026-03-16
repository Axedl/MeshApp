# MESH Personal Terminal

A CRT-styled desktop terminal application for a Cyberpunk RED tabletop RPG campaign set in near-future Aotearoa New Zealand.

## Tech Stack

- **Frontend:** React + TypeScript
- **Desktop:** Tauri v2 (Windows .exe)
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Distribution:** GitHub Releases + Tauri auto-updater

## Modules

- **Email** — In-world email with compose, inbox, sent, reply, and realtime delivery
- **Live Chat** — Shared channel with realtime messages and online presence
- **Net Search** — Search engine querying The Sprawl articles and GM-created net content
- **Contacts** — Player characters + GM-assigned NPC contacts
- **File System** — Personal notes, GM-pushed files and documents
- **Settings** — Colour scheme selection, terminal info, logout

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and set your Supabase anon key
3. Run the SQL migration in `supabase/migrations/001_mesh_tables.sql` against your Supabase project
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run in development mode:
   ```bash
   npm run dev          # Frontend only
   npx tauri dev        # Full Tauri app
   ```
6. Build for Windows:
   ```bash
   npx tauri build
   ```

## Colour Schemes

- Green Phosphor (classic CRT)
- Amber (warm retro)
- Cyan/Blue (cold cyberpunk)
- White (high contrast)
- Custom colour picker

## GM Features

The GM account (is_gm = true in mesh_users) has elevated tools:
- Send emails/chat as any NPC identity
- Broadcast system alerts in chat
- Create/manage NPC identities and assign them to player contacts
- Create searchable net content
- Push files to players
