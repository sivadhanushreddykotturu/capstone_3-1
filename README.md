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

1. Put this folder in a GitHub repo (`.env` is git-ignored, so the token stays out of it).
2. Render dashboard -> **New -> Blueprint** -> select the repo. It creates `triage-api` and `triage-web` from `render.yaml`.
3. Open `triage-api` -> **Environment** -> set `GITHUB_TOKEN`. Wait for the deploy, then copy its URL (`https://triage-api-xxxx.onrender.com`) and check `/api/health` returns `{"ok":true,"tokenConfigured":true}`.
4. Open `triage-web` -> **Environment** -> set `API_URL` to that URL -> **Manual Deploy**. `API_URL` is read at build time, so it must be set before the build.
5. Open the `triage-web` URL and press **Sample data**, then analyse a repo.

### Keeping the free services awake

Free Render services sleep after about 15 minutes without traffic. With `KEEP_ALIVE=true` each service pings its public URL every 8 minutes
(the web service also pings the API's `/api/health`), which counts as traffic. The pinger stops itself after `KEEP_ALIVE_UNTIL`, because
free services draw on a limited monthly pool of instance-hours and two always-on services use it up quickly. Remove the variable or set
`KEEP_ALIVE=false` to turn it off.
