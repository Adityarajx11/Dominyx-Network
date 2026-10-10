# Threat Model — Dominyx Network

Scope: `dominyx-network` monorepo as implemented (6 Discord bots + `packages/hq` Next.js dashboard + shared Postgres). Evidence locations are `file:line`.

## 1. Assets

| Asset | Where | Value |
|---|---|---|
| 7 Discord bot tokens + HQ OAuth secret | Railway/Vercel env, local `.env` files | Full control of 6 bots + HQ login |
| Postgres data (XP, playlists, tickets + transcripts, cases/notes, guild configs) | Railway Postgres | User + moderation data |
| HQ user sessions (`dq_session` = Discord access token) | httpOnly cookies | Act as the user on Discord API |
| Lavalink password, YouTube/Last.fm API keys | Railway env | Audio + quota abuse |
| Guild trust (bots hold Ban/Kick/Manage Roles/Channels) | Discord servers | Nuke-grade permissions |

## 2. Trust boundaries

1. **Discord user ↔ HQ (browser):** cookie session; Discord OAuth is the only identity.
2. **HQ ↔ Discord API:** user token (reads guilds) and bot tokens (reads guilds/channels/roles, writes config-driven actions).
3. **HQ ↔ Postgres:** shared DB also written by bots; HQ implicitly trusts bot-written rows.
4. **Bot ↔ Discord gateway:** token = full bot identity.
5. **Bot ↔ Lavalink / YouTube / Last.fm / Invidious:** passwords/API keys over TLS (or plaintext if `SECURE=false` + non-TLS host).
6. **Railway ↔ Vercel ↔ local dev:** env copied by hand between all three; no secrets manager.

## 3. Actors

| Actor | Capability |
|---|---|
| Server admin (legit) | MANAGE_GUILD+, configures bots via HQ/slash |
| Malicious server admin/staff | Has Manage Messages/Roles; tries privilege escalation via self-roles, ticket channels |
| Rogue Discord user | No perms; spams commands, mentions, scam links, raid joins |
| Compromised bot token holder | Full bot control until token reset |
| Network observer | Sees non-TLS traffic (public Lavalink without `SECURE`, DB without SSL) |
| Vercel/Railway account holder | Reads all env vars in dashboards |

## 4. Entry points

- HQ: `/api/auth/login|callback|logout`, `/api/me`, `GET/PATCH /api/guild/[guildId]/config`, dashboard pages.
- Discord: ~60 slash commands + buttons + select menus + prefix `!p` + message content (automod/XP) + voice state + member join/leave + audit-log reads.
- Lavalink WS/REST, YouTube Data API, Invidious mirrors, Last.fm.

## 5. Threats & scenarios

| # | Scenario | Impact | Likelihood | Severity | Existing mitigation | Missing mitigation |
|---|---|---|---|---|---|---|
| T1 | Token paste leak (chat/logs) grants bot control | High | High (happened repeatedly) | **Critical** | `.gitignore` covers `.env` | Rotation runbook; short-lived tokens impossible with bot tokens — reduce paste practice |
| T2 | Self-role privilege escalation (`guardsetup selfroleadd` any role, no hierarchy/managed check) | High | Medium | **High** | 40-char category cap | Validate role editable, below bot, not managed/@everyone/privileged |
| T3 | Fake manager gains HQ write (`getUserGuilds` flakiness → wrong 403 is fixed, but no per-request perm re-check at write) | Medium | Low | Medium | MANAGE_GUILD gate + retry | Re-check perms on PATCH; audit log |
| T4 | Mass-DM/ban abuse via stolen staff account | Medium | Low | Medium | Discord-side perms only | Runtime `memberPermissions` re-checks in every execute (only music DJ gate has them) |
| T5 | Nuker with legit perms destroys server | High | Low | Medium | Detection + rollback + punish | Rollback needs top role; nothing stops first 3 deletes |
| T6 | Session cookie theft (XSS-less theft via subdomain or dev http) | High | Low | Medium | httpOnly + SameSite=lax + secure-in-prod | No token binding/rotation; raw access token stored |
| T7 | Public Lavalink password sniffing (`SECURE=false` hosts) | Medium | Medium | Medium | — | Prefer TLS hosts; rotate on switch |
| T8 | DB credential leak → full data read/write | High | Low | High | Private networking in prod | `rejectUnauthorized:false`; backups unknown |
| T9 | Scam links / phishing via bot messages | Medium | Medium | Medium | Scam filter (opt-in), word filter | Off by default; no URL reputation list |
| T10 | YouTube/Lavalink host compromise serving malicious audio metadata | Low | Low | Low | Title truncation, no raw HTML render | — |
| T11 | Rate-limit/quota exhaustion (no throttling on HQ API or commands) | Low | Medium | Low | Discord-side limits only | Per-user/guild cooldowns on expensive routes |
| T12 | Stale admin retains HQ access (guild perms cached per request — actually re-fetched each request, ok) | Low | Low | Low | Fresh `/users/@me/guilds` per request | — |

## 6. What the project already does right

- Least-privilege invite bitmasks per bot (no Administrator blanket, unlike typical bots).
- DJ gate + Administrator bypass centralized in `requireDj` (`packages/music/lib/settings.js:62-78`).
- Automod staff exemption, audit-log executor attribution, rollback position caps.
- Secrets via env only; no hardcoded credentials found; no `NEXT_PUBLIC` secret leakage; secret values never logged (labels only).
- Deferred replies + timeouts prevent interaction-token abuse surface.

## 7. Top gaps (do not fix automatically per request)

1. No runtime permission re-checks outside music (relies on Discord UI defaults).
2. No rate limiting anywhere (HQ API, commands, polling loops are fixed-interval).
3. Raw Discord access token as session (no rotation, no refresh, 7-day window).
4. `rejectUnauthorized:false` DB TLS; plaintext fallback for non-Railway hosts.
5. Privilege-escalation checks missing on self-role assignment.
