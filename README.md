# Dependency Update Triage (CLOUD-242)

Ranks Dependabot / Renovate update PRs by risk so security and behaviour-changing updates are reviewed first.

- `server/` Express API (scoring, GitHub fetch, 10-minute cache)
- `web/` Next.js dashboard (proxies `/api/*` to the API)

## Run locally

```bash
cd server && npm install && cp .env.example .env   # put GITHUB_TOKEN in .env (a token with no scopes is enough)
npm start                                          # http://localhost:4000

cd web && npm install && npm run dev               # http://localhost:3000
```

## Deploy on Render

The whole app runs as one Render web service: `start.js` launches the Express API on an internal port and Next.js on Render's public
port, and Next proxies `/api/*` to Express.

| Setting | Value |
|---|---|
| Root Directory | (leave empty) |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Environment | `GITHUB_TOKEN`, `NODE_VERSION=22`, `KEEP_ALIVE=true`, `KEEP_ALIVE_UNTIL=2026-11-08` |

`render.yaml` holds the same settings, so **New -> Blueprint** also works. `.env` is git-ignored, so set `GITHUB_TOKEN` in the Render dashboard.

### Keeping the free service awake

Free Render services sleep after about 15 minutes without traffic. With `KEEP_ALIVE=true` the service pings its own public URL every 8 minutes,
which counts as traffic. The pinger stops itself after `KEEP_ALIVE_UNTIL`, because free services draw on a limited monthly pool of
instance-hours. Remove the variable or set `KEEP_ALIVE=false` to turn it off.
