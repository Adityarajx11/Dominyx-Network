# 03 — Infrastructure Map

## Railway (24/7 hosts)
- Bot services ONLINE: **MUSIC, greet, TICKET, GUARD** (+ **Postgres**). Root Directory `/`, Start `npm run start:<bot>`.
- **Level + Ping**: no free slots → local-only (`npm.cmd run start:level` / `start:ping`).
- Bots use the INTERNAL `DATABASE_URL` (`postgres.railway.internal`).
- Music needs `LAVALINK_HOST/PORT/PASSWORD/SECURE` (public Lavalink host configured).

## Vercel (HQ website)
- Project `dominyx-network-hq`, Root Directory `packages/hq`, auto-deploys from GitHub `main` (~1 min).
- MUST use the PUBLIC Postgres URL (`...proxy.rlwy.net:PORT...`, e.g. host `iriguchi.proxy.rlwy.net:53765`). Internal URL → `ENOTFOUND`.
- After any env change: Deployments → ⋯ → Redeploy.

## GitHub
- `https://github.com/Adityarajx11/Dominyx-Network.git`, branch `main`.
- Commits use inline identity (`-c user.name=Adityarajx11 -c user.email=Adityarajx11@users.noreply.github.com`). No `gh` CLI.

## Discord applications (7)
- 6 bots (own token + client ID each) + 1 HQ login app.
- Client IDs: Music `1549710217862709309`, Level `1549712819103211620`, Greet `1549713810992926720`, Ticket `1549714961742172191`, Ping `1549715847478771762`, Guard `1549716406155608086`, HQ `1549747403748413470`.
- Server Members Intent ON for Music, Greet, Ticket, Guard.

## Live servers (last verified)
- XERXES !! (`1420435283807174758`): Music + Greet.
- RAVEN MODZ (`1504876595482202113`): Music. (Site "no permission" = login account `lucifer.2011` may differ from owner account — verify crown in Server Settings → Members.)
