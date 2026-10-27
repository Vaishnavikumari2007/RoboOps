import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchSimulationState,
  dispatchSimulationStep,
  VIRTUAL_WORKCELLS,
} from "../services/simulationService";
import {
  StageBadge,
  PriorityBadge,
  LoadingSpinner,
  ErrorBanner,
  EmptyState,
} from "../components/Components";

export default function RobotFleet() {
  const [data, setData] = useState({ robots: [], tasks: [], workcells: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRobotId, setSelectedRobotId] = useState("R1");
  const [dispatchingId, setDispatchingId] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);
  const [dispatchLog, setDispatchLog] = useState(() => [
    {
      id: 1,
      time: "Initial Boot",
      text: "Simulation engine initialized. 5 virtual workcells online.",
      type: "system",
    },
  ]);

  const loadState = useCallback(() => {
    fetchSimulationState()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const { robots, tasks } = data;
  const selectedRobot =
    robots.find((r) => r.id === selectedRobotId) || robots[0] || null;

  // Handle Simulation Dispatch / Stage Advance
  const handleDispatch = async (task) => {
    if (!task || task.stage === "draft") return;
    setDispatchingId(task.id);
    setDispatchError(null);
    try {
      await dispatchSimulationStep(task.id);
      // Append to simulation dispatch log
      setDispatchLog((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          text: `Simulated dispatch step executed for Task #${task.id} (${task.title}) on ${task.robot_id || "unit"}.`,
          type: "dispatch",
        },
        ...prev.slice(0, 15),
      ]);
      loadState();
    } catch (err) {
      setDispatchError(`Simulation dispatch failed: ${err.message}`);
    } finally {
      setDispatchingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "dispatched":
        return "var(--priority-high)";
      case "maintenance":
        return "var(--accent-blue)";
      case "awaiting":
        return "var(--stage-awaiting)";
      case "idle":
      default:
        return "var(--accent-teal)";
    }
  };

  return (
    <div className="page-container">
      {/* Simulation Notice Strip */}
      <div className="info-banner mb-3">
        <div className="info-banner-icon">🤖</div>
        <div className="flex-between" style={{ width: "100%", alignItems: "center" }}>
          <div>
            <strong style={{ color: "var(--accent-blue)" }}>
              Software-Only Kinematics & Dispatch Simulation:{" "}
            </strong>
            This is a pure software simulation environment. Movements, workcells, and telemetry transitions are simulated without physical robot actuators.
          </div>
          <span className="badge badge-simulation">Virtual Engine</span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadState} />}
      {dispatchError && <ErrorBanner message={dispatchError} />}

      {loading ? (
        <LoadingSpinner text="Connecting to 2D workcell grid & virtual robot units…" />
      ) : (
        <div className="simulation-layout">
          {/* ── Left Column: 2D Visual Map & Legend ── */}
          <div className="map-card-wrapper">
            <div className="flex-between mb-2">
              <div>
                <h3 className="card-header-title">Virtual Workcell 2D Operations Map</h3>
                <p className="card-subtitle">
                  Click any simulated unit or destination waypoint to inspect telemetry
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setLoading(true);
                  loadState();
                }}
              >
                Refresh Grid
              </button>
            </div>

            {/* 1-6. 2D Interactive SVG Visual Map */}
            <div className="map-svg-container">
              <svg
                viewBox="0 0 800 460"
                style={{ width: "100%", height: "100%", display: "block" }}
              >
                {/* Background Grid Pattern */}
                <defs>
                  <pattern
                    id="grid-pattern"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="rgba(226, 232, 240, 0.7)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <linearGradient id="corridor-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                <rect width="800" height="460" fill="url(#grid-pattern)" />

                {/* Central Transit Corridor */}
                <rect
                  x="40"
                  y="200"
                  width="720"
                  height="60"
                  fill="url(#corridor-gradient)"
                  rx="6"
                />
                <text
                  x="400"
                  y="235"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  letterSpacing="3"
                >
                  CENTRAL TRANSIT CORRIDOR • SIMULATION PATHWAY
                </text>

                {/* 1. Virtual Workcells / Bays */}
                {VIRTUAL_WORKCELLS.map((cell) => {
                  const isDestinationForSelected =
                    selectedRobot?.destinationWorkcell?.id === cell.id;

                  return (
                    <g key={cell.id} transform={`translate(${cell.x - 70}, ${cell.y - 45})`}>
                      <rect
                        width="140"
                        height="90"
                        rx="6"
                        fill={isDestinationForSelected ? "#f0f9ff" : "#ffffff"}
                        stroke={isDestinationForSelected ? "var(--accent-blue)" : "var(--border-strong)"}
                        strokeWidth={isDestinationForSelected ? "2" : "1"}
                        strokeDasharray={isDestinationForSelected ? "4 3" : "none"}
                      />
                      {/* Code Tag */}
                      <rect x="8" y="8" width="54" height="16" rx="3" fill="#f1f5f9" />
                      <text x="35" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
                        {cell.code}
                      </text>
                      {/* Name */}
                      <text
                        x="70"
                        y="48"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {cell.name.split(":")[0]}
                      </text>
                      <text
                        x="70"
                        y="64"
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="var(--text-secondary)"
                      >
                        {cell.name.split(":")[1] || ""}
                      </text>
                    </g>
                  );
                })}

                {/* 6. Destination Waypoint Path for Selected Robot */}
                {selectedRobot?.destinationWorkcell && (
                  <g>
                    {/* Traversal Dashed Path */}
                    <line
                      x1={selectedRobot.position.x}
                      y1={selectedRobot.position.y}
                      x2={selectedRobot.destinationWorkcell.x}
                      y2={selectedRobot.destinationWorkcell.y}
                      stroke="var(--accent-blue)"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    {/* Destination Target Marker */}
                    <circle
                      cx={selectedRobot.destinationWorkcell.x}
                      cy={selectedRobot.destinationWorkcell.y}
                      r="16"
                      fill="rgba(2, 132, 199, 0.15)"
                      stroke="var(--accent-blue)"
                      strokeWidth="2"
                    />
                    <text
                      x={selectedRobot.destinationWorkcell.x}
                      y={selectedRobot.destinationWorkcell.y + 4}
                      textAnchor="middle"
                      fontSize="12"
                    >
                      🎯
                    </text>
                  </g>
                )}

                {/* 2 & 3. Simulated Robot Nodes (R1–R5) */}
                {robots.map((robot) => {
                  const isSelected = robot.id === selectedRobotId;
                  const color = getStatusColor(robot.computedStatus);

                  return (
                    <g
                      key={robot.id}
                      className={`sim-robot-node ${isSelected ? "selected" : ""}`}
                      transform={`translate(${robot.position.x}, ${robot.position.y})`}
                      onClick={() => setSelectedRobotId(robot.id)}
                    >
                      {/* Outer Focus Glow if selected */}
                      {isSelected && (
                        <circle
                          r="28"
                          fill="none"
                          stroke="var(--accent-blue)"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          opacity="0.8"
                        />
                      )}

                      {/* Status indicator pulse ring */}
                      {robot.computedStatus !== "idle" && (
                        <circle
                          r="22"
                          fill="none"
                          stroke={color}
                          strokeWidth="1.5"
                          opacity="0.5"
                        />
                      )}

                      {/* Main Node Body */}
                      <circle
                        r="18"
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth="3"
                      />

                      {/* Robot Label */}
                      <text
                        y="5"
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="11"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {robot.id}
                      </text>

                      {/* Status Pip */}
                      <circle cx="12" cy="-12" r="5" fill={color} />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* 8. Visual Map Legend */}
            <div className="simulation-legend">
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Map Legend:</span>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: "var(--accent-teal)" }} />
                <span>Idle / Standby</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: "var(--priority-high)" }} />
                <span>Dispatched (In Transit)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: "var(--accent-blue)" }} />
                <span>In Maintenance Bay</span>
              </div>
              <div className="legend-item">
                <span style={{ fontSize: "0.85rem" }}>🎯</span>
                <span>Task Destination Waypoint</span>
              </div>
              <div className="legend-item">
                <span style={{ borderBottom: "2px dashed var(--accent-blue)", width: 24, display: "inline-block" }} />
                <span>Simulated Transit Line</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Selected Robot Inspector & Dispatch Controls ── */}
          <div className="sim-inspector-card">
            {selectedRobot ? (
              <div className="card">
                <div className="flex-between mb-2">
                  <div className="flex gap-1" style={{ alignItems: "center" }}>
                    <div style={{ fontSize: "1.6rem" }}>🤖</div>
                    <div>
                      <h4 className="mono font-semibold" style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>
                        Unit {selectedRobot.id}
                      </h4>
                      <p className="text-secondary" style={{ fontSize: "0.75rem" }}>
                        {selectedRobot.name} • {selectedRobot.model}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge badge-${
                      selectedRobot.computedStatus === "maintenance"
                        ? "in_progress"
                        : selectedRobot.computedStatus === "dispatched"
                        ? "dispatched"
                        : "idle"
                    }`}
                  >
                    {selectedRobot.computedStatus}
                  </span>
                </div>

                {/* Telemetry Details */}
                <div className="robot-meta mb-3">
                  <div className="meta-row">
                    <span className="meta-label">Grid Coordinates:</span>
                    <span className="meta-val mono">
                      X: {selectedRobot.position.x}, Y: {selectedRobot.position.y}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Virtual Location:</span>
                    <span className="meta-val">{selectedRobot.location || "Bay 1 Logistics"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Simulated Battery:</span>
                    <span className="meta-val mono">{selectedRobot.battery}%</span>
                  </div>
                  <div className="battery-bar-container mt-1">
                    <div
                      className="battery-bar"
                      style={{
                        width: `${selectedRobot.battery}%`,
                        background: selectedRobot.battery > 50 ? "var(--accent-teal)" : "var(--priority-high)",
                      }}
                    />
                  </div>
                </div>

                {/* 5. Currently Assigned Task */}
                <div className="mb-3">
                  <span
                    className="card-subtitle"
                    style={{
                      display: "block",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      marginBottom: 4,
                    }}
                  >
                    Current Workload Simulation
                  </span>

                  {selectedRobot.activeTask ? (
                    <div
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.85rem",
                      }}
                    >
                      <div className="flex-between mb-1">
                        <span className="mono text-blue font-semibold" style={{ fontSize: "0.8rem" }}>
                          Task #{selectedRobot.activeTask.id}
                        </span>
                        <StageBadge stage={selectedRobot.activeTask.stage} />
                      </div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                        {selectedRobot.activeTask.title}
                      </p>
                      {selectedRobot.activeTask.destination && (
                        <p style={{ fontSize: "0.75rem", color: "var(--accent-blue)", marginBottom: 6 }}>
                          📍 Target: {selectedRobot.activeTask.destination.name}
                        </p>
                      )}

                      {/* Advance Stage Control */}
                      <button
                        className="btn btn-primary btn-sm mt-1"
                        style={{ width: "100%", justifyContent: "center" }}
                        disabled={dispatchingId === selectedRobot.activeTask.id}
                        onClick={() => handleDispatch(selectedRobot.activeTask)}
                      >
                        {dispatchingId === selectedRobot.activeTask.id
                          ? "Advancing Simulated Step…"
                          : `Simulate Stage Advance (${selectedRobot.activeTask.stage.replace(/_/g, " ")}) →`}
                      </button>
                    </div>
                  ) : selectedRobot.unapprovedTask ? (
                    <div
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--stage-draft-border)",
                        borderRadius: "6px",
                        padding: "0.75rem",
                      }}
                    >
                      <div className="flex-between mb-1">
                        <span className="mono text-muted" style={{ fontSize: "0.78rem" }}>
                          Task #{selectedRobot.unapprovedTask.id}
                        </span>
                        <span className="badge badge-draft">Draft (Unapproved)</span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                        {selectedRobot.unapprovedTask.title}
                      </p>
                      <div
                        className="p-1"
                        style={{
                          background: "#fffbeb",
                          border: "1px solid #fef08a",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          color: "#854d0e",
                          marginBottom: 6,
                        }}
                      >
                        🔒 <strong>Human Approval Gate:</strong> Cannot dispatch unapproved tasks. Review and sign on the Task Board first.
                      </div>
                      <Link to="/tasks" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                        Open Task Board to Authorize →
                      </Link>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px dashed var(--border-strong)",
                        borderRadius: "6px",
                        padding: "1rem",
                        textAlign: "center",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Standby. No active tasks assigned to this unit.
                    </div>
                  )}
                </div>

                {/* Eligible Approved Tasks for this Unit */}
                <div className="mb-3">
                  <span
                    className="card-subtitle"
                    style={{
                      display: "block",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      marginBottom: 4,
                    }}
                  >
                    Eligible Approved Tasks ({tasks.filter((t) => t.isApproved && !t.isComplete && (t.robot_id === selectedRobot.id || !t.robot_id)).length})
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {tasks
                      .filter((t) => t.isApproved && !t.isComplete && (t.robot_id === selectedRobot.id || !t.robot_id))
                      .slice(0, 3)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex-between p-1"
                          style={{
                            background: "var(--bg-base)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "4px",
                            padding: "0.45rem 0.65rem",
                            fontSize: "0.78rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <div className="flex gap-1" style={{ alignItems: "center" }}>
                              <span className="mono text-blue font-semibold">#{t.id}</span>
                              <PriorityBadge priority={t.priority} />
                            </div>
                            <div
                              style={{
                                color: "var(--text-primary)",
                                fontSize: "0.75rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.title}
                            </div>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={dispatchingId === t.id}
                            onClick={() => handleDispatch(t)}
                          >
                            Advance →
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 7. Dispatch History / Recent Activity List */}
                <div>
                  <span
                    className="card-subtitle"
                    style={{
                      display: "block",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      marginBottom: 4,
                    }}
                  >
                    Simulation Dispatch Activity Log
                  </span>
                  <div className="sim-activity-list">
                    {dispatchLog.map((log) => (
                      <div key={log.id} className="sim-activity-row">
                        <span className="mono text-muted" style={{ fontSize: "0.7rem" }}>
                          {log.time}
                        </span>
                        <span style={{ color: "var(--text-primary)", fontSize: "0.75rem" }}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="🤖"
                title="Select a robot"
                description="Click on any simulated robot on the 2D map to inspect kinematics and dispatch tasks."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
