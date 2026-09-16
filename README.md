# Dominyx

A family of single-purpose Discord bots, sharing one core package. Each bot lives in `packages/` and deploys independently to Railway. Hub: **Dominyx HQ**.

## Members

| Bot | Package | Purpose |
| --- | --- | --- |
| Dominyx Music | `packages/music` | Lavalink music player: play, queue, skip, stop, loop, shuffle, volume, nowplaying, 24/7, personal playlists |
| Dominyx Level | `packages/level` | XP leveling, rank cards, leaderboards, level roles, level-up announcements |
| Dominyx Greet | `packages/greet` | Crimson/black welcome cards, custom welcome text, auto-roles |
| Dominyx Ticket | `packages/ticket` | Ticket panels, categories, claim/priority, transcripts to log channel |
| Dominyx Ticket | `packages/ticket` | Ticket panels, categories, claim/priority, transcripts to log channel |
| Dominyx Ping | `packages/ping` | YouTube "went live" alerts (needs `YOUTUBE_API_KEY`) |
| Dominyx Guard | `packages/guard` | Moderation: ban/kick/warn, case history, staff notes, bulk ban, self-assignable roles, mod-log channel |

Planned: Dominyx HQ (web dashboard).

## Repo layout

```
packages/
  core/    @dominyx/core — shared command loader, deploy, embeds, Postgres pool
  music/   dominyx-music — the music bot
  level/   dominyx-level — the leveling bot
  greet/   dominyx-greet — the greeting bot (fonts live in packages/greet/fonts — swap the .ttf files to rebrand)
  ticket/  dominyx-ticket — the ticket bot
  ping/    dominyx-ping — the YouTube live-alert bot
  guard/   dominyx-guard — the moderation bot
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `BOT_TOKEN`, `CLIENT_ID`, `LAVALINK_*`. (`DATABASE_URL` needed for leveling, greetings, 24/7 mode, tickets, moderation; `YOUTUBE_API_KEY` + `YOUTUBE_POLL_MINUTES` for live alerts.)
3. Deploy commands: `npm run deploy:music` / `npm run deploy:level` / `npm run deploy:greet` / `npm run deploy:ticket` / `npm run deploy:ping` / `npm run deploy:guard`
4. Run: `npm run start:music` / `npm run start:level` / `npm run start:greet` / `npm run start:ticket` / `npm run start:ping` / `npm run start:guard`

## Conventions

- CommonJS `require`/`module.exports` — never ESM.
- Slash commands export `{ data: SlashCommandBuilder, execute(interaction, client) }`; run deploy after adding/modifying.
- Events export `{ name, once?, execute(...args, client) }`; no deploy needed.
- Shared code goes in `@dominyx/core`; per-bot state uses its own Postgres table via `init*` functions in that bot's `events/ready.js`.