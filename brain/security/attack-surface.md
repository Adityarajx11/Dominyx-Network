# Attack Surface — Dominyx Network

Inventory with exact locations. `setDefaultMemberPermissions` is a Discord-UI default only (admins can re-allow) — every item below assumes it can be bypassed unless code re-checks.

## 1. Public endpoints (no auth)

| Endpoint | Effect |
|---|---|
| `GET /`, `/invite` (`packages/hq/app/page.js`, `app/invite/page.js`) | Static marketing + invite links (bot IDs are public by design) |
| `GET /api/auth/login` | Starts OAuth, sets `dq_state` cookie |
| `GET /api/auth/callback?code=&state=` | Code exchange; wrong state/code → redirect only |
| `GET /api/auth/logout` | Clears cookies (GET = CSRF-able logout, low impact) |
| Discord: `/rank`, `/leaderboard`, `/queue`, `/nowplaying`, `/roles`, all music playback + suggest/mood/radio controls, `ticket_create_select`, self-role menus, prefix `!p` | Any server member can invoke; abuse = spam/queue floods (no per-user cooldown on most) |

## 2. Internal endpoints (session required)

| Endpoint | Gate | Notes |
|---|---|---|
| `GET /api/me` | soft-auth (200 + empty when logged out) | Returns guild list + `hasBot` flags; no rate limit |
| `GET /api/guild/[guildId]/config` | `requireGuildAccess` (MANAGE_GUILD+) | Fans out to 3 Discord reads + full DB read; no rate limit; slow = DoS-adjacent cost |
| `PATCH /api/guild/[guildId]/config` `{bot,op,data}` | same gate | No per-bot granularity, no `hasBot` enforcement, no Origin check, no audit log |

## 3. Authentication / authorization surfaces

- Discord OAuth (`identify guilds` only — minimal scope, good). No PKCE, `state` is the sole CSRF control.
- Session = raw access token, 7 days, no refresh/rotation/revocation.
- Guild gate = MANAGE_GUILD/ADMINISTRATOR bit at request time (fresh fetch — good), but one bit opens all 6 bots' configs.
- Bots: only music re-checks perms at runtime (`requireDj`); guard/ticket/level/greet/ping trust Discord defaults. `guardsetup`, `ticketsetup`, `levelconfig`, `greetsetup`, `pingsetup`, `xpsetup`, `/prefix` are Administrator-declared but not code-enforced.
- No invoker-vs-target hierarchy checks on ban/kick/warn/bulkban (bot-side `bannable/manageable` only).

## 4. User inputs (largest surface)

- ~60 slash options: strings (song queries, templates with `{placeholders}`, URLs, bad words, categories), ints (mostly clamped; `maxtickets` 1–10 enforced), roles/channels (Discord-validated objects), booleans, menus.
- Select menus carry indexes/labels resolved server-side against DB config — good pattern; `selfrole_pick_*` trusts `interaction.values` role IDs without re-validating membership in the category (fix queued in findings).
- Prefix parser: server-configurable 1–3 char prefix + alias map; search query = rest of line.
- Message content scanned (automod/XP), never stored raw except ticket transcripts (7MB cap, mod-log channel only).
- HQ forms: numbers clamped client-side; server re-validates most (`addCategory` label ≤100, `addSelfRole` ≤60, tier/level ints). Gaps: `bannerUrl` regex is client-only; `panelTitle/panelRules/messageTemplate` lengths unbounded (embed caps will reject at send time, not at save).

## 5. File uploads — none from users

No attachment options, no modals. Bot-generated files only: welcome PNG (remote avatar URL parsed by native canvas lib), transcript `.txt` (100-message window), embed images from admin-supplied URLs (banner, YouTube thumbnails). Risk confined to malicious image URLs (Discord proxies/fetches; avatar parsing is native-code attack surface, low).

## 6. Database access

- One shared Postgres; bots hold full read/write via `pool`; HQ same. No row-level security, no read-only roles. Table set enumerated in evidence (`music_*`, `level_*`, `greet_*`, `ticket*`, `ping_*`, `guard_*`, `mod_*`, `play_history`, `user_playlists`, `radio_*`, `sleep_timers`).
- SQL is parameterized everywhere (no string-interpolated queries found) — injection surface is effectively closed; dynamic identifiers limited to static allowlists (`SETTING_COLUMNS`, `updateGuardSettings` allowlist).
- `order by ${col}` in level `getCategoryTop` uses a ternary-selected literal, not input — safe.

## 7. Storage

- Railway Postgres + ephemeral container disk (JSON fallbacks only). No object storage, no backups configured (unknown retention).
- No local secrets files in repo (gitignored); live `.env` files on dev machine + `node_modules` copies (workspace links).

## 8. Webhooks

- None created or received by the app. Guard *monitors* `webhookUpdate` as an anti-token-logger tripwire. GitHub→Vercel deploy hook is platform-level.

## 9. Third-party integrations

| Integration | Direction | Auth | Abuse note |
|---|---|---|---|
| Discord API v10 | HQ out (user+bot tokens), bots in (gateway) | Bearer/Bot tokens | Token leak = full impersonation; 6 parallel guild-list probes per load, no 429 handling |
| YouTube Data v3 | Ping out | API key in query string | Quota burn per enabled guild; key in URL (logged by Google, not by us) |
| Lavalink WS/REST | Music out | Password (`authorization`) | Plaintext if `SECURE=false`; reconnect storms observed against strict hosts |
| Invidious mirrors (3, untrusted) | Music out | None | Parses `recommendedVideos` JSON; no HTML rendered; instance can lie about titles (low impact: queue only) |
| Last.fm | Music out | Optional key | Keyless fallback; cached 1hr/500 entries |
| Discord CDN / OAuth authorize | Browser/invite links | Public IDs | No secret material |

## 10. Admin surfaces

- `guardsetup`, `ticketsetup`, `levelconfig`, `greetsetup`, `pingsetup`, `xpsetup`, `/prefix`, HQ PATCH — all Administrator-declared, none code-enforced. HQ is the de-facto admin console (MANAGE_GUILD-gated, no action log).
- Railway/Vercel/Portal dashboards hold all secrets (out of repo scope, highest-value targets).

## 11. Network / deployment exposure

- Vercel: public site + API; needs public DB URL (internal hostname fails closed — safe failure).
- Railway: bots (no inbound ports needed), Postgres (internal + optionally public), Lavalink (public domain or TCP proxy + password).
- TLS: DB uses `rejectUnauthorized:false` (MITM-tolerant); Lavalink/YouTube depend on host `SECURE`/HTTPS; Discord always TLS.

## 12. Dependencies

`discord.js ^14.16.3` (floats; installed 14.27 — event names follow installed version), `lavalink-client ^2`, `pg ^8`, `next ^14`, `react ^18`, `dotenv ^16`, `@napi-rs/canvas ^0.1`. No lockfile committed (`package-lock.json` gitignored) → versions float per install; no audit step in CI (no CI). Transitive vulns unknown — run `npm audit` per package.
