"use client";

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 14;
const BATCH_COLOR = { Critical: "var(--crit)", High: "var(--high)", Standard: "var(--std)", Safe: "var(--safe)" };
const BUMP_COLOR = { major: "#7c3aed", minor: "#2563eb", patch: "#16a34a", unknown: "#9ca3af" };

const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

function Compare({ label, a, b }) {
  const better = a > 0 && b < a ? Math.round((1 - b / a) * 100) : 0;
  return (
    <div>
      <div className="k">{label}</div>
      <div className="v">
        <span>{fmt(a)} →</span> {fmt(b)} {better > 0 && <b> −{better}%</b>}
      </div>
    </div>
  );
}

export default function Home() {
  const [repo, setRepo] = useState("https://github.com/expressjs/express");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function load(path) {
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const res = await fetch(path);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json);
      setFilter("All");
      setPage(1);
    } catch (e) {
      setData(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const all = useMemo(
    () => (data ? data.batches.flatMap((b) => b.items).sort((x, y) => y.score - x.score) : []),
    [data]
  );
  const rows = filter === "All" ? all : all.filter((i) => i.batch === filter);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, rows.length);
  const m = data?.metrics;
  const actionFor = data?.batches.find((b) => b.name === filter)?.action;

  function pick(name) {
    setFilter(name);
    setPage(1);
  }

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="logo" />
          <span>Dependency Triage</span>
          {data && (<><span className="slash">/</span><span className="repo">{data.repo}</span></>)}
        </div>

        <form className="search" onSubmit={(e) => { e.preventDefault(); load(`/api/analyze?repo=${encodeURIComponent(repo)}`); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="GitHub repo URL, e.g. https://github.com/owner/repo" aria-label="GitHub repository URL" />
        </form>

        <div className="actions">
          <button className="btn" disabled={loading} onClick={() => load("/api/sample")}>Sample data</button>
          <button className="btn primary" disabled={loading} onClick={() => load(`/api/analyze?repo=${encodeURIComponent(repo)}`)}>
            {loading ? "Analysing…" : "Analyse"}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="side">
          <div className="group">Review queue</div>
          {["All", ...(data ? data.batches.map((b) => b.name) : ["Critical", "High", "Standard", "Safe"])].map((name) => {
            const count = !data ? "" : name === "All" ? data.total : data.batches.find((b) => b.name === name).items.length;
            return (
              <button key={name} className={`nav ${filter === name ? "active" : ""}`} onClick={() => pick(name)} disabled={!data || count === 0}>
                <span className="lead">
                  {name !== "All" && <i className="dot" style={{ background: BATCH_COLOR[name] }} />}
                  {name === "All" ? "All updates" : name}
                </span>
                <span className="count">{count}</span>
              </button>
            );
          })}
        </aside>

        <main className="main">
          {error && <div className="msg error">{error}</div>}
          {!data && !error && <div className="msg">Enter a GitHub repository above and press Analyse, or load the sample data.</div>}

          {data && (
            <>
              <div className="head">
                <div>
                  <div className="title">{filter === "All" ? "Update queue" : `${filter} updates`}</div>
                  <div className="sub">
                    {filter === "All"
                      ? `${data.total} Dependabot / Renovate PRs, ${data.securityCount} security-relevant. Highest risk first.`
                      : actionFor}
                  </div>
                </div>
              </div>

              <div className="compare">
                <Compare label="Avg. queue position of a security update (oldest first → triage)" a={m.baseline.avgSecurityPosition} b={m.triage.avgSecurityPosition} />
                <Compare label="Last security update position" a={m.baseline.lastSecurityPosition} b={m.triage.lastSecurityPosition} />
                <Compare label="Review actions" a={m.baseline.reviewActions} b={m.triage.reviewActions} />
              </div>

              {rows.length === 0 ? (
                <div className="msg">No updates in this batch.</div>
              ) : (
              <>
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>PR</th><th>Update</th><th>Batch</th><th>Bump</th><th>Security</th><th className="num">Score</th><th>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((it) => (
                      <tr key={it.number}>
                        <td><a href={it.url} target="_blank" rel="noreferrer">#{it.number}</a></td>
                        <td className="title-cell" title={it.title}>{it.title}</td>
                        <td><span className="tag"><i className="dot" style={{ background: BATCH_COLOR[it.batch] }} />{it.batch}</span></td>
                        <td><span className="tag"><i className="dot" style={{ background: BUMP_COLOR[it.bump] }} />{it.bump}</span></td>
                        <td>{it.security ? <span className="badge bad">Advisory</span> : <span className="badge none">–</span>}</td>
                        <td className="num">{it.score}</td>
                        <td className="why" onClick={() => setSelected(it)} title="Click to see the full reasoning">{it.reasons.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="foot">
                <span>Showing {from}-{to} of {rows.length} updates</span>
                <div className="pager">
                  <button disabled={page === 1} onClick={() => setPage(1)} aria-label="First page">«</button>
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">‹</button>
                  <button className="cur" aria-current="page">{page} / {pages}</button>
                  <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page">›</button>
                  <button disabled={page === pages} onClick={() => setPage(pages)} aria-label="Last page">»</button>
                </div>
              </div>
              </>
              )}

              <div className="note">
                Rule-based scoring: security keywords, semver bump and breaking-change wording. Review actions assume Critical and High are
                reviewed individually and Standard and Safe are each merged as one batch. Code-diff analysis is not implemented yet.
              </div>
            </>
          )}
        </main>
      </div>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="card" role="dialog" aria-modal="true" aria-label="Why this update was ranked here" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-sub">
                  <a href={selected.url} target="_blank" rel="noreferrer">#{selected.number}</a>
                </div>
                <div className="card-title">{selected.title}</div>
              </div>
              <button className="x" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>

            <div className="card-tags">
              <span className="tag"><i className="dot" style={{ background: BATCH_COLOR[selected.batch] }} />{selected.batch}</span>
              <span className="tag"><i className="dot" style={{ background: BUMP_COLOR[selected.bump] }} />{selected.bump} bump</span>
              {selected.security && <span className="badge bad">Advisory</span>}
              <span className="tag">Score {selected.score}</span>
            </div>

            <div className="card-label">Why it was ranked here</div>
            <ul className="reasons">
              {selected.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
