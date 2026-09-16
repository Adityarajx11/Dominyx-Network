# Rook Network

A family of single-purpose Discord bots, sharing one core package. Each bot lives in `packages/` and deploys independently to Railway.

## Members

| Bot | Package | Purpose |
| --- | --- | --- |
| Rook Music | `packages/music` | Lavalink music player: play, queue, skip, stop, loop, shuffle, volume, nowplaying, 24/7, personal playlists |

Planned: Rook Guard (security/moderation), Rook Level (XP + greeting), Rook Tickets, Rook Ping (YouTube/streamers), Rook HQ (web dashboard).

## Repo layout

```
packages/
  core/    @rook/core — shared command loader, deploy, embeds, Postgres pool
  music/   rook-music — the music bot
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `BOT_TOKEN`, `CLIENT_ID`, `LAVALINK_*`. (`DATABASE_URL` only needed for persistent 24/7 mode.)
3. Deploy commands: `npm run deploy:music`
4. Run: `npm run start:music`

## Conventions

- CommonJS `require`/`module.exports` — never ESM.
- Slash commands export `{ data: SlashCommandBuilder, execute(interaction, client) }`; run deploy after adding/modifying.
- Events export `{ name, once?, execute(...args, client) }`; no deploy needed.
- Shared code goes in `@rook/core`; per-bot state uses its own Postgres table via `init*` functions in that bot's `events/ready.js`.