import express from "express";
import cors from "cors";
import { buildReport } from "./scoring.js";
import { samplePRs } from "./sample.js";
import { startKeepAlive } from "./keepalive.js";

const app = express();
app.set("trust proxy", 1);
app.use(cors());

const LIMIT = 20;
const WINDOW_MS = 60 * 1000;
const hits = new Map();
setInterval(() => hits.clear(), WINDOW_MS).unref();
app.use("/api/analyze", (req, res, next) => {
  const n = (hits.get(req.ip) || 0) + 1;
  hits.set(req.ip, n);
  if (n > LIMIT) return res.status(429).json({ error: "Too many requests. Wait a minute and try again." });
  next();
});

const PORT = process.env.PORT || 4000;
const TOKEN = process.env.GITHUB_TOKEN || "";

function parseRepo(url = "") {
  const m = url.trim().match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

async function fetchBotPRs({ owner, repo }) {
  const key = `${owner}/${repo}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.prs;
  try {
    const prs = await fetchBotPRsFromGitHub({ owner, repo });
    cache.set(key, { at: Date.now(), prs });
    return prs;
  } catch (e) {
    if (hit) return hit.prs;
    throw e;
  }
}

async function fetchBotPRsFromGitHub({ owner, repo }) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "triage-demo" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const variants = ["author:app/dependabot author:app/renovate", "author:app/dependabot", "author:app/renovate"];
  let res;
  for (const authors of variants) {
    const q = encodeURIComponent(`repo:${owner}/${repo} is:pr ${authors}`);
    res = await fetch(`https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=60`, { headers });
    if (res.status !== 422) break;
  }
  if (res.status === 403 || res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const secondary = /secondary/i.test(body.message || "");
    const err = new Error(
      secondary
        ? "GitHub is throttling rapid searches. Wait about a minute and retry, or use sample data."
        : TOKEN
          ? "GitHub rate limit reached. Wait for it to reset or use sample data."
          : "GitHub rate limit hit. Add GITHUB_TOKEN to server/.env or use sample data."
    );
    err.status = 429;
    throw err;
  }
  if (res.status === 422) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(`GitHub could not search this repo (${body.message || "validation failed"}). Check the URL and that the repo is public.`);
    err.status = 422;
    throw err;
  }
  if (res.status === 401) {
    const err = new Error("GitHub rejected the token. Check GITHUB_TOKEN in server/.env.");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub returned ${res.status}. Check that the repo is public.`);
    err.status = 502;
    throw err;
  }
  const { items = [] } = await res.json();
  return items.filter((p) => /bot\]/.test(p.user?.login || "") || /^(chore\(deps|build\(deps|bump|update)/i.test(p.title));
}

app.get("/api/health", (_req, res) => res.json({ ok: true, tokenConfigured: Boolean(TOKEN) }));

app.get("/api/sample", (_req, res) => res.json(buildReport("sample data", samplePRs)));

app.get("/api/analyze", async (req, res) => {
  const target = parseRepo(String(req.query.repo || ""));
  if (!target) return res.status(400).json({ error: "Not a valid GitHub repo URL." });
  try {
    const prs = await fetchBotPRs(target);
    if (!prs.length) return res.status(404).json({ error: "No Dependabot/Renovate update PRs found in this repo." });
    res.json(buildReport(`${target.owner}/${target.repo}`, prs));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API on port ${PORT}  (GitHub token ${TOKEN ? "configured" : "NOT set — 60 req/hr limit"})`);
  startKeepAlive();
});
