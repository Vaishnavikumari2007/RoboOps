import { useEffect, useState } from "react";
import { listTasks, approveTask, advanceTask } from "../api";
import { StageBadge, PriorityBadge, LoadingSpinner, ErrorBanner, ConfirmModal, TimeAgo } from "../components/Components";

const STAGES = [
  { key: "draft",             label: "Draft" },
  { key: "awaiting_approval", label: "Awaiting Approval" },
  { key: "dispatched",        label: "Dispatched" },
  { key: "in_progress",       label: "In Progress" },
  { key: "complete",          label: "Complete" },
];

const ROBOTS = ["R1", "R2", "R3", "R4", "R5"];

function TaskCard({ task, onUpdate }) {
  const [approver, setApprover] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleApprove = async () => {
    if (!approver.trim()) return;
    setBusy(true); setErr(null);
    try {
      await approveTask(task.id, approver.trim());
      onUpdate();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); setShowModal(false); }
  };

  const handleAdvance = async () => {
    setBusy(true); setErr(null);
    try {
      await advanceTask(task.id);
      onUpdate();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      {showModal && (
        <ConfirmModal
          title="Approve Task"
          message={`You are approving: "${task.title}". Enter your name below to confirm.`}
          onConfirm={handleApprove}
          onCancel={() => setShowModal(false)}
        >
          <input
            className="form-input mt-2"
            placeholder="Your name"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
          />
        </ConfirmModal>
      )}

      <div className="card" style={{ fontSize: "0.82rem" }}>
        <div className="flex-between mb-1">
          <span className="mono text-muted">Task #{task.id}</span>
          <StageBadge stage={task.stage} />
        </div>
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{task.title}</p>
        {task.robot_id && (
          <p style={{ color: "var(--accent-cyan)" }}>🤖 {task.robot_id}</p>
        )}
        {task.approved_by && (
          <p className="text-muted mt-1">Approved by {task.approved_by}</p>
        )}
        <div className="mt-1 text-muted"><TimeAgo iso={task.created_at} /></div>

        {err && <ErrorBanner message={err} />}

        <div className="flex gap-1 mt-2">
          {task.stage === "draft" && (
            <>
              <input
                className="form-input"
                placeholder="Your name to approve"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-approve"
                disabled={busy || !approver.trim()}
                onClick={handleApprove}
              >
                {busy ? "…" : "Approve"}
              </button>
            </>
          )}
          {["awaiting_approval", "dispatched", "in_progress"].includes(task.stage) && (
            <button className="btn btn-primary" disabled={busy} onClick={handleAdvance}>
              {busy ? "…" : "Advance →"}
            </button>
          )}
          {task.stage === "complete" && (
            <span className="badge badge-complete">Done</span>
          )}
        </div>
      </div>
    </>
  );
}

function RobotFleetPanel({ tasks }) {
  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>Robot Fleet Assignment</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.75rem" }}>
        {ROBOTS.map((id) => {
          const active = tasks.filter((t) => t.robot_id === id && t.stage !== "complete" && t.stage !== "draft");
          return (
            <div key={id} style={{
              background: "var(--bg-surface)",
              border: `1px solid ${active.length ? "rgba(0,229,255,0.3)" : "var(--border-subtle)"}`,
              borderRadius: 8, padding: "0.75rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.5rem" }}>🤖</div>
              <div className="mono text-cyan" style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>{id}</div>
              <div style={{ fontSize: "0.65rem", color: active.length ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                {active.length ? `${active.length} task(s)` : "Idle"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    listTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const byStage = (stage) => tasks.filter((t) => t.stage === stage);

  return (
    <div className="page-fade">
      <div className="page-header flex-between">
        <div>
          <h2>Task Board & Robot Fleet</h2>
          <p>Manage maintenance tasks through the simulated workflow</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingSpinner /> : (
        <>
          <RobotFleetPanel tasks={tasks} />

          {/* Kanban board */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", overflowX: "auto" }}>
            {STAGES.map((stage) => (
              <div key={stage.key}>
                <div style={{
                  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--text-muted)",
                  marginBottom: "0.75rem", paddingBottom: "0.5rem",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  {stage.label}
                  <span style={{
                    marginLeft: 6, background: "var(--bg-elevated)",
                    color: "var(--text-secondary)", borderRadius: "50%",
                    width: 18, height: 18, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", fontSize: "0.65rem",
                  }}>
                    {byStage(stage.key).length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {byStage(stage.key).length === 0 ? (
                    <div style={{
                      border: "1px dashed var(--border-subtle)",
                      borderRadius: 8, padding: "1rem",
                      textAlign: "center", color: "var(--text-muted)",
                      fontSize: "0.75rem",
                    }}>
                      Empty
                    </div>
                  ) : (
                    byStage(stage.key).map((t) => (
                      <TaskCard key={t.id} task={t} onUpdate={load} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
