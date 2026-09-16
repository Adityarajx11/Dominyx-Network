# 05 — Cold Restart (after months away)

1. `git clone https://github.com/Adityarajx11/Dominyx-Network.git` → `cd` in → `npm.cmd install`.
2. Restore saved `.env` backups into `packages/hq/.env` + `packages/*/.env`. No backup? Rebuild per `04-env-vars.md` + Dev Portal.
3. Dev Portal: confirm tokens valid (Bot tab), Members Intent on (Music/Greet/Ticket/Guard), HQ OAuth2 redirects contain localhost + Vercel callback URLs.
4. Railway: Postgres up → note public URL; bot services (Music/Greet/Ticket/Guard) deployed + Online; env vars set (internal `DATABASE_URL`, Music `LAVALINK_*`).
5. Vercel: env vars per `04-env-vars.md` (public DB URL!) → Redeploy → verify `/api/auth/login` redirects with `scope=identify guilds`.
6. Register commands if code changed: `npm.cmd run deploy:<bot>` × 6 (wait up to 1 hr global).
7. Verify: login → dashboard → XERXES !! → Music/Greet tabs load, Save works; bots answer `/` commands in Discord.
8. Re-invite bots to servers as needed via HQ Add-to-Discord buttons.
