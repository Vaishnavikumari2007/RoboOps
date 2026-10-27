import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchEnrichedIssues,
  proposeMaintenanceTask,
  reanalyzeReport,
} from "../services/issueService";
import {
  PriorityBadge,
  LoadingSpinner,
  ErrorBanner,
  TimeAgo,
  EmptyState,
} from "../components/Components";

export default function IssueIntelligence() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc"); // score_desc | score_asc | date_desc | date_asc

  // Detailed Issue Panel State
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [proposingId, setProposingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const loadData = useCallback(() => {
    fetchEnrichedIssues()
      .then((data) => {
        setIssues(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Propose Maintenance Task Action
  const handleProposeTask = async (issueId) => {
    setProposingId(issueId);
    setActionError(null);
    setSuccessBanner(null);
    try {
      const task = await proposeMaintenanceTask(issueId);
      setSuccessBanner(`✓ Draft maintenance task #${task.id} successfully created from Issue #${issueId}.`);
      loadData();
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue((prev) => (prev ? { ...prev, status: "task_proposed" } : null));
      }
    } catch (err) {
      setActionError(`Failed to propose task: ${err.message}`);
    } finally {
      setProposingId(null);
    }
  };

  // Re-run Analysis Action
  const handleReanalyze = async (reportId) => {
    if (!reportId) return;
    setReanalyzingId(reportId);
    setActionError(null);
    setSuccessBanner(null);
    try {
      await reanalyzeReport(reportId);
      setSuccessBanner(`✓ Re-analysis completed successfully for Report #${reportId}.`);
      loadData();
    } catch (err) {
      setActionError(`Re-analysis failed: ${err.message}`);
    } finally {
      setReanalyzingId(null);
    }
  };

  // Filter & Search & Sort Pipeline
  const filteredAndSorted = issues
    .filter((issue) => {
      // Priority filter
      if (priorityFilter !== "all" && issue.priority !== priorityFilter) return false;

      // Status filter
      if (statusFilter !== "all" && issue.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (issue.title || "").toLowerCase().includes(q);
        const matchRobot = (issue.robot_id || "").toLowerCase().includes(q);
        const matchComponent = (issue.component || "").toLowerCase().includes(q);
        const matchSymptom = (issue.symptom || "").toLowerCase().includes(q);
        const matchReason = (issue.reason || "").toLowerCase().includes(q);
        const matchEvidence = (issue.evidenceSentences || []).some((s) =>
          s.toLowerCase().includes(q)
        );
        return (
          matchTitle ||
          matchRobot ||
          matchComponent ||
          matchSymptom ||
          matchReason ||
          matchEvidence
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return (b.priority_score || 0) - (a.priority_score || 0);
      if (sortBy === "score_asc") return (a.priority_score || 0) - (b.priority_score || 0);
      if (sortBy === "date_desc") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "date_asc") return new Date(a.created_at) - new Date(b.created_at);
      return 0;
    });

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={loadData} />}
      {actionError && <ErrorBanner message={actionError} />}
      {successBanner && (
        <div className="info-banner mb-3" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
          <div className="info-banner-icon">✅</div>
          <div>{successBanner}</div>
        </div>
      )}

      {/* Informational Guidance Banner */}
      <div className="info-banner mb-3">
        <div className="info-banner-icon">🔍</div>
        <div>
          <strong style={{ color: "var(--accent-blue)" }}>
            Deterministic Triage Engine:{" "}
          </strong>
          Issues are synthesized from raw report telemetry via keyword and pattern rules. Confirmed duplicates require identical component and symptom signatures; related issues are grouped transparently without destructive auto-merging.
        </div>
      </div>

      {/* ── 1-4. Filter, Search & Sorting Controls ── */}
      <div className="card mb-3">
        <div className="issue-toolbar">
          {/* 1. Search Bar */}
          <div className="search-bar-wrap">
            <span className="search-icon-affix">🔍</span>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search issues by robot ID, component, symptom, or evidence quote…"
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

          {/* 4. Sorting Selector */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Sort:
            </span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="score_desc">Priority Score (Highest First)</option>
              <option value="score_asc">Priority Score (Lowest First)</option>
              <option value="date_desc">Creation Date (Newest First)</option>
              <option value="date_asc">Creation Date (Oldest First)</option>
            </select>
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

        {/* 2 & 3. Priority & Status Filter Buttons */}
        <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          {/* 2. Priority Filter */}
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

          {/* 3. Status Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Status:
            </span>
            {[
              { key: "all", label: "All" },
              { key: "open", label: "Open" },
              { key: "task_proposed", label: "Task Proposed" },
              { key: "closed", label: "Closed" },
            ].map((s) => (
              <button
                key={s.key}
                className={`btn btn-sm ${statusFilter === s.key ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* ── Issues Grid ── */}
      {loading ? (
        <LoadingSpinner text="Analyzing robotics issue records & recurrence history…" />
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No issues match criteria"
          description={
            searchQuery || priorityFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search terms or relaxing priority filters."
              : "No issues have been analyzed yet. Go to the Reports Inbox to intake and analyze operational reports."
          }
          action={
            searchQuery || priorityFilter !== "all" || statusFilter !== "all" ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("all");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </button>
            ) : (
              <Link to="/reports" className="btn btn-primary btn-sm">
                Open Reports Inbox →
              </Link>
            )
          }
        />
      ) : (
        <div className="grid-cards">
          {filteredAndSorted.map((issue) => (
            <div key={issue.id} className="card issue-card flex" style={{ flexDirection: "column" }}>
              {/* Card Header: ID, Priority, Occurrences, Timestamp */}
              <div className="flex-between mb-2">
                <div className="flex gap-1" style={{ alignItems: "center", flexWrap: "wrap" }}>
                  <span className="mono text-muted" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                    Issue #{issue.id}
                  </span>
                  <PriorityBadge priority={issue.priority} />
                  {/* 7. Visible occurrence indicator */}
                  {issue.occurrenceCount > 1 && (
                    <span className="occurrence-badge" title="Recurrence detected in past 14 days">
                      ⚠️ {issue.occurrenceCount}x Recurrence
                    </span>
                  )}
                </div>
                <TimeAgo iso={issue.created_at} />
              </div>

              {/* Title & Robot Unit */}
              <div className="mb-2">
                <h4
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedIssue(issue)}
                  title="Click to view deep-dive analysis"
                >
                  {issue.title}
                </h4>
                <div className="flex gap-1 mt-1" style={{ alignItems: "center" }}>
                  <span className="badge badge-idle" style={{ fontSize: "0.7rem" }}>
                    🤖 {issue.robot_id || "Unassigned Unit"}
                  </span>
                  {issue.component && (
                    <span className="text-secondary" style={{ fontSize: "0.78rem" }}>
                      Component: <strong>{issue.component}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Score bar */}
              <div className="mb-2">
                <div className="flex-between mb-1" style={{ fontSize: "0.72rem" }}>
                  <span className="text-muted" style={{ fontWeight: 600 }}>
                    PRIORITY RISK SCORE
                  </span>
                  <span className="mono font-semibold" style={{ color: `var(--priority-${issue.priority})` }}>
                    {issue.priority_score} / 100
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, issue.priority_score))}%`,
                      background: `var(--priority-${issue.priority})`,
                    }}
                  />
                </div>
              </div>

              {/* Evidence Sentence Quote */}
              {issue.evidenceSentences.length > 0 && (
                <div className="evidence-quote-box mb-2">
                  <span className="text-muted" style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, fontStyle: "normal", marginBottom: 2 }}>
                    EXTRACTED EVIDENCE SENTENCE
                  </span>
                  &ldquo;{issue.evidenceSentences[0]}&rdquo;
                </div>
              )}

              {/* 7. Confirmed Duplicates vs Potentially Related Indicators */}
              {(issue.hasDuplicates || issue.hasRelated) && (
                <div className="mb-2 flex gap-1" style={{ flexWrap: "wrap" }}>
                  {issue.hasDuplicates && (
                    <span className="duplicate-pill-confirmed" title="Exact match on Robot, Component, and Symptom">
                      🔴 {issue.confirmedDuplicates.length} Confirmed Duplicate(s)
                    </span>
                  )}
                  {issue.hasRelated && (
                    <span className="duplicate-pill-related" title="Shares Robot or Component with different symptom">
                      🟡 {issue.potentiallyRelated.length} Potentially Related
                    </span>
                  )}
                </div>
              )}

              {/* Priority Explanation Snippet */}
              <div className="rule-reasoning-box mb-3">
                <span className="rule-box-header">Rule Engine Justification</span>
                <p className="rule-box-content">
                  {issue.reason || "Rule-based score calculated from component and symptom weights."}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-auto pt-2 flex-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                {/* 6. Link to source report */}
                <Link
                  to="/reports"
                  className="text-blue"
                  style={{ fontSize: "0.75rem", textDecoration: "none", fontWeight: 600 }}
                  title={`Source Report #${issue.report_id}`}
                >
                  Source Report #{issue.report_id} →
                </Link>

                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    Details
                  </button>
                  {/* 8. Propose Task Action */}
                  {issue.status === "open" && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={proposingId === issue.id}
                      onClick={() => handleProposeTask(issue.id)}
                    >
                      {proposingId === issue.id ? "Proposing…" : "Propose Task"}
                    </button>
                  )}
                  {issue.status === "task_proposed" && (
                    <Link to="/tasks" className="badge badge-awaiting" style={{ textDecoration: "none" }}>
                      Task Proposed →
                    </Link>
                  )}
                  {issue.status === "closed" && (
                    <span className="badge badge-complete">Closed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. Issue Details Panel / Drawer Modal ── */}
      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-between mb-2">
              <div>
                <span className="mono text-muted" style={{ fontSize: "0.75rem" }}>
                  Issue Investigation #{selectedIssue.id}
                </span>
                <h3 className="modal-title" style={{ marginTop: 2 }}>
                  {selectedIssue.title}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIssue(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="report-detail-modal-body">
              {/* Status and Risk Strip */}
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
                  <span className="text-muted">Assigned Unit: </span>
                  <span className="mono text-blue font-semibold">
                    {selectedIssue.robot_id || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Priority: </span>
                  <PriorityBadge priority={selectedIssue.priority} />
                </div>
                <div>
                  <span className="text-muted">Status: </span>
                  <span className="badge badge-idle" style={{ textTransform: "capitalize" }}>
                    {selectedIssue.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Created: </span>
                  <TimeAgo iso={selectedIssue.created_at} />
                </div>
              </div>

              {/* Complete Evidence Sentences */}
              <div>
                <span
                  className="card-subtitle"
                  style={{ display: "block", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", marginBottom: 4 }}
                >
                  Extracted Evidence Sentences (Source Report #{selectedIssue.report_id})
                </span>
                {selectedIssue.evidenceSentences.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    {selectedIssue.evidenceSentences.map((quote, idx) => (
                      <div key={idx} className="evidence-quote-box">
                        &ldquo;{quote}&rdquo;
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                    No exact keyword matches found in source report text.
                  </p>
                )}
              </div>

              {/* Rule-Based Scoring Deep-Dive */}
              <div>
                <span
                  className="card-subtitle"
                  style={{ display: "block", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", marginBottom: 4 }}
                >
                  Deterministic Priority Engine Breakdown
                </span>
                <table className="extracted-fields-table">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 180 }}>Component Weight</td>
                      <td className="font-semibold text-primary">{selectedIssue.component || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Observed Symptom</td>
                      <td className="font-semibold text-primary">{selectedIssue.symptom || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">14-Day Recurrence Count</td>
                      <td className="mono text-amber font-semibold">{selectedIssue.occurrenceCount} Occurrence(s)</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Calculated Risk Score</td>
                      <td className="mono font-semibold" style={{ color: `var(--priority-${selectedIssue.priority})` }}>
                        {selectedIssue.priority_score} / 100
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Engine Justification</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {selectedIssue.reason}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 7. Confirmed Duplicates vs Related Section */}
              <div>
                <span
                  className="card-subtitle"
                  style={{ display: "block", fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", marginBottom: 4 }}
                >
                  Similarity & Duplicate Analysis
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {/* Confirmed Duplicates */}
                  <div
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      background: selectedIssue.hasDuplicates ? "var(--priority-critical-bg)" : "var(--bg-base)",
                    }}
                  >
                    <div className="flex-between mb-1">
                      <strong style={{ fontSize: "0.8rem", color: selectedIssue.hasDuplicates ? "var(--priority-critical)" : "var(--text-primary)" }}>
                        Confirmed Duplicates (Identical Robot + Component + Symptom)
                      </strong>
                      <span className="mono" style={{ fontSize: "0.75rem" }}>
                        {selectedIssue.confirmedDuplicates.length} found
                      </span>
                    </div>
                    {selectedIssue.confirmedDuplicates.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: "0.75rem", margin: 0 }}>
                        No identical duplicate signatures detected.
                      </p>
                    ) : (
                      <div className="flex gap-1 mt-1" style={{ flexWrap: "wrap" }}>
                        {selectedIssue.confirmedDuplicates.map((dup) => (
                          <span key={dup.id} className="badge badge-critical">
                            Issue #{dup.id} ({dup.robot_id})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Potentially Related */}
                  <div
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      background: "var(--bg-base)",
                    }}
                  >
                    <div className="flex-between mb-1">
                      <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        Potentially Related (Same Robot Unit or Component)
                      </strong>
                      <span className="mono" style={{ fontSize: "0.75rem" }}>
                        {selectedIssue.potentiallyRelated.length} related
                      </span>
                    </div>
                    {selectedIssue.potentiallyRelated.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: "0.75rem", margin: 0 }}>
                        No other issues currently correlate with this hardware unit.
                      </p>
                    ) : (
                      <div className="flex gap-1 mt-1" style={{ flexWrap: "wrap" }}>
                        {selectedIssue.potentiallyRelated.map((rel) => (
                          <span key={rel.id} className="badge badge-idle">
                            Issue #{rel.id}: {rel.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              className="flex-between mt-3 pt-2"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div className="flex gap-1">
                {/* 8. Action to request analysis */}
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={reanalyzingId === selectedIssue.report_id}
                  onClick={() => handleReanalyze(selectedIssue.report_id)}
                  title="Re-run matching rules against all issues"
                >
                  {reanalyzingId === selectedIssue.report_id ? "Re-running…" : "🔄 Refresh Analysis"}
                </button>
                {selectedIssue.status === "open" && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={proposingId === selectedIssue.id}
                    onClick={() => handleProposeTask(selectedIssue.id)}
                  >
                    {proposingId === selectedIssue.id ? "Proposing…" : "Propose Maintenance Task"}
                  </button>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIssue(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
