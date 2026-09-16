# 04 — Env Vars Reference (names only, NO values)

> `.env` files are gitignored — back them up separately (USB/drive). Values live in: local `packages/*/.env`, Vercel env, Railway service vars, Dev Portal.

## HQ (`packages/hq/.env` + Vercel — same keys)
| Var | Get it from |
|---|---|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Dev Portal → HQ app → OAuth2 (Reset Secret if lost) |
| `DISCORD_REDIRECT_URI` | `http://localhost:3000/api/auth/callback` locally; `https://dominyx-network-hq.vercel.app/api/auth/callback` on Vercel |
| `BOT_TOKEN` | Dev Portal → HQ app → Bot tab (Reset Token if lost) |
| `DATABASE_URL` | Railway → Postgres → Variables → `DATABASE_PUBLIC_URL` (public! never the `.internal` one) |
| `PUBLIC_APP_URL` | `http://localhost:3000` locally; Vercel URL on Vercel |
| `BOT_ID_MUSIC/LEVEL/GREET/TICKET/PING/GUARD` | Fixed numeric client IDs (see `03-infrastructure.md`) |
| `BOT_TOKEN_MUSIC/LEVEL/GREET/TICKET/PING/GUARD` | Dev Portal → each bot → Bot tab |

## Each bot (`packages/<bot>/.env` + Railway service vars)
| Var | Get it from |
|---|---|
| `BOT_TOKEN` / `CLIENT_ID` | Dev Portal → that bot |
| `DATABASE_URL` | Railway internal URL on Railway; public URL for local runs |
| Music only: `LAVALINK_HOST/PORT/PASSWORD/SECURE` | Lavalink host provider / Railway vars |

## Vercel paste rules (learned the hard way)
1. No leading space/tab (caused `%09` client IDs + dead tokens twice).
2. `BOT_ID_*` = numbers; `BOT_TOKEN_*` = long `MTU…` strings — never swap them (`client_id is not snowflake`).
3. Use **Add New** for new vars; don't edit `BOT_ID_*` rows to add tokens.
4. Check Production + Preview + Development; Save; **Redeploy**.
