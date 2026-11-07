# Gym Schedule

A personal workout app for the phone: follow today's routine, edit programs, keep an exercise library and a simple log. It works offline and keeps all data on the phone.

Live app: https://moejarrah.github.io/gym-schedule/ (on the iPhone: Share → Add to Home Screen).

## Running it on your computer

You need [Node.js](https://nodejs.org) (version 20 or newer).

```bash
npm run preview          # open http://127.0.0.1:4173/
npm run preview -- --lan # also prints an address your phone can open on the same Wi-Fi
```

## Checking changes

```bash
npm run check   # quick: stamps sw.js, checks syntax, runs unit tests
npm run e2e     # full: clicks through every screen in a headless browser
```

The first time you want `npm run e2e`, run `npm install` and then `npx playwright install chromium`.

## Publishing

1. Run `npm run check` (it updates `sw.js` so phones notice the new version) and `npm run e2e`.
2. Commit everything, including `sw.js`.
3. Push to `main`, from VS Code (Source Control → Sync Changes), GitHub Desktop (Push origin) or a terminal (`git push`).

GitHub Pages publishes it within a minute or two. The installed app picks it up the next time it's opened and reloads once.

## Your data

Everything you enter stays in the app on your phone. Settings → Export app data saves a backup file; Import restores one, including backups from older versions of the app. Make an occasional backup: deleting the home-screen app deletes its data.

## For AI assistants and developers

Start with `AGENTS.md` (rules and code map) and `docs/PRODUCT.md` (what the app does). Planned work is in `docs/TODO.md`.
