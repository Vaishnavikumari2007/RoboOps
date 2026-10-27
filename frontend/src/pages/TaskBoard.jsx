import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchEnrichedTasks,
  authorizeTaskApproval,
  advanceTaskStage,
} from "../services/taskService";
import {
  StageBadge,
  PriorityBadge,
  LoadingSpinner,
  ErrorBanner,
  ConfirmModal,
  TimeAgo,
  EmptyState,
} from "../components/Components";

const STAGES = [
  { key: "draft", label: "Draft Proposals", step: 1 },
  { key: "awaiting_approval", label: "Awaiting Dispatch", step: 2 },
  { key: "dispatched", label: "Dispatched to Cell", step: 3 },
  { key: "in_progress", label: "In Maintenance", step: 4 },
  { key: "complete", label: "Completed & Verified", step: 5 },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // View Mode: 'board' | 'table'
  const [viewMode, setViewMode] = useState("board");

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [robotFilter, setRobotFilter] = useState("all");

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Approval Modal State
  const [approvingTask, setApprovingTask] = useState(null);
  const [approverName, setApproverName] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState(null);

  // Rejection Dialog State
  const [rejectingTask, setRejectingTask] = useState(null);

  // Advance Task Busy State
  const [advancingId, setAdvancingId] = useState(null);

  // Load enriched tasks from data service
  const loadData = useCallback(() => {
    fetchEnrichedTasks()
      .then((data) => {
        setTasks(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Task Approval via Backend
  const handleConfirmApproval = async () => {
    if (!approverName.trim()) {
      setApprovalError("Please enter your name or authorized signatory handle.");
      return;
    }
    setIsApproving(true);
    setApprovalError(null);
    try {
      await authorizeTaskApproval(approvingTask.id, approverName.trim());
      setSuccessBanner(
        `✓ Task #${approvingTask.id} approved by ${approverName.trim()} and transitioned to Awaiting Dispatch.`
      );
      setApprovingTask(null);
      setApproverName("");
      // Refresh live task data from the backend
      loadData();
      if (selectedTask && selectedTask.id === approvingTask.id) {
        setSelectedTask(null);
      }
    } catch (err) {
      setApprovalError(err.message || "Failed to approve task.");
    } finally {
      setIsApproving(false);
    }
  };

  // Execute Stage Advance via Backend
  const handleAdvance = async (taskId) => {
    setAdvancingId(taskId);
    setSuccessBanner(null);
    try {
      await advanceTaskStage(taskId);
      setSuccessBanner(`✓ Task #${taskId} advanced to the next simulation stage.`);
      // Refresh live task data from the backend
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        // Refetch to update modal data
        fetchEnrichedTasks().then((updated) => {
          const fresh = updated.find((t) => t.id === taskId);
          if (fresh) setSelectedTask(fresh);
        });
      }
    } catch (err) {
      setError(`Failed to advance task: ${err.message}`);
    } finally {
      setAdvancingId(null);
    }
  };

  // Handle Rejection / Dismissal of Draft Task
  const handleConfirmRejection = () => {
    if (!rejectingTask) return;
    setSuccessBanner(
      `Task #${rejectingTask.id} dismissed from active workflow.`
    );
    // Remove locally from view and trigger refresh
    setTasks((prev) => prev.filter((t) => t.id !== rejectingTask.id));
    setRejectingTask(null);
    if (selectedTask && selectedTask.id === rejectingTask.id) {
      setSelectedTask(null);
    }
  };

  // Filter & Search Pipeline
  const filteredTasks = tasks.filter((task) => {
    // Stage filter
    if (stageFilter !== "all" && task.stage !== stageFilter) return false;

    // Priority filter
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

    // Robot filter
    if (robotFilter !== "all" && task.robot_id !== robotFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (task.title || "").toLowerCase().includes(q);
      const matchId = String(task.id).includes(q);
      const matchRobot = (task.robot_id || "").toLowerCase().includes(q);
      const matchApprover = (task.approved_by || "").toLowerCase().includes(q);
      const matchDesc = (task.description || "").toLowerCase().includes(q);
      return matchTitle || matchId || matchRobot || matchApprover || matchDesc;
    }

    return true;
  });

  const getStageTasks = (stageKey) =>
    filteredTasks.filter((t) => t.stage === stageKey);

  // Available unique robots for filter
  const availableRobots = [
    "all",
    ...new Set(tasks.map((t) => t.robot_id).filter(Boolean)),
  ];

  return (
    <div className="page-container">
      {/* Success Feedback Alert */}
      {successBanner && (
        <div
          className="info-banner mb-3"
          style={{
            background: "var(--priority-low-bg)",
            borderColor: "var(--priority-low-border)",
            color: "var(--priority-low)",
          }}
        >
          <div className="flex-between" style={{ width: "100%" }}>
            <span>{successBanner}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSuccessBanner(null)}
              style={{ color: "var(--priority-low)" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* ── 2 & 3. Search, Filters, and View Switcher Toolbar ── */}
      <div className="card mb-3">
        <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
          {/* Search bar */}
          <div className="search-bar-wrap">
            <span className="search-icon-affix">🔍</span>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search tasks by title, task ID, robot, or assigned approver…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* 1. View Mode Switcher */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === "board" ? "active" : ""}`}
                onClick={() => setViewMode("board")}
              >
                📋 Kanban Board
              </button>
              <button
                className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                📊 Table View
              </button>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setLoading(true);
                loadData();
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters Strip */}
        <div
          className="flex gap-2 pt-2"
          style={{ borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" }}
        >
          {/* Stage Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Stage:
            </span>
            <select
              className="sort-select"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">All Stages ({tasks.length})</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({tasks.filter((t) => t.stage === s.key).length})
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Priority:
            </span>
            {["all", "critical", "high", "medium", "low"].map((p) => (
              <button
                key={p}
                className={`btn btn-sm ${priorityFilter === p ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPriorityFilter(p)}
                style={{ textTransform: "capitalize" }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Robot Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Robot:
            </span>
            <select
              className="sort-select"
              value={robotFilter}
              onChange={(e) => setRobotFilter(e.target.value)}
            >
              {availableRobots.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "All Units" : `Robot ${r}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching maintenance tasks and live simulation stages…" />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No tasks match criteria"
          description={
            searchQuery || stageFilter !== "all" || priorityFilter !== "all" || robotFilter !== "all"
              ? "Try clearing active search filters or selecting 'All' in the filters toolbar."
              : "No maintenance tasks have been created yet. Analyze an issue in Issue Intelligence to propose tasks."
          }
          action={
            searchQuery || stageFilter !== "all" || priorityFilter !== "all" || robotFilter !== "all" ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setStageFilter("all");
                  setPriorityFilter("all");
                  setRobotFilter("all");
                }}
              >
                Reset All Filters
              </button>
            ) : (
              <Link to="/issues" className="btn btn-primary btn-sm">
                Open Issue Intelligence →
              </Link>
            )
          }
        />
      ) : viewMode === "board" ? (
        /* ── 1A. Kanban Board View ── */
        <div className="kanban-grid">
          {STAGES.map((stage) => {
            const stageTasks = getStageTasks(stage.key);
            return (
              <div key={stage.key} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="kanban-col-title">{stage.label}</span>
                  <span className="kanban-count-pill">{stageTasks.length}</span>
                </div>

                <div className="kanban-column-body">
                  {stageTasks.length === 0 ? (
                    <div className="kanban-empty-slot">
                      No tasks in this stage
                    </div>
                  ) : (
                    stageTasks.map((task) => (
                      <div
                        key={task.id}
                        className="card task-kanban-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedTask(task)}
                      >
                        {/* Header: ID, Priority, Stage */}
                        <div className="flex-between mb-1">
                          <span
                            className="mono text-muted"
                            style={{ fontSize: "0.75rem", fontWeight: 700 }}
                          >
                            Task #{task.id}
                          </span>
                          <PriorityBadge priority={task.priority} />
                        </div>

                        {/* Title */}
                        <h5
                          style={{
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            marginBottom: 4,
                          }}
                        >
                          {task.title}
                        </h5>

                        {/* Robot & Linked Issue */}
                        <div className="flex-between mb-2">
                          <span className="mono text-blue font-semibold" style={{ fontSize: "0.75rem" }}>
                            🤖 {task.robot_id || "Unassigned"}
                          </span>
                          <span className="mono text-muted" style={{ fontSize: "0.72rem" }}>
                            Issue #{task.issue_id}
                          </span>
                        </div>

                        {/* Approver / Assigned Person */}
                        <div className="mb-2" style={{ fontSize: "0.72rem" }}>
                          <span className="text-muted">Assigned/Signed: </span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            {task.approved_by || "Pending Sign-off"}
                          </strong>
                        </div>

                        {/* Due Date Indicator */}
                        {task.dueDate && (
                          <div className="mb-2">
                            <span
                              className={`due-date-pill ${
                                task.priority === "critical" ? "due-date-urgent" : ""
                              }`}
                            >
                              ⏱ Due: {task.dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        )}

                        <div className="mt-1 mb-2">
                          <TimeAgo iso={task.created_at} />
                        </div>

                        {/* 4 & 6. Task Actions */}
                        <div
                          className="task-card-actions mt-auto pt-2"
                          style={{ borderTop: "1px solid var(--border-subtle)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Approval Control: ONLY for draft tasks */}
                          {task.canApprove && (
                            <div className="flex gap-1">
                              <button
                                className="btn btn-approve btn-sm"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={() => {
                                  setApprovingTask(task);
                                  setApproverName("");
                                  setApprovalError(null);
                                }}
                              >
                                Review & Sign
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Dismiss proposed task"
                                onClick={() => setRejectingTask(task)}
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Advance Control: for active simulation stages */}
                          {task.canAdvance && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ width: "100%", justifyContent: "center" }}
                              disabled={advancingId === task.id}
                              onClick={() => handleAdvance(task.id)}
                            >
                              {advancingId === task.id ? "Advancing…" : "Advance Stage →"}
                            </button>
                          )}

                          {/* Completed Badge */}
                          {task.isComplete && (
                            <span
                              className="badge badge-complete"
                              style={{ width: "100%", textAlign: "center", display: "block" }}
                            >
                              ✓ Completed & Closed
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── 1B. Table View ── */
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Title</th>
                  <th>Robot ID</th>
                  <th>Linked Issue</th>
                  <th>Priority</th>
                  <th>Assigned Signatory</th>
                  <th>Workflow Stage</th>
                  <th>Due Date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="mono font-semibold">#{task.id}</td>
                    <td style={{ maxWidth: 260 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedTask(task)}
                        title="Click to view details"
                      >
                        {task.title}
                      </div>
                    </td>
                    <td>
                      <span className="mono text-blue font-semibold">
                        {task.robot_id || "—"}
                      </span>
                    </td>
                    <td>
                      <Link
                        to="/issues"
                        className="mono text-muted"
                        style={{ textDecoration: "none" }}
                        title="View linked issue in Intelligence"
                      >
                        Issue #{task.issue_id} →
                      </Link>
                    </td>
                    <td>
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {task.approved_by || (
                        <span className="text-muted" style={{ fontStyle: "italic" }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <StageBadge stage={task.stage} />
                    </td>
                    <td>
                      {task.dueDate ? (
                        <span
                          className={`due-date-pill ${
                            task.priority === "critical" ? "due-date-urgent" : ""
                          }`}
                        >
                          {task.dueDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <TimeAgo iso={task.created_at} />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          Details
                        </button>
                        {task.canApprove && (
                          <button
                            className="btn btn-approve btn-sm"
                            onClick={() => {
                              setApprovingTask(task);
                              setApproverName("");
                              setApprovalError(null);
                            }}
                          >
                            Sign
                          </button>
                        )}
                        {task.canAdvance && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={advancingId === task.id}
                            onClick={() => handleAdvance(task.id)}
                          >
                            {advancingId === task.id ? "…" : "Advance →"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. Task Details Modal / Drawer ── */}
      {selectedTask && (
        <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-between mb-2">
              <div>
                <span className="mono text-muted" style={{ fontSize: "0.75rem" }}>
                  Task Investigation #{selectedTask.id}
                </span>
                <h3 className="modal-title" style={{ marginTop: 2 }}>
                  {selectedTask.title}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedTask(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="report-detail-modal-body">
              {/* Stepper Pipeline */}
              <div className="stage-pipeline-stepper">
                {STAGES.map((s, idx) => {
                  const currentIdx = STAGES.findIndex(
                    (st) => st.key === selectedTask.stage
                  );
                  const isCompleted = idx < currentIdx;
                  const isActive = idx === currentIdx;

                  return (
                    <div key={s.key} className="stage-step-item">
                      <div
                        className={`stage-step-circle ${
                          isCompleted ? "completed" : isActive ? "active" : ""
                        }`}
                      >
                        {isCompleted ? "✓" : s.step}
                      </div>
                      <span className="stage-step-label">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Metadata summary strip */}
              <div
                className="flex-between p-2"
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: "6px",
                  padding: "0.6rem 0.85rem",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <span className="text-muted">Target Robot: </span>
                  <span className="mono text-blue font-semibold">
                    {selectedTask.robot_id || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Priority: </span>
                  <PriorityBadge priority={selectedTask.priority} />
                </div>
                <div>
                  <span className="text-muted">Stage: </span>
                  <StageBadge stage={selectedTask.stage} />
                </div>
                <div>
                  <span className="text-muted">Created: </span>
                  <TimeAgo iso={selectedTask.created_at} />
                </div>
              </div>

              {/* Task Description */}
              <div>
                <span
                  className="card-subtitle"
                  style={{ display: "block", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", marginBottom: 4 }}
                >
                  Task Scope & Description
                </span>
                <div className="report-full-text-box">
                  {selectedTask.description || "No detailed scope recorded."}
                </div>
              </div>

              {/* Linked Issue & Diagnostic Telemetry */}
              <div>
                <span
                  className="card-subtitle"
                  style={{ display: "block", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", marginBottom: 4 }}
                >
                  Diagnostic Telemetry & Linked Issue #{selectedTask.issue_id}
                </span>
                <table className="extracted-fields-table">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 160 }}>Component Target</td>
                      <td className="font-semibold text-primary">{selectedTask.component || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Observed Symptom</td>
                      <td className="font-semibold text-primary">{selectedTask.symptom || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Authorized Signatory</td>
                      <td className="font-semibold text-primary">
                        {selectedTask.approved_by ? (
                          <span>
                            {selectedTask.approved_by}
                            {selectedTask.approved_at && (
                              <span className="text-muted ml-2">
                                (Signed <TimeAgo iso={selectedTask.approved_at} />)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontStyle: "italic" }}>
                            Pending Human Sign-off
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Estimated Due Date</td>
                      <td className="mono font-semibold">
                        {selectedTask.dueDate
                          ? selectedTask.dueDate.toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Not scheduled"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              className="flex-between mt-3 pt-2"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div className="flex gap-1">
                {selectedTask.canApprove && (
                  <button
                    className="btn btn-approve btn-sm"
                    onClick={() => {
                      setApprovingTask(selectedTask);
                      setApproverName("");
                      setApprovalError(null);
                    }}
                  >
                    Review & Sign
                  </button>
                )}
                {selectedTask.canAdvance && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={advancingId === selectedTask.id}
                    onClick={() => handleAdvance(selectedTask.id)}
                  >
                    {advancingId === selectedTask.id ? "Advancing…" : "Advance Stage →"}
                  </button>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedTask(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 & 7. Approval Confirmation Dialog ── */}
      {approvingTask && (
        <ConfirmModal
          title="Mandatory Human Approval Gate"
          message={`Confirm authorization to dispatch maintenance task "${approvingTask.title}" for Robot ${approvingTask.robot_id || "Unassigned"}.`}
          onConfirm={handleConfirmApproval}
          onCancel={() => {
            setApprovingTask(null);
            setApprovalError(null);
          }}
          confirmText={isApproving ? "Authorizing…" : "Authorize & Sign"}
        >
          {approvalError && (
            <div className="error-banner mb-2">
              <span>⚠️ {approvalError}</span>
            </div>
          )}
          <div className="form-group mt-2 mb-0">
            <label className="form-label">
              Authorized Lead / Operator Signature *
            </label>
            <input
              className="form-input"
              placeholder="e.g. Lead Tech Alice Chen"
              value={approverName}
              onChange={(e) => {
                setApproverName(e.target.value);
                if (approvalError) setApprovalError(null);
              }}
              autoFocus
              required
            />
            <p className="text-muted mt-1" style={{ fontSize: "0.72rem" }}>
              Signature is recorded immutably in the evaluation audit ledger.
            </p>
          </div>
        </ConfirmModal>
      )}

      {/* ── Rejection Confirmation Dialog ── */}
      {rejectingTask && (
        <ConfirmModal
          title="Dismiss Proposed Task"
          message={`Are you sure you want to dismiss draft task #${rejectingTask.id} ("${rejectingTask.title}")?`}
          onConfirm={handleConfirmRejection}
          onCancel={() => setRejectingTask(null)}
          confirmText="Confirm Dismissal"
        />
      )}
    </div>
  );
}
