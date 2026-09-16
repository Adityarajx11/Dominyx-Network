# 02 — HQ Website

Next.js 14 app in `packages/hq`. Dev: `npm.cmd run dev` → `http://localhost:3000`.
Live: `https://dominyx-network-hq.vercel.app/` (Vercel, root dir `packages/hq`).

## Pages
- **`/` Home**: hero, 6 bot cards (tagline, features, Add-to-Discord buttons), login/logout.
- **`/invite`**: every bot + permission list + invite buttons.
- **`/dashboard`**: server cards (avatar, ✓ Bot ready / ✗ Invite a bot to configure). Click → server page.
- **`/dashboard/[id]`**: per-bot tabs (only bots detected in that server) + config panels + "Add more bots" buttons + tip banner when empty. Saving applies instantly (bots read Postgres at runtime, no restart).

## Login (Discord OAuth)
- Scopes: exactly `identify guilds`. (`guilds.members.read` and `guilds.channels` BREAK login — Discord 400s `{"scope":["2"]}`.)
- State-cookie CSRF check; 7-day `dq_session` cookie.
- Cookies are set on the redirect response object (`res.cookies.set`) — the old `cookies()`-then-new-response pattern drops them (caused double-login bug).
- Redirect URIs registered in Dev Portal (HQ app → OAuth2): localhost + Vercel callback.

## Bot detection
- `getBotGuilds` / `getBotsInGuild` probe all 6 `BOT_TOKEN_*` (trimmed), graceful fallback (null = show all tabs).
- `getGuildBotToken(guildId)` probes each token directly against the guild; result (Bot-prefix auth) reads channels/roles for the config API.
- Key files: `lib/discord.js`, `lib/auth.js`, `lib/session.js`, `lib/env.js`, `lib/db.js`,
  `app/api/auth/{login,callback,logout}/route.js`, `app/api/guild/[guildId]/config/route.js`,
  `components/GuildConfig.jsx`, `GuildPicker.jsx`, `ui.jsx`, `SiteNav.jsx`.
