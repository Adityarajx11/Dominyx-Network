# 01 — Bots & Commands (27 total)

## 🎵 Music — Lavalink playback | Railway Online | In: XERXES !!, RAVEN MODZ
Needs Server Members Intent + `LAVALINK_HOST/PORT/PASSWORD/SECURE`.

| Command | Does |
|---|---|
| `/play` | Play by name/link or add to queue |
| `/pause` / `/resume` | Pause / resume |
| `/skip` | Skip current song |
| `/stop` | Stop + clear queue |
| `/queue` | Show queue |
| `/nowplaying` | Current song + buttons |
| `/shuffle` | Shuffle upcoming |
| `/loop` | Loop off / song / queue |
| `/volume` | 0–200% |
| `/247` | 24/7 voice mode |
| `/mylist` | Personal saved playlist |

HQ config: 24/7 toggle.

## 🏆 Level — XP ranks & rewards | Local-only | In: nowhere
| Command | Does |
|---|---|
| `/rank` | Level/XP card for a user |
| `/leaderboard` | Top members by XP |
| `/levelconfig` | Admin: channel, message template, level→role rewards |

HQ config: announcement channel, `{user}`/`{level}` message, level-role add/remove.

## 👋 Greet — crimson welcome cards | Railway Online | In: XERXES !!
| Command | Does |
|---|---|
| `/greetsetup` | Admin: welcome channel, message, auto-role, card on/off |

HQ config: welcome channel, `{user}`/`{server}`/`{membercount}` message, auto-role, card checkbox.

## 🎫 Ticket — support tickets | Railway Online | In: nowhere
| Command | Does |
|---|---|
| `/ticketsetup` | Admin: category, log channel, staff role, max/user, banner, categories |
| `/ticketpanel` | Post creation panel (categories, claim, priority, transcripts) |

## 📡 Ping — YouTube live alerts | Local-only | In: nowhere
| Command | Does |
|---|---|
| `/pingsetup` | Admin: YouTube channel ID (`UC…`), alert channel, enable toggle |

## 🛡️ Guard — security & moderation | Railway Online | In: nowhere
| Command | Does |
|---|---|
| `/ban` / `/kick` / `/warn` | Mod actions with case history + modlog |
| `/bulkban` | Ban multiple IDs at once |
| `/cases` | Member case history |
| `/note` | Staff notes |
| `/roles` | Self-assignable roles browser |
| `/guardsetup` | Admin: modlog channel, self-role categories |

Register/refresh commands: `npm.cmd run deploy:<bot>` (needs that bot's `BOT_TOKEN` + `CLIENT_ID`).
Global commands take up to 1 hour to appear. The trailing `Assertion failed: UV_HANDLE_CLOSING` on Windows is benign.
