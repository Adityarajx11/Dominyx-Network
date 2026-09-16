# 06 — Troubleshooting (every error seen → fix)

| Error | Cause → Fix |
|---|---|
| `TokenInvalid` on bot start | Wrong/empty `BOT_TOKEN` → Dev Portal → reset token → update `.env`/Railway |
| `ManagerOption.nodes must be an Array` (Music) | Missing `LAVALINK_*` → set host/port/password/secure |
| `Cannot find module './193.js'` | Stale `.next` → kill node on :3000, delete `packages/hq/.next`, restart dev |
| Dashboard = unstyled text | `globals.css` not loaded globally → import must live in `app/layout.js` |
| Must log in twice | Cookies set via `cookies()` then dropped by new redirect response → `res.cookies.set` on the returned response |
| `{"scope":["2"]}` on login click | Invalid OAuth scope (`guilds.members.read` unapproved / `guilds.channels` doesn't exist) → scope must be exactly `identify guilds` |
| `client_id=%09…` (tab in URLs) | Leading tab pasted into Vercel var → retype first char, repaste, Save, Redeploy |
| `client_id … is not snowflake` | `BOT_ID_*` holds a token, not an ID → restore numeric client IDs |
| `getaddrinfo ENOTFOUND postgres.railway.internal` | Internal DB URL on Vercel → use public `...proxy.rlwy.net...` URL |
| `discord 404 Unknown Guild` on server open | No in-guild bot token available → set 6× `BOT_TOKEN_*` on Vercel → Redeploy |
| "None of the Dominyx bots…" / "no permission" | Wrong login account (check server owner crown) or tokens missing |
| Vercel not auto-deploying | Push empty trigger commit (`git commit --allow-empty`) to fire webhook |
| `npm.ps1 cannot be loaded` | PowerShell policy → always run `npm.cmd` |
