import { useEffect, useState } from "react";
import { getAuditLog } from "../api";
import { LoadingSpinner, ErrorBanner, TimeAgo } from "../components/Components";

const EVENT_ICONS = {
  report_submitted: "📋",
  issue_created:    "🔍",
  task_proposed:    "📝",
  task_approved:    "✅",
  task_advanced:    "⚙",
};

const EVENT_COLORS = {
  report_submitted: "var(--accent-cyan)",
  issue_created:    "var(--accent-orange)",
  task_proposed:    "var(--accent-purple)",
  task_approved:    "var(--accent-green)",
  task_advanced:    "var(--text-secondary)",
};

function StatsPanel({ logs }) {
  const total    = logs.length;
  const approved = logs.filter((l) => l.event_type === "task_approved").length;
  const reports  = logs.filter((l) => l.event_type === "report_submitted").length;
  const issues   = logs.filter((l) => l.event_type === "issue_created").length;

  const statItems = [
    { label: "Total Events",    value: total,    color: "var(--accent-cyan)" },
    { label: "Reports Submitted",value: reports, color: "var(--accent-orange)" },
    { label: "Issues Created",   value: issues,  color: "var(--accent-purple)" },
    { label: "Tasks Approved",   value: approved, color: "var(--accent-green)" },
  ];

  return (
    <div className="stat-grid mb-3">
      {statItems.map((s) => (
        <div key={s.label} className="stat-card" style={{ "--stat-accent": s.color }}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function EvaluationAudit() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    getAuditLog()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const eventTypes = ["all", ...new Set(logs.map((l) => l.event_type))];
  const filtered = filter === "all" ? logs : logs.filter((l) => l.event_type === filter);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h2>Evaluation & Audit Log</h2>
        <p>Complete, immutable record of every system decision — nothing is deleted or modified</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!loading && <StatsPanel logs={logs} />}

      {/* Integrity notice */}
      <div style={{
        background: "rgba(0,229,255,0.06)",
        border: "1px solid rgba(0,229,255,0.2)",
        borderRadius: 8, padding: "0.75rem 1rem",
        marginBottom: "1.5rem", fontSize: "0.8rem", color: "var(--text-secondary)",
      }}>
        <strong style={{ color: "var(--accent-cyan)" }}>Audit Integrity: </strong>
        All entries are append-only. Entries are never edited or deleted.
        Every entry records what happened, who triggered it, and the rule-based reason behind it.
      </div>

      <div className="card">
        <div className="flex-between mb-2">
          <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
            {eventTypes.map((t) => (
              <button
                key={t}
                className={`btn ${filter === t ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFilter(t)}
                style={{ fontSize: "0.72rem", textTransform: t === "all" ? "none" : "none" }}
              >
                {t === "all" ? "All Events" : t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>No audit entries yet. The log fills up as you use the system.</p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Timeline line */}
            <div style={{
              position: "absolute", left: 19, top: 0, bottom: 0,
              width: 2, background: "var(--border-subtle)",
            }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {filtered.map((log, i) => (
                <div key={log.id} style={{
                  display: "flex", gap: "1rem",
                  paddingBottom: "1.25rem",
                  position: "relative",
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--bg-surface)",
                    border: `2px solid ${EVENT_COLORS[log.event_type] || "var(--border-subtle)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1rem", flexShrink: 0, zIndex: 1,
                  }}>
                    {EVENT_ICONS[log.event_type] || "•"}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <div className="flex-between">
                      <span style={{
                        fontSize: "0.78rem", fontWeight: 700,
                        color: EVENT_COLORS[log.event_type] || "var(--text-primary)",
                        textTransform: "capitalize",
                      }}>
                        {log.event_type.replace(/_/g, " ")}
                      </span>
                      <TimeAgo iso={log.created_at} />
                    </div>
                    {log.actor && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        By: <span style={{ color: "var(--text-secondary)" }}>{log.actor}</span>
                        {log.entity_type && ` · ${log.entity_type} #${log.entity_id}`}
                      </p>
                    )}
                    {log.reason && (
                      <p style={{
                        fontSize: "0.78rem", color: "var(--text-secondary)",
                        marginTop: 4, lineHeight: 1.5,
                      }}>
                        {log.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
