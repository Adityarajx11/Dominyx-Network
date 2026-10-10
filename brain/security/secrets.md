# Secrets — Dominyx Network

Rule followed throughout: locations and types only. No values printed.

## 1. Where secrets are expected

| Secret | Used in | Expected location |
|---|---|---|
| `BOT_TOKEN` (+ `CLIENT_ID`) per bot | `packages/<bot>/index.js`, `deploy-commands.js` | `packages/<bot>/.env`, Railway service vars |
| `BOT_TOKEN_MUSIC/LEVEL/GREET/TICKET/PING/GUARD` | `packages/hq/lib/discord.js` guild probing | Vercel env, `packages/hq/.env.local` |
| `BOT_ID_*` (public IDs, not secret) | `packages/hq/lib/invite.js` | same as above |
| `DISCORD_CLIENT_ID/SECRET`, `DISCORD_REDIRECT_URI` | HQ OAuth (`lib/discord.js:34-48`) | Vercel env, `.env.local` |
| `DATABASE_URL` | `packages/core/lib/db.js`, `packages/hq/lib/db.js` | Railway vars (internal) / Vercel + local (public proxy URL) |
| `LAVALINK_HOST/PORT/PASSWORD/SECURE` | `packages/music/lib/lavalink.js:9-14` | Music env only |
| `YOUTUBE_API_KEY`, `YOUTUBE_POLL_MINUTES` | `packages/ping/lib/youtubeLive.js` | Ping env only |
| `LASTFM_API_KEY` (optional) | `packages/music/lib/reco.js` | Music env only |
| `dq_session` cookie (raw Discord access token) | `packages/hq/lib/session.js`, callback route | Browser cookie, 7 days, httpOnly |

## 2. Environment / configuration handling

- `.env.example` (root + HQ) documents names with empty values — good.
- `.gitignore` covers `.env`, `.env.local`, `node_modules/`; tracked tree contains **zero** secret values (verified: no `MTU…`, no `postgres://` credentials, no `BEGIN PRIVATE`, no literal assignments).
- `require('dotenv').config({ path: path.join(__dirname, '.env') })` in all 12 bot entry/deploy files loads the package-local file first — good (previously cwd-dependent silent skips).
- `packages/core/lib/deploy.js` now **throws** on missing `BOT_TOKEN/CLIENT_ID` instead of exiting 0 — good.
- Weakness: no per-bot `.env.example`; `README.md` tells users to copy the root one.
- Weakness: `packages/hq/lib/env.js:required()` validator exists but is never called — missing env fails late, not at boot.
- Live `.env` files exist on disk (`packages/{music,guard}/.env`, `packages/hq/.env.local`) plus copies under `node_modules/<pkg>/` (workspace links — same files, but confirms secrets sit beside build output).

## 3. Hardcoded-secret risks — ✅ CLEAR

Grep for token prefixes, `password\s*=`, `BEGIN PRIVATE`, literal `BOT_TOKEN=`/`CLIENT_SECRET=` assignments: no hits in code. All 63 secret reads go through `process.env`. Third-party keys (`YOUTUBE_API_KEY` in URL, `LASTFM_API_KEY`, `client_secret` POST) are env-interpolated server-side only.

## 4. Client-side exposure risks — ✅ CLEAR with notes

- All 8 HQ client components start with `'use client'` and contain **no** `process.env`/token/secret references (only UI strings).
- No `NEXT_PUBLIC_*` variables anywhere (0 matches) — nothing is intentionally inlined into the browser bundle.
- Server components/routes reference `BOT_TOKEN_*`, `DISCORD_CLIENT_SECRET`, `DATABASE_URL` — server-only, correct placement.
- Session cookie is `httpOnly` (JS cannot read it). `SameSite=lax`, `secure` in production, `path:/`, 7-day `maxAge`.
- Gaps: `dq_state` cookie in `login/route.js` lacks `secure` even in prod; clears omit `sameSite/secure` match; no `__Host-` prefix anywhere.

## 5. Git / history exposure risks — ⚠️ PROCESS RISK, NOT REPO STATE

- Tracked history contains no secrets (verified). Risk is **chat-side**: live bot tokens and DB passwords were pasted into this conversation multiple times. Each paste compromises that credential until rotated (Portal → reset token; Railway Postgres → new password; update all three homes: Railway, Vercel, local).
- `package-lock.json` is gitignored → installs float (supply-chain drift, not secret exposure, but noted).

## 6. Logging / error exposure risks — ⚠️ LOW

- No secret *values* are ever logged (passwords/auth headers excluded; Lavalink logs host:port only).
- User input echoed to logs: search queries (`lavalink.js`), YouTube API bodies (`youtubeLive.js`) — operational, low risk.
- Internal errors reflected to users: `err.message` shown in Discord replies (`guard/commands/ban.js:37`, `kick.js:40`, `music/commands/play.js:93`, `skip.js:19`, `recommend.js`, `suggestMenu.js`) and HQ JSON (`config/route.js`, `dashboard/[guildId]/page.js` renders `access.error`). Leaks stack-flavored details (Lavalink/DB messages) to end users — low severity, worth sanitizing.
- Cookie values never logged.

## 7. Secret rotation requirements

| Event | Rotate | Where to update (all three homes) |
|---|---|---|
| Any token/password pasted outside Railway/Vercel/Portal | That credential | Bot Portal or Railway Postgres → Railway vars → Vercel env → local `.env` → Redeploy/restart |
| Staff member removed | Bot tokens they could have seen | Same as above |
| `dq_session` theft suspected | Nothing server-side exists — Discord access tokens can't be revoked per-session; user must wait expiry or remove the HQ app authorization | — |
| Scheduled | No schedule exists | **Recommendation:** calendar reminder per 180 days for OAuth secret + DB password; bot tokens on staff churn |

## 8. Actual findings with evidence (severity → location)

1. **Confirmed weakness — chat-side credential exposure (repeated).** Severity: High (until rotated). Evidence: conversation contains live `BOT_TOKEN_*`, `DATABASE_URL` passwords, `LAVALINK` password. Risk: full bot/DB takeover. Fix: rotate now, per table above.
2. **Confirmed weakness — raw access token as session, no rotation.** Severity: Medium. Evidence: `lib/session.js:6-21`, `callback/route.js:30-36`. Why: theft = 7-day impersonation, no revoke path. Fix: short-lived session + refresh flow or encrypted session ID + server store.
3. **Missing control — `required()` env validator unused.** Severity: Low. Evidence: `lib/env.js:1-7` never imported. Fix: validate at boot, fail fast.
4. **Weakness — `dq_state` without `secure`.** Severity: Low. Evidence: `login/route.js:8`. Fix: add `secure: NODE_ENV==='production'`.
5. **Weakness — error-message reflection.** Severity: Low. Evidence list in §6. Fix: generic user text, log details server-side.
