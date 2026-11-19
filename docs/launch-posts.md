# Launch post drafts

These are drafts only. Do not publish them without confirming the live demo, release version, and final project claims.

## Hacker News

**Title:** Show HN: Dominyx Network – a family of focused Discord bots sharing one Node.js core

**First comment:**

Dominyx Network is a public monorepo for six Discord bots: Music, Level, Greet, Ticket, Ping, and Guard. They share a small core package for command loading, embeds, deployment helpers, and Postgres-backed settings, while each bot can be deployed independently. The repository also includes Dominyx HQ, a Next.js dashboard for configuration.

I built it to keep common Discord operations in one place without turning every bot into one large application. The project is still early: the current test coverage is focused on the core settings path, the live demo is available at https://dominyx.vercel.app, and deployment requires Discord application credentials plus Postgres. I would especially value feedback on the package boundaries, operational setup, and the best way to make local development reproducible.

## Reddit

**Title:** Dominyx Network: six focused Discord bots with a shared Node.js core

I’m open-sourcing a JavaScript monorepo containing Music, Level, Greet, Ticket, Ping, and Guard bots plus a Next.js dashboard. Each package can be deployed independently while sharing database and command-loading code. Feedback on setup docs, architecture, and contributor experience is welcome: https://github.com/Adityarajx11/Dominyx-Network

Suggested communities: r/Discord_Bots, r/node, and a relevant self-hosting community after checking each community’s rules.

## X / LinkedIn

Dominyx Network is now open source: six focused Discord bots, one shared Node.js core, and a Next.js HQ dashboard. It is early and practical rather than polished—feedback on architecture, setup, and contributor experience is welcome. https://github.com/Adityarajx11/Dominyx-Network

## Suggested timing

Use a weekday morning in the target audience’s primary time zone, avoid major launch/news windows, and post only after the demo works without private credentials. A short follow-up a few days later should share a concrete change or lesson rather than repeating the announcement.

## Saved issue replies

**Thanks for reporting**

Thanks for the detailed report. I’ve reproduced the issue description and added it to the project queue. If you can share the package, commit or version, and a redacted log, that will help confirm the fix.

**Need more information**

Thanks for opening this. Could you add your Node.js version, deployment environment, affected package, exact reproduction steps, and any relevant logs with tokens and credentials removed?

**Closing a duplicate**

Thanks for reporting this. It duplicates the existing issue linked above, so I’m closing this thread to keep investigation in one place. Please add any new reproduction details to the original issue.
