import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { checkHealth, listTasks } from "../api";

const PAGE_META = {
  "/": {
    title: "Overview Dashboard",
    subtitle: "Real-time robotics fleet telemetry and operational triage",
  },
  "/reports": {
    title: "Reports Inbox",
    subtitle: "Submit and inspect free-text meeting notes and maintenance logs",
  },
  "/issues": {
    title: "Issue Intelligence",
    subtitle: "Rule-based symptom triage and priority scoring engine",
  },
  "/tasks": {
    title: "Task Board & Simulation",
    subtitle: "Multi-stage workflow execution with mandatory human approval",
  },
  "/fleet": {
    title: "Robot Simulation & 2D Grid",
    subtitle: "Software-only 2D workcell map, simulated kinematics, and task dispatching",
  },
  "/simulation": {
    title: "Robot Simulation & 2D Grid",
    subtitle: "Software-only 2D workcell map, simulated kinematics, and task dispatching",
  },
  "/analytics": {
    title: "Operations Analytics",
    subtitle: "Failure frequency, symptom distribution, and resolution metrics",
  },
  "/audit": {
    title: "Audit Log",
    subtitle: "Append-only chronological record of every automated rule evaluation and human decision",
  },
  "/evaluation": {
    title: "Evaluation Center & Benchmarks",
    subtitle: "Objective quantitative evaluation, taxonomy distinction, and empirical latencies",
  },
};

export default function TopHeader({ onToggleSidebar }) {
  const location = useLocation();
  const currentMeta = PAGE_META[location.pathname] || {
    title: "RoboOps Platform",
    subtitle: "Software-only robotics operations management",
  };

  const [connected, setConnected] = useState(null); // null = checking, true = ok, false = error
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);

  const pingStatus = () => {
    checkHealth()
      .then((res) => {
        setConnected(res?.status === "ok");
      })
      .catch(() => {
        setConnected(false);
      });

    listTasks()
      .then((tasks) => {
        const drafts = tasks.filter((t) => t.stage === "draft");
        setPendingCount(drafts.length);
        setPendingTasks(drafts.slice(0, 5));
      })
      .catch(() => {
        // Silently ignore task count if API is offline
      });
  };

  useEffect(() => {
    pingStatus();
    const interval = setInterval(pingStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-icon">☰</span>
        </button>
        <div className="header-titles">
          <h1 className="header-title">{currentMeta.title}</h1>
          <p className="header-subtitle">{currentMeta.subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Connection Status Indicator */}
        <div
          className={`connection-pill ${
            connected === true ? "connected" : connected === false ? "disconnected" : "checking"
          }`}
          onClick={pingStatus}
          title={connected ? "Backend operational (click to re-check)" : "Backend offline (click to retry)"}
        >
          <span className="status-dot" />
          <span className="status-text">
            {connected === true
              ? "API Connected"
              : connected === false
              ? "API Disconnected"
              : "Connecting…"}
          </span>
        </div>

        {/* Notification Area */}
        <div className="notification-wrapper">
          <button
            className={`notification-btn ${pendingCount > 0 ? "has-alerts" : ""}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Approvals and alerts"
            aria-label="Notifications"
          >
            <span className="bell-icon">🔔</span>
            {pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown card">
              <div className="flex-between mb-2">
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                  Pending Approvals
                </span>
                <span className="badge badge-awaiting">{pendingCount} Actionable</span>
              </div>

              {pendingTasks.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.8rem", padding: "0.5rem 0" }}>
                  All maintenance tasks are up to date.
                </p>
              ) : (
                <div className="notification-list">
                  {pendingTasks.map((task) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="notification-item"
                      onClick={() => setShowNotifications(false)}
                    >
                      <div className="flex-between">
                        <span className="mono text-blue" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          Task #{task.id}
                        </span>
                        <span className="badge badge-draft" style={{ fontSize: "0.65rem" }}>
                          Draft
                        </span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-primary)", marginTop: 2 }}>
                        {task.title}
                      </p>
                      <span style={{ fontSize: "0.7rem", color: "var(--accent-teal)" }}>
                        Human approval required →
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="notification-footer mt-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <Link
                  to="/tasks"
                  className="btn btn-ghost btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setShowNotifications(false)}
                >
                  View Task Board
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
