import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getDashboardData } from "../services/dashboardService";
import { PriorityBadge, LoadingSpinner, ErrorBanner, TimeAgo, EmptyState } from "../components/Components";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(() => {
    getDashboardData()
      .then((res) => {
        setData(res);
        setError(res?.error || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  if (loading && !data) {
    return (
      <div className="page-container">
        <LoadingSpinner text="Aggregating robotics fleet metrics…" />
      </div>
    );
  }

  const {
    totalRobots = 5,
    operationalRobots = 4,
    openIssuesCount = 0,
    criticalHighCount = 0,
    pendingApprovalsCount = 0,
    completedTasksCount = 0,
    recentActivity = [],
    priorityDistribution = { critical: 0, high: 0, medium: 0, low: 0 },
    urgentIssues = [],
    isMockFallback = false,
  } = data || {};

  const totalAnalyzedIssues =
    priorityDistribution.critical +
    priorityDistribution.high +
    priorityDistribution.medium +
    priorityDistribution.low;

  return (
    <div className="page-container">
      {/* Fallback Notice if backend was unreachable */}
      {isMockFallback && (
        <div className="info-banner mb-3" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
          <div className="info-banner-icon">⚠️</div>
          <div>
            <strong style={{ color: "var(--priority-medium)" }}>Temporary Standby Data: </strong>
            Backend API is currently connecting or operating in offline fallback mode. Dashboard statistics will refresh automatically as live telemetry streams in.
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={handleRefresh} />}

      {/* ── 1-6. Top Metrics KPI Grid (Clickable to respective pages) ── */}
      <div className="stat-grid mb-3">
        {/* 1. Total registered robots */}
        <Link to="/fleet" className="stat-card stat-card-interactive" title="View all registered units in Fleet">
          <div className="flex-between">
            <span className="stat-label">Total Registered Units</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value text-blue">{totalRobots}</div>
          <div className="stat-subtext">Automated workcells & robots</div>
        </Link>

        {/* 2. Robots currently operational */}
        <Link to="/fleet" className="stat-card stat-card-interactive" title="View operational readiness in Fleet">
          <div className="flex-between">
            <span className="stat-label">Operational Units</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value text-teal">
            {operationalRobots}
            <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {" "}/ {totalRobots}
            </span>
          </div>
          <div className="stat-subtext">
            {totalRobots > 0 ? `${Math.round((operationalRobots / totalRobots) * 100)}% fleet readiness` : "100% readiness"}
          </div>
        </Link>

        {/* 3. Open issues */}
        <Link to="/issues" className="stat-card stat-card-interactive" title="View open triage issues">
          <div className="flex-between">
            <span className="stat-label">Open Active Issues</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value text-amber">{openIssuesCount}</div>
          <div className="stat-subtext">Awaiting resolution or closure</div>
        </Link>

        {/* 4. Critical or high-priority issues */}
        <Link to="/issues" className="stat-card stat-card-interactive" title="Filter critical and high issues">
          <div className="flex-between">
            <span className="stat-label">Critical / High Issues</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value" style={{ color: criticalHighCount > 0 ? "var(--priority-critical)" : "var(--priority-low)" }}>
            {criticalHighCount}
          </div>
          <div className="stat-subtext">Require immediate technician triage</div>
        </Link>

        {/* 5. Pending task approvals */}
        <Link to="/tasks" className="stat-card stat-card-interactive" title="Review draft tasks on Task Board">
          <div className="flex-between">
            <span className="stat-label">Pending Task Approvals</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value" style={{ color: "var(--stage-awaiting)" }}>
            {pendingApprovalsCount}
          </div>
          <div className="stat-subtext">Human approval gate required</div>
        </Link>

        {/* 6. Tasks completed */}
        <Link to="/tasks" className="stat-card stat-card-interactive" title="View completed maintenance tasks">
          <div className="flex-between">
            <span className="stat-label">Tasks Completed</span>
            <span className="stat-link-arrow">→</span>
          </div>
          <div className="stat-value text-teal">{completedTasksCount}</div>
          <div className="stat-subtext">Simulated & verified complete</div>
        </Link>
      </div>

      {/* ── 10. Quick Action Banner to submit a new report ── */}
      <div className="quick-action-banner mb-3">
        <div>
          <div className="quick-action-title">
            📋 Submit Incident Note or Shift Report
          </div>
          <p className="quick-action-desc">
            Encountered a mechanical fault, sensor glitch, or completing a team standup? Input unstructured text for rule-based robotic component and symptom extraction.
          </p>
        </div>
        <Link to="/reports" className="btn btn-primary" style={{ flexShrink: 0 }}>
          + New Report
        </Link>
      </div>

      <div className="grid-2 mb-3">
        {/* ── 8. Priority Distribution Chart ── */}
        <div className="card">
          <div className="flex-between mb-1">
            <div>
              <h3 className="card-header-title">Issue Priority Distribution</h3>
              <p className="card-subtitle">Deterministic triage bands calculated from 0–100 risk score</p>
            </div>
            <Link to="/issues" className="btn btn-ghost btn-sm">
              View All Issues →
            </Link>
          </div>

          {/* Visual Distribution Bar */}
          <div className="mt-3 mb-3">
            <div className="progress-track" style={{ height: "12px", display: "flex", gap: "2px" }}>
              {totalAnalyzedIssues > 0 ? (
                <>
                  {priorityDistribution.critical > 0 && (
                    <div
                      style={{
                        width: `${(priorityDistribution.critical / totalAnalyzedIssues) * 100}%`,
                        background: "var(--priority-critical)",
                        borderRadius: "2px",
                      }}
                      title={`Critical: ${priorityDistribution.critical}`}
                    />
                  )}
                  {priorityDistribution.high > 0 && (
                    <div
                      style={{
                        width: `${(priorityDistribution.high / totalAnalyzedIssues) * 100}%`,
                        background: "var(--priority-high)",
                        borderRadius: "2px",
                      }}
                      title={`High: ${priorityDistribution.high}`}
                    />
                  )}
                  {priorityDistribution.medium > 0 && (
                    <div
                      style={{
                        width: `${(priorityDistribution.medium / totalAnalyzedIssues) * 100}%`,
                        background: "var(--priority-medium)",
                        borderRadius: "2px",
                      }}
                      title={`Medium: ${priorityDistribution.medium}`}
                    />
                  )}
                  {priorityDistribution.low > 0 && (
                    <div
                      style={{
                        width: `${(priorityDistribution.low / totalAnalyzedIssues) * 100}%`,
                        background: "var(--priority-low)",
                        borderRadius: "2px",
                      }}
                      title={`Low: ${priorityDistribution.low}`}
                    />
                  )}
                </>
              ) : (
                <div style={{ width: "100%", background: "var(--border-subtle)", borderRadius: "2px" }} />
              )}
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="analytics-bar-group">
            {[
              {
                label: "Critical (Score ≥ 75)",
                count: priorityDistribution.critical,
                color: "var(--priority-critical)",
                badge: "badge-critical",
              },
              {
                label: "High (Score 55–74)",
                count: priorityDistribution.high,
                color: "var(--priority-high)",
                badge: "badge-high",
              },
              {
                label: "Medium (Score 35–54)",
                count: priorityDistribution.medium,
                color: "var(--priority-medium)",
                badge: "badge-medium",
              },
              {
                label: "Low (Score < 35)",
                count: priorityDistribution.low,
                color: "var(--priority-low)",
                badge: "badge-low",
              },
            ].map((item) => {
              const pct =
                totalAnalyzedIssues > 0
                  ? Math.round((item.count / totalAnalyzedIssues) * 100)
                  : 0;
              return (
                <div key={item.label} className="flex-between mb-2" style={{ fontSize: "0.82rem" }}>
                  <div className="flex gap-1" style={{ alignItems: "center" }}>
                    <span className={`badge ${item.badge}`} style={{ width: "16px", height: "16px", padding: 0, borderRadius: "50%", justifyContent: "center" }}>
                      •
                    </span>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.label}</span>
                  </div>
                  <div className="mono font-semibold" style={{ color: item.color }}>
                    {item.count} <span className="text-muted" style={{ fontWeight: 400 }}>({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 7. Recent Operational Activity Feed ── */}
        <div className="card">
          <div className="flex-between mb-2">
            <div>
              <h3 className="card-header-title">Recent Operational Activity</h3>
              <p className="card-subtitle">Automated extractions, issue matching, and task updates</p>
            </div>
            <Link to="/audit" className="btn btn-ghost btn-sm">
              Full Audit Trail →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No recent operations logged"
              description="New events will record here when incident notes or maintenance reports are submitted."
            />
          ) : (
            <div className="activity-stream mt-2">
              {recentActivity.slice(0, 5).map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" />
                  <div className="activity-body">
                    <div className="flex-between">
                      <span className="activity-event-name">{a.event}</span>
                      <TimeAgo iso={a.time} />
                    </div>
                    <p className="activity-detail">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 9. Most Urgent Issues Table / List ── */}
      <div className="card">
        <div className="flex-between mb-2">
          <div>
            <h3 className="card-header-title">Most Urgent Active Issues</h3>
            <p className="card-subtitle">Ranked by rule-engine priority score — immediate attention recommended</p>
          </div>
          <Link to="/issues" className="btn btn-ghost btn-sm">
            View All Issues →
          </Link>
        </div>

        {urgentIssues.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="All systems operational"
            description="No active critical or high-risk issues detected across the robot fleet."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Priority Risk</th>
                  <th>Assigned Robot</th>
                  <th>Target Component</th>
                  <th>Observed Symptom</th>
                  <th>Priority Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {urgentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="mono font-semibold">#{issue.id}</td>
                    <td>
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td>
                      <span className="mono text-blue font-semibold">
                        {issue.robot_id || "Unassigned"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {issue.component || "Unknown Component"}
                    </td>
                    <td className="text-secondary">
                      {issue.symptom || "Not specified"}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div className="flex-between mb-1" style={{ fontSize: "0.75rem" }}>
                        <span className="mono font-semibold" style={{ color: `var(--priority-${issue.priority})` }}>
                          {issue.priority_score} / 100
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: "4px" }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, issue.priority_score))}%`,
                            background: `var(--priority-${issue.priority})`,
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <Link to="/issues" className="btn btn-ghost btn-sm">
                        Review Issue →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
