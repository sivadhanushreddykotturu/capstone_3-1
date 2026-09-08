// Risk scoring: separates behaviour-changing / security-relevant updates from inert ones.

const SEC = /\b(security|cve-\d{4}-\d+|ghsa-[\w-]+|vulnerab\w*|exploit|redos|prototype pollution|xss|csrf|rce|injection|advisory)\b/i;
const BRK = /\b(breaking|removed?|drop(ped|s)?|deprecat\w+|no longer|incompatible|migration)\b/i;
const DEV = /(\bdev\b|eslint|prettier|jest|mocha|@types\/|types-|test|lint|webpack-cli|babel)/i;

export const BATCHES = ["Critical", "High", "Standard", "Safe"];

export const ACTIONS = {
  Critical: "Review today, one at a time — security-relevant.",
  High: "Review individually before merging — likely to change behaviour.",
  Standard: "Skim notes, merge together as one batch after CI is green.",
  Safe: "Low risk — merge together as one batch.",
};

// Strip bot boilerplate, links and HTML so words inside URLs ("code-security") don't count.
function clean(body) {
  return (body || "")
    .split(/Dependabot will resolve any conflicts|Dependabot commands and options|<details>\s*<summary>\s*Dependabot/i)[0]
    .replace(/<[^>]+>/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ");
}

function semver(v) {
  const m = (v || "").match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? [+m[1], +m[2], +(m[3] || 0)] : null;
}

function bumpType(title) {
  const m = title.match(/from\s+v?([\w.\-]+)\s+to\s+v?([\w.\-]+)/i);
  if (!m) return "unknown";
  const a = semver(m[1]);
  const b = semver(m[2]);
  if (!a || !b) return "unknown";
  if (b[0] > a[0]) return "major";
  if (b[1] > a[1]) return "minor";
  return "patch";
}

export function scorePR(pr) {
  const text = `${pr.title || ""} ${clean(pr.body)}`;
  const bump = bumpType(pr.title || "");
  const security = SEC.test(text);
  const breaking = BRK.test(text);
  const dev = DEV.test(pr.title || "");

  let score = 0;
  const reasons = [];
  if (security) { score += 60; reasons.push("security advisory/CVE mentioned"); }
  if (bump === "major") { score += 25; reasons.push("major version bump"); }
  else if (bump === "minor") { score += 10; reasons.push("minor bump"); }
  else if (bump === "patch") { score += 2; reasons.push("patch bump"); }
  else { score += 8; reasons.push("version change unclear"); }
  if (breaking) { score += 20; reasons.push("breaking/removal language in notes"); }
  if (dev && !security) { score -= 8; reasons.push("dev/tooling dependency"); }
  score = Math.max(0, Math.min(100, score));

  const batch = security ? "Critical" : bump === "major" || breaking ? "High" : score >= 10 ? "Standard" : "Safe";

  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    createdAt: pr.created_at,
    bump,
    security,
    breaking,
    score,
    batch,
    reasons,
  };
}

// Compare our risk-ranked queue with a plain oldest-first queue (the baseline).
export function buildReport(label, prs) {
  const items = prs.map(scorePR);
  const fifo = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const ranked = [...items].sort((a, b) => b.score - a.score);
  const secs = items.filter((i) => i.security);

  const avgPos = (list) =>
    secs.length ? secs.reduce((sum, s) => sum + list.indexOf(s) + 1, 0) / secs.length : 0;
  const lastPos = (list) => (secs.length ? Math.max(...secs.map((s) => list.indexOf(s) + 1)) : 0);

  const individual = items.filter((i) => i.batch === "Critical" || i.batch === "High").length;
  const batchedGroups =
    (items.some((i) => i.batch === "Standard") ? 1 : 0) + (items.some((i) => i.batch === "Safe") ? 1 : 0);

  const batches = BATCHES.map((name) => ({
    name,
    action: ACTIONS[name],
    items: items.filter((i) => i.batch === name).sort((a, b) => b.score - a.score),
  }));

  return {
    repo: label,
    total: items.length,
    securityCount: secs.length,
    metrics: {
      baseline: { avgSecurityPosition: avgPos(fifo), lastSecurityPosition: lastPos(fifo), reviewActions: items.length },
      triage: { avgSecurityPosition: avgPos(ranked), lastSecurityPosition: lastPos(ranked), reviewActions: individual + batchedGroups },
    },
    batches,
  };
}
