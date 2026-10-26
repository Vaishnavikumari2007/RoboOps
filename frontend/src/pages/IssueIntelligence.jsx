import { useEffect, useState } from "react";
import { listIssues, proposeTask } from "../api";
import { PriorityBadge, LoadingSpinner, ErrorBanner, TimeAgo } from "../components/Components";

function IssueCard({ issue, onProposed }) {
  const [proposing, setProposing] = useState(false);
  const [done, setDone] = useState(issue.status === "task_proposed");
  const [err, setErr] = useState(null);

  const propose = async () => {
    setProposing(true); setErr(null);
    try {
      await proposeTask(issue.id);
      setDone(true);
      onProposed();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setProposing(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Header */}
      <div className="flex-between">
        <div className="flex gap-1" style={{ alignItems: "center" }}>
          <span className="mono text-muted" style={{ fontSize: "0.75rem" }}>#{issue.id}</span>
          <PriorityBadge priority={issue.priority} />
        </div>
        <TimeAgo iso={issue.created_at} />
      </div>

      {/* Core info */}
      <div>
        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {issue.component
            ? `${issue.component}${issue.robot_id ? ` on ${issue.robot_id}` : ""}`
            : "Unspecified component"}
        </p>
        {issue.symptom && (
          <p style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", marginTop: 2 }}>
            Symptom: {issue.symptom}
          </p>
        )}
      </div>

      {/* Score bar */}
      <div>
        <div className="flex-between" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
            PRIORITY SCORE
          </span>
          <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>
            {issue.priority_score}/100
          </span>
        </div>
        <div style={{ height: 4, background: "var(--bg-base)", borderRadius: 2 }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${issue.priority_score}%`,
            background: `var(--priority-${issue.priority})`,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Reason — labelled as system-generated */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "0.75rem",
      }}>
        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.08em" }}>
          SYSTEM-GENERATED ANALYSIS — NOT A CONFIRMED DIAGNOSIS
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {issue.reason || "No analysis available."}
        </p>
      </div>

      {/* Related issues */}
      {issue.related_issue_ids.length > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Similar issues: {issue.related_issue_ids.map((id) => (
            <span key={id} className="mono text-cyan" style={{ marginRight: 6 }}>#{id}</span>
          ))}
        </div>
      )}

      {/* Action */}
      {err && <ErrorBanner message={err} />}
      {done ? (
        <span className="badge badge-awaiting" style={{ alignSelf: "flex-start" }}>Task Proposed</span>
      ) : (
        <button className="btn btn-primary" disabled={proposing} onClick={propose}>
          {proposing ? "Proposing…" : "Propose Maintenance Task"}
        </button>
      )}
    </div>
  );
}

export default function IssueIntelligence() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    listIssues()
      .then(setIssues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = filter === "all" ? issues : issues.filter((i) => i.priority === filter);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h2>Issue Intelligence</h2>
        <p>System-generated analysis of detected issues — requires human review before action</p>
      </div>

      {/* Disclaimer banner */}
      <div style={{
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.25)",
        borderRadius: 8, padding: "0.75rem 1rem",
        marginBottom: "1.5rem",
        fontSize: "0.8rem", color: "var(--text-secondary)",
      }}>
        <strong style={{ color: "var(--accent-purple)" }}>Analysis Disclaimer: </strong>
        All priority scores, reasons, and related-issue links are computed using rule-based logic.
        They are starting points for human review — not confirmed diagnoses. Always verify before approving a task.
      </div>

      <div className="flex-between mb-3">
        <div className="flex gap-1">
          {["all", "critical", "high", "medium", "low"].map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>No issues found. Analyze a report from the Reports Inbox to generate issues.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
          {filtered.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onProposed={load} />
          ))}
        </div>
      )}
    </div>
  );
}
