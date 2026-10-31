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
  timer.unref?.();
  console.log(`[keep-alive] pinging ${targets.join(", ")} every ${Math.round(every / 1000)}s`);
}
