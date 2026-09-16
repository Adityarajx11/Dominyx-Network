# 07 — Future Premium Plan (SAVED, not started)

**Strategy:** ship premium-grade features FREE now (beta) → build user base → paywall later at small price (₹99–199 / $2–5 per server/month).

## Plumbing (build FIRST when starting)
- `is_premium` per guild in shared Postgres + `checkPremium(guildId)` helper in `packages/core`, defaulting ON for everyone.
- HQ "Premium: Free during beta" badge per server (sets expectations, avoids later backlash).
- Flip later = change one default + add payments. No rewrites.

## Feature split
| Bot | Free forever | Premium (free during beta) |
|---|---|---|
| Music | play, queue, skip | 24/7, playlists, filters, volume memory |
| Level | XP + rank | custom card bg, XP multipliers, role stacking |
| Greet | text welcome | canvas card, auto-role, DM welcome |
| Ticket | 1 category, basic panel | unlimited categories, priorities, claim, transcripts |
| Ping | 1 YouTube channel | multi-channel, custom message, live role ping |
| Guard | warn/kick/ban + modlog | automod (spam/links/caps), self-roles, bulk |

## Growth (before money)
- top.gg + discords.com listings, `/vote` rewards loop, dogfood in own servers.

## Collecting money (when demand exists)
- First: Patreon/Ko-fi (~5–10% fees) + manual/linked premium roles.
- Later: Discord Premium Apps/SKUs (needs approval + ToS/Privacy pages — build those first; Discord mandates them).
- Watch costs: Railway bill must be out-earned first.
