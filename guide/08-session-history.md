# 08 — Session History (first → last)

1. Built 6 bots + shared core; deployed 27 slash commands globally.
2. Fixed Greet `TokenInvalid` (token reset, verified online).
3. Fixed Music Lavalink crash (public host configured on Railway).
4. Railway live: MUSIC/greet/TICKET/GUARD + Postgres Online. Level/Ping local-only (no slots; merge offer declined).
5. Built HQ site (home, `/invite`, dashboard, per-server config UI).
6. Invite flow with verified permission bits + `BOT_ID_*` client IDs.
7. Red/black motion redesign; removed invite-nav links; logos deleted.
8. Fixed stale `.next` cache crash.
9. Deployed HQ to Vercel (`dominyx-network-hq.vercel.app`), root `packages/hq`.
10. Vercel env saga: localhost→public URLs, tab-char pastes, ID/token mixup — all resolved.
11. Fixed unstyled dashboard (CSS import to `layout.js`).
12. Fixed double-login (cookies on response objects).
13. Scope saga: `guilds.members.read` → `guilds.channels` (nonexistent) → back to `identify guilds`.
14. Bot detection via `BOT_TOKEN_*` probing + trim; guild data via in-guild bot token (Bot auth).
15. UI fixes: crimson list markers, native checkbox replacing broken toggle.
16. Postgres: internal→public URL (`iriguchi.proxy.rlwy.net:53765`, verified).
17. Verified live state: Music ∈ XERXES !! + RAVEN MODZ; Greet ∈ XERXES !!; rest nowhere.
18. Open: Vercel env confirm + redeploy test; RAVEN MODZ owner-account check; invite 4 bots somewhere.
19. Saved, not started: premium plan, secrets rotation (declined), growth work.
