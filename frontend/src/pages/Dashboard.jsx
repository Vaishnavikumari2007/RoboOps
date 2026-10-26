import { useEffect, useState } from "react";
import { getDashboardSummary } from "../api";
import { LoadingSpinner, ErrorBanner, TimeAgo } from "../components/Components";

const ROBOTS = ["R1", "R2", "R3", "R4", "R5"];

function RobotCard({ id, tasks }) {
  const active = tasks.find(
    (t) => t.robot_id === id && !["draft", "complete"].includes(t.stage)
  );
  const status = active
    ? active.stage === "in_progress" ? "maintenance" : "dispatched"
    : "idle";

  const colors = {
    idle:        { dot: "var(--accent-green)",  label: "Idle" },
    dispatched:  { dot: "var(--accent-orange)", label: "Dispatched" },
    maintenance: { dot: "var(--accent-cyan)",   label: "In Maintenance" },
  };
  const c = colors[status];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontSize: "2rem", textAlign: "center" }}>🤖</div>
      <div style={{ textAlign: "center" }}>
        <span className="mono" style={{ color: "var(--accent-cyan)" }}>{id}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
        <span
          className={status !== "idle" ? "pulse" : ""}
          style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }}
        />
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{c.label}</span>
      </div>
      {active && (
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>
          {active.title}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      import("../api").then((m) => m.listTasks()),
    ])
      .then(([s, t]) => { setSummary(s); setTasks(t); })
      .catch((e) => setError(e.message));
  }, []);

  const stats = summary
    ? [
        { label: "Total Reports",    value: summary.total_reports,     accent: "var(--accent-cyan)" },
        { label: "Open Issues",       value: summary.open_issues,       accent: "var(--accent-orange)" },
        { label: "Pending Approvals", value: summary.pending_approvals, accent: "var(--accent-purple)" },
        { label: "Completed Tasks",   value: summary.completed_tasks,   accent: "var(--accent-green)" },
      ]
    : [];

  return (
    <div className="page-fade">
      <div className="page-header">
        <h2>Overview Dashboard</h2>
        <p>Real-time summary of your robotics team operations</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!summary ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Stats */}
          <div className="stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat-card" style={{ "--stat-accent": s.accent }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Robot Fleet */}
          <div className="card mb-3">
            <div className="flex-between mb-2">
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700 }}>Robot Fleet — Simulation Status</h3>
              <span style={{
                fontSize: "0.65rem",
                background: "rgba(255,153,0,0.1)",
                color: "var(--accent-orange)",
                border: "1px solid rgba(255,153,0,0.3)",
                padding: "0.2rem 0.6rem",
                borderRadius: 4,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}>
                SIMULATION ONLY
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
              {ROBOTS.map((id) => <RobotCard key={id} id={id} tasks={tasks} />)}
            </div>
          </div>

          {/* Activity feed */}
          <div className="card">
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>Recent Activity</h3>
            {summary.recent_activity.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No activity yet. Submit a report to get started.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {summary.recent_activity.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "1rem", alignItems: "flex-start",
                    paddingBottom: "0.75rem",
                    borderBottom: i < summary.recent_activity.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--accent-cyan)",
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {a.event}
                      </span>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        {a.detail}
                      </p>
                    </div>
                    <TimeAgo iso={a.time} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
