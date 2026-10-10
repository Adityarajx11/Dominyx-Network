# Security Checklist — Dominyx Network

Status per item: ✅ done · ⚠️ partial · ❌ missing. Locations are evidence, not fixes (nothing was changed to write this).

## Authentication — ⚠️ partial
- [x] OAuth via Discord, minimal scope (`identify guilds`) — `lib/discord.js:23-32`
- [x] 128-bit `state` CSRF check on callback — `callback/route.js:17-19`
- [ ] No PKCE, no `Origin` check, `state` compare not timing-safe
- [x] httpOnly + SameSite=lax + secure-in-prod session cookie — `lib/session.js`
- [ ] `dq_state` cookie missing `secure` even in prod — `login/route.js:8`
- [ ] No refresh-token flow; 7-day static access token — `callback/route.js:30-36`

## Authorization / RBAC — ⚠️ partial
- [x] MANAGE_GUILD/ADMINISTRATOR gate on HQ guild routes — `lib/auth.js:44-54`
- [x] DJ gate centralized for music controls — `music/lib/settings.js:62-78`
- [x] Staff-role checks in ticket claim/priority/close — `ticketInteractions.js`
- [ ] No runtime perm re-checks in guard/ticket/level/greet/ping executes
- [ ] No invoker-vs-target hierarchy checks (ban/kick/warn/bulkban)
- [ ] Self-role assignment trusts menu values; no privileged-role guard — `selfRoleMenu.js`
- [ ] One guild bit opens all 6 bots' HQ configs; `hasBot` not enforced

## Session / token security — ⚠️ partial
- [x] Cookie not JS-readable; logout clears cookies
- [ ] Raw access token stored (not a session id); no rotation/revocation; logout doesn't revoke at Discord
- [ ] GET logout (CSRF-able, low impact)

## Input validation — ✅ mostly done
- [x] Discord-side types + min/max/choices on most options; server clamps on tiers/levels/categories/tickets/filters/prefix/poll
- [ ] `bannerUrl` regex client-only; template/message lengths unbounded (fail at send, not save)
- [ ] `bulkban` IDs now digit-validated ✅ (fixed); select-menu role IDs trusted in self-roles ❌

## Injection — ✅ done
- [x] All SQL parameterized; dynamic keys from static allowlists (`SETTING_COLUMNS`, `updateGuardSettings`, `updatePingSettings`)
- [x] Bad-word regex escapes input — `guard/events/messageCreate.js`
- [x] No shell/template injection points (no `exec`, no HTML rendering)

## XSS / CSRF — ⚠️ partial
- [x] React auto-escapes; no `dangerouslySetInnerHTML` (verify: 0 matches expected)
- [x] SameSite=lax on session; state check on OAuth
- [ ] No Origin check on PATCH; no per-action CSRF token

## API security — ⚠️ partial
- [x] Auth gates on all HQ data routes; soft-auth `/api/me` returns empty, not 401-leak
- [x] Deferred replies prevent interaction-token timeouts being treated as success
- [ ] No rate limiting on any HQ route; Discord 429s unhandled in `discordFetch`
- [ ] Verbose `err.message` JSON to web clients — `config/route.js`

## Rate limiting / abuse — ❌ missing
- [ ] Zero per-IP/user/guild throttles (HQ, commands, prefix parser, polls)
- [x] In-bot mitigations only: XP cooldowns, automod windows, open-ticket caps, warn ladder

## File uploads — ✅ n/a (none from users)
- [x] No attachment/modal inputs; bot-generated PNG/TXT only; remote-URL embeds admin/YouTube-sourced

## Database security — ⚠️ partial
- [x] Fail-fast when `DATABASE_URL` missing (bots); parameterized queries throughout
- [ ] `rejectUnauthorized:false` (bots always; HQ on Railway hosts); plaintext outside TLS hosts
- [ ] Single superuser credential shared by bots + HQ; no read-only roles, no RLS
- [ ] No verified backup/restore story

## Secrets — ⚠️ process risk
- [x] Env-only, gitignored, zero hardcoded values, no client-bundle leakage
- [ ] Repeated chat-side pastes of live tokens/passwords (rotate per `secrets.md` §7)
- [ ] Unused `required()` env validator; `dq_state` missing `secure`

## Encryption — ⚠️ partial
- [x] TLS to Discord/YouTube/Vercel/Railway by default
- [ ] DB TLS unverified; Lavalink plaintext when `SECURE=false`; no at-rest encryption beyond platform defaults; session token stored raw

## CORS — ✅ n/a
- [x] No cross-origin API consumption (same-origin fetch only); no CORS headers set

## Dependency security — ❌ missing process
- [ ] No lockfile committed; no `npm audit`/CI; versions float (`^` ranges)
- [x] Small, mainstream dependency set (no exotic packages)

## Logging / monitoring — ⚠️ partial
- [x] Structured boot logs (tables ready, node connected), per-error `console.error` with messages (no secret values)
- [ ] No aggregation/alerting; Railway/Vercel logs only; user-input echo in logs (queries, API bodies)

## Admin security — ⚠️ partial
- [x] Admin-only declarations on setup commands; HQ behind MANAGE_GUILD
- [ ] No code enforcement of admin bits; no HQ action log; anti-nuke auto-punish defaults to alert-only (safe default ✅)

## Deployment / infrastructure — ⚠️ partial
- [x] Internal DB for bots, public only where needed; least-privilege invite bitmasks; template uses `${{}}` references not values
- [ ] Secrets hand-copied across 3 homes (drift = outages); Vercel needs manual redeploy after env edits; trial-sized hosts (OOM risk on Java)

## Data privacy — ⚠️ partial
- [x] Minimal collection (IDs, titles, counts); transcripts confined to log channel + DB
- [ ] No retention policy (transcripts/history grow forever); no user-data export/delete flow

## Error handling — ✅ mostly done
- [x] Generic user-facing errors in hot paths; guarded fetches with cache fallbacks; loud login failure; sweepers skip (never act) on missing guilds
- [ ] Some `err.message` reflection remains (ban/kick/play/skip/suggest/mood, HQ JSON)

## Backup / recovery — ❌ missing
- [ ] No DB backup verified; no Lavalink/queue state backup (in-memory); restart recovery exists for sleep timers + radio sessions + leave flows ✅; template enables infra rebuild ✅
