const rows = [
  ["Bump prettier from 2.8.0 to 2.8.1", "Patch release. Formatting fixes only."],
  ["Bump lodash from 4.17.15 to 4.17.21", "Security: fixes prototype pollution CVE-2021-23337 (GHSA-35jh-r3h4-6jhm). Severity: high."],
  ["Bump eslint from 8.1.0 to 8.2.0", "Minor release adds new rules."],
  ["Bump webpack from 4.46.0 to 5.0.0", "BREAKING CHANGE: Node 10 support removed, config schema changed."],
  ["Bump @types/node from 18.0.1 to 18.0.2", "Type definition updates."],
  ["Bump jsonwebtoken from 8.5.1 to 9.0.0", "Security: fixes CVE-2022-23529 insecure key handling. Breaking: algorithms must be explicit."],
  ["Bump typescript from 4.9.4 to 4.9.5", "Patch release."],
  ["Bump axios from 0.21.0 to 0.21.4", "Fixes ReDoS vulnerability (CVE-2021-3749)."],
  ["Bump jest from 28.0.0 to 29.0.0", "Breaking: dropped Node 12, removed deprecated matchers."],
  ["Bump chalk from 4.1.1 to 4.1.2", "Patch release. Docs updated."],
  ["Bump react from 17.0.2 to 17.0.3", "Patch release."],
  ["Bump express from 4.17.1 to 4.18.2", "Minor release. Includes fix for open redirect (security advisory GHSA-rv95-896h-c2vc)."],
];

export const samplePRs = rows.map(([title, body], i) => ({
  number: i + 1,
  title,
  body,
  html_url: "#",
  created_at: new Date(Date.now() - (rows.length - i) * 864e5).toISOString(),
}));
