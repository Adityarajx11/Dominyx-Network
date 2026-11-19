# Contributing to Dominyx Network

## Development setup

1. Install Node.js 20 or newer.
2. Run `npm install` from the repository root.
3. Copy `.env.example` to a local `.env` only when running a bot locally. Never commit `.env` files or real credentials.

## Checks

- Run `npm test` for the core test suite.
- Run `npm run build:hq` when changing `packages/hq`.
- Run the relevant `npm run start:<bot>` command only with local Discord and database credentials.

## Pull requests

Create a focused branch from `main`, explain the user-visible change, include tests or verification steps, and update the relevant guide. Do not push directly to `main`.

## Style

Use CommonJS (`require`/`module.exports`) for bot packages, keep shared logic in `@dominyx/core`, and use the existing formatting style. Slash commands should export `{ data, execute }`; events should export `{ name, once?, execute }`.

## Commit messages

Use a short imperative subject, optionally prefixed with a scope, for example `fix(core): handle missing guild settings`.
