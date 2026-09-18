// Keeps a free Render service from spinning down after ~15 min without traffic by pinging public URLs.
// A service that pings its own public URL counts as inbound traffic, so it stays awake while the process runs.
//
//   KEEP_ALIVE=true                    turn the pinger on (off by default, so local runs stay quiet)
//   KEEP_ALIVE_URLS=<url>,<url>        what to ping; defaults to this service's own public URL (RENDER_EXTERNAL_URL)
//   KEEP_ALIVE_UNTIL=2026-11-10        stop pinging after this date, so free instance-hours aren't burned forever
//   KEEP_ALIVE_INTERVAL_MS=480000      ping interval; default 8 minutes
export function startKeepAlive(path = "/api/health") {
  if (process.env.KEEP_ALIVE !== "true") return;

  const targets = (process.env.KEEP_ALIVE_URLS || process.env.RENDER_EXTERNAL_URL || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!targets.length) return console.log("[keep-alive] enabled but no URL to ping (set KEEP_ALIVE_URLS)");

  const until = process.env.KEEP_ALIVE_UNTIL ? Date.parse(process.env.KEEP_ALIVE_UNTIL) : Infinity;
  const every = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 8 * 60 * 1000;

  const tick = async () => {
    if (Date.now() > until) {
      console.log("[keep-alive] reached KEEP_ALIVE_UNTIL, stopping");
      clearInterval(timer);
      return;
    }
    for (const base of targets) {
      try {
        const res = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
        console.log(`[keep-alive] ${base}${path} -> ${res.status}`);
      } catch (e) {
        console.log(`[keep-alive] ${base}${path} failed: ${e.message}`);
      }
    }
  };

  const timer = setInterval(tick, every);
  timer.unref?.(); // never keep the process alive on its own
  console.log(`[keep-alive] pinging ${targets.join(", ")} every ${Math.round(every / 1000)}s`);
}
