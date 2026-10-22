// Runs once when the Next.js server starts. Used only to keep free Render services awake (off unless KEEP_ALIVE=true).
// Pings this site's own public URL plus the API's health endpoint, so one running service keeps both warm.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.KEEP_ALIVE !== "true") return;

  const self = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  const api = (process.env.API_URL || "").replace(/\/$/, "");
  const targets = [self && `${self}/`, api && `${api}/api/health`].filter(Boolean);
  if (!targets.length) return console.log("[keep-alive] enabled but no URL to ping");

  const until = process.env.KEEP_ALIVE_UNTIL ? Date.parse(process.env.KEEP_ALIVE_UNTIL) : Infinity;
  const every = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 8 * 60 * 1000;

  const tick = async () => {
    if (Date.now() > until) {
      console.log("[keep-alive] reached KEEP_ALIVE_UNTIL, stopping");
      return clearInterval(timer);
    }
    for (const url of targets) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        console.log(`[keep-alive] ${url} -> ${res.status}`);
      } catch (e) {
        console.log(`[keep-alive] ${url} failed: ${e.message}`);
      }
    }
  };

  const timer = setInterval(tick, every);
  timer.unref?.();
  console.log(`[keep-alive] pinging ${targets.join(", ")} every ${Math.round(every / 1000)}s`);
}
