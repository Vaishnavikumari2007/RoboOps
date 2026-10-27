import { useEffect, useState } from "react";
import { listReports, listIssues, listTasks, getAuditLog } from "../api";
import { LoadingSpinner, ErrorBanner } from "../components/Components";

export default function OperationsAnalytics() {
  const [data, setData] = useState({
    reports: [],
    issues: [],
    tasks: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = () => {
    Promise.all([listReports(), listIssues(), listTasks(), getAuditLog()])
      .then(([reports, issues, tasks, logs]) => {
        setData({ reports, issues, tasks, logs });
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const { reports, issues, tasks, logs } = data;

  // Component frequency calculation
  const componentCounts = issues.reduce((acc, issue) => {
    const comp = issue.component || "Unknown Component";
    acc[comp] = (acc[comp] || 0) + 1;
    return acc;
  }, {});
  const sortedComponents = Object.entries(componentCounts).sort((a, b) => b[1] - a[1]);

  // Symptom frequency calculation
  const symptomCounts = issues.reduce((acc, issue) => {
    const symp = issue.symptom || "Unspecified Symptom";
    acc[symp] = (acc[symp] || 0) + 1;
    return acc;
  }, {});
  const sortedSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  // Priority distribution
  const priorityBreakdown = {
    critical: issues.filter((i) => i.priority === "critical").length,
    high: issues.filter((i) => i.priority === "high").length,
    medium: issues.filter((i) => i.priority === "medium").length,
    low: issues.filter((i) => i.priority === "low").length,
  };

  // Task funnel
  const taskStages = {
    draft: tasks.filter((t) => t.stage === "draft").length,
    awaiting_approval: tasks.filter((t) => t.stage === "awaiting_approval").length,
    dispatched: tasks.filter((t) => t.stage === "dispatched").length,
    in_progress: tasks.filter((t) => t.stage === "in_progress").length,
    complete: tasks.filter((t) => t.stage === "complete").length,
  };

  const completionRate = tasks.length > 0
    ? Math.round((taskStages.complete / tasks.length) * 100)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h2>Operations Analytics & Insights</h2>
          <p>System metrics, failure telemetry, and resolution performance</p>
        </div>
        <button className="btn btn-ghost" onClick={loadAll}>Refresh</button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Top High-level KPIs */}
          <div className="stat-grid mb-3">
            <div className="stat-card">
              <div className="stat-label">Total Ingested Reports</div>
              <div className="stat-value">{reports.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Identified Issues</div>
              <div className="stat-value text-blue">{issues.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Resolved / Complete Tasks</div>
              <div className="stat-value text-teal">{taskStages.complete}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Task Resolution Rate</div>
              <div className="stat-value text-teal">{completionRate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Logged Audit Events</div>
              <div className="stat-value text-muted">{logs.length}</div>
            </div>
          </div>

          <div className="grid-2 mb-3">
            {/* Priority Distribution */}
            <div className="card">
              <h3 className="card-header-title mb-2">Priority Distribution</h3>
              <p className="card-subtitle mb-3">Breakdown of operational risk scores computed by rule engine</p>
              
              <div className="analytics-bar-group">
                {[
                  { label: "Critical Priority", count: priorityBreakdown.critical, color: "var(--priority-critical)", bg: "var(--priority-critical-bg)" },
                  { label: "High Priority", count: priorityBreakdown.high, color: "var(--priority-high)", bg: "var(--priority-high-bg)" },
                  { label: "Medium Priority", count: priorityBreakdown.medium, color: "var(--priority-medium)", bg: "var(--priority-medium-bg)" },
                  { label: "Low Priority", count: priorityBreakdown.low, color: "var(--priority-low)", bg: "var(--priority-low-bg)" },
                ].map((item) => {
                  const pct = issues.length > 0 ? Math.round((item.count / issues.length) * 100) : 0;
                  return (
                    <div key={item.label} className="mb-2">
                      <div className="flex-between mb-1" style={{ fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                        <span className="mono text-muted">{item.count} ({pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Simulation Funnel */}
            <div className="card">
              <h3 className="card-header-title mb-2">Workflow Pipeline Funnel</h3>
              <p className="card-subtitle mb-3">Current maintenance task distribution by simulation stage</p>

              <div className="analytics-bar-group">
                {[
                  { label: "Draft (Awaiting Human Review)", count: taskStages.draft, color: "var(--stage-draft)" },
                  { label: "Awaiting Approval", count: taskStages.awaiting_approval, color: "var(--stage-awaiting)" },
                  { label: "Dispatched", count: taskStages.dispatched, color: "var(--stage-dispatched)" },
                  { label: "In Progress", count: taskStages.in_progress, color: "var(--stage-progress)" },
                  { label: "Complete / Verified", count: taskStages.complete, color: "var(--stage-complete)" },
                ].map((item) => {
                  const pct = tasks.length > 0 ? Math.round((item.count / tasks.length) * 100) : 0;
                  return (
                    <div key={item.label} className="mb-2">
                      <div className="flex-between mb-1" style={{ fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                        <span className="mono text-muted">{item.count} ({pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Component Failure Frequency */}
            <div className="card">
              <h3 className="card-header-title mb-2">Most Frequent Component Failures</h3>
              <p className="card-subtitle mb-2">Components flagged in incoming reports</p>
              {sortedComponents.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.82rem" }}>No component issues analyzed yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Incident Count</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedComponents.slice(0, 5).map(([comp, count]) => (
                        <tr key={comp}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{comp}</td>
                          <td className="mono">{count}</td>
                          <td className="mono text-muted">
                            {Math.round((count / issues.length) * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recurring Symptoms */}
            <div className="card">
              <h3 className="card-header-title mb-2">Dominant Failure Symptoms</h3>
              <p className="card-subtitle mb-2">Reported symptoms ranked by recurrence</p>
              {sortedSymptoms.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.82rem" }}>No symptoms recorded yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Symptom</th>
                        <th>Occurrences</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSymptoms.slice(0, 5).map(([symp, count]) => (
                        <tr key={symp}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{symp}</td>
                          <td className="mono">{count}</td>
                          <td className="mono text-muted">
                            {Math.round((count / issues.length) * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
