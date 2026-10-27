import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchReportsWithStatus,
  createNewReport,
  triggerReportAnalysis,
} from "../services/reportService";
import {
  PriorityBadge,
  LoadingSpinner,
  ErrorBanner,
  TimeAgo,
  EmptyState,
} from "../components/Components";

const ROBOT_SUGGESTIONS = ["R1", "R2", "R3", "R4", "R5"];

export default function ReportsInbox() {
  // Form State
  const [form, setForm] = useState({
    title: "",
    type: "maintenance_report",
    submittedBy: "",
    robotId: "",
    rawText: "",
  });
  const [validationError, setValidationError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);

  // Reports List State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Read Full Content Modal State
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);

  const loadReports = useCallback(() => {
    fetchReportsWithStatus()
      .then((data) => {
        setReports(data);
        setListError(null);
      })
      .catch((err) => setListError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationError) setValidationError(null);
  };

  // Submit Handler with rigorous validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setValidationError(null);

    // Validation
    if (!form.submittedBy.trim()) {
      setValidationError("Please enter your name or operator handle.");
      return;
    }
    if (!form.title.trim()) {
      setValidationError("Please enter a descriptive report title.");
      return;
    }
    if (form.rawText.trim().length < 10) {
      setValidationError("Report text must contain at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createNewReport({
        title: form.title,
        type: form.type,
        submittedBy: form.submittedBy,
        robotId: form.robotId,
        rawText: form.rawText,
      });

      // Show instant result confirmation view
      setLastSubmissionResult(created);

      // Reset form fields
      setForm({
        title: "",
        type: "maintenance_report",
        submittedBy: "",
        robotId: "",
        rawText: "",
      });

      // Reload list
      loadReports();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit report. Please check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Immediate Analysis from Result View or Table
  const handleAnalyze = async (reportId) => {
    setAnalyzingId(reportId);
    setListError(null);
    try {
      await triggerReportAnalysis(reportId);
      loadReports();
      if (activeReportModal && activeReportModal.id === reportId) {
        setActiveReportModal((prev) => (prev ? { ...prev, hasIssue: true } : null));
      }
      if (lastSubmissionResult && lastSubmissionResult.id === reportId) {
        setLastSubmissionResult((prev) => (prev ? { ...prev, analyzed: true } : null));
      }
    } catch (err) {
      setListError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Filter & Search Logic
  const filteredReports = reports.filter((r) => {
    // Type Filter
    if (typeFilter !== "all" && r.type !== typeFilter) return false;

    // Status Filter
    if (statusFilter === "analyzed" && !r.hasIssue) return false;
    if (statusFilter === "pending" && r.hasIssue) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (r.title || "").toLowerCase().includes(q);
      const matchBody = (r.cleanBody || "").toLowerCase().includes(q);
      const matchSubmitter = (r.submitted_by || "").toLowerCase().includes(q);
      const matchRobot = (r.robot_id || "").toLowerCase().includes(q);
      const matchComponent = (r.component || "").toLowerCase().includes(q);
      const matchSymptom = (r.symptom || "").toLowerCase().includes(q);
      return (
        matchTitle ||
        matchBody ||
        matchSubmitter ||
        matchRobot ||
        matchComponent ||
        matchSymptom
      );
    }

    return true;
  });

  return (
    <div className="page-container">
      {/* ── 5. Post-Submission Confirmation / Result View ── */}
      {lastSubmissionResult && (
        <div className="submission-result-card">
          <div className="flex-between mb-2">
            <div className="flex gap-1" style={{ alignItems: "center" }}>
              <span style={{ fontSize: "1.2rem" }}>✅</span>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--priority-low)" }}>
                  Report #{lastSubmissionResult.id} Ingested & Extracted Successfully
                </h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Fields have been parsed using pattern matching and keyword heuristics.
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setLastSubmissionResult(null)}
              aria-label="Dismiss confirmation"
            >
              ✕ Dismiss
            </button>
          </div>

          {/* Extracted preview tags */}
          <div className="result-badge-strip mb-3">
            <span className="extracted-param-chip">
              <strong>Robot ID:</strong>{" "}
              <span className="mono text-blue">
                {lastSubmissionResult.extracted?.robot_id || "None detected"}
              </span>
            </span>
            <span className="extracted-param-chip">
              <strong>Component:</strong>{" "}
              <span className="font-semibold text-primary">
                {lastSubmissionResult.extracted?.component || "None detected"}
              </span>
            </span>
            <span className="extracted-param-chip">
              <strong>Symptom:</strong>{" "}
              <span className="font-semibold text-primary">
                {lastSubmissionResult.extracted?.symptom || "None detected"}
              </span>
            </span>
            <span className="extracted-param-chip">
              <strong>Date Mentioned:</strong>{" "}
              <span>{lastSubmissionResult.extracted?.date_mentioned || "Not specified"}</span>
            </span>
          </div>

          <div className="flex gap-1">
            {!lastSubmissionResult.analyzed ? (
              <button
                className="btn btn-primary btn-sm"
                disabled={analyzingId === lastSubmissionResult.id}
                onClick={() => handleAnalyze(lastSubmissionResult.id)}
              >
                {analyzingId === lastSubmissionResult.id
                  ? "Deriving Issue…"
                  : "⚡ Analyze into Issue Now"}
              </button>
            ) : (
              <Link to="/issues" className="btn btn-ghost btn-sm">
                View Created Issue in Intelligence →
              </Link>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setLastSubmissionResult(null)}
            >
              Done & View All
            </button>
          </div>
        </div>
      )}

      {/* ── 1-5. Intake Submission Form ── */}
      <div className="card mb-4">
        <div className="flex-between mb-2">
          <div>
            <h3 className="card-header-title">Intake New Operational Report</h3>
            <p className="card-subtitle">
              Paste meeting notes, shift standup logs, or technician inspection reports for automated extraction
            </p>
          </div>
        </div>

        {submitError && <ErrorBanner message={submitError} />}
        {validationError && (
          <div className="error-banner mb-2">
            <span>⚠️ {validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2 mb-2">
            {/* 2. Report Title */}
            <div className="form-group mb-0">
              <label className="form-label">Report Title *</label>
              <input
                name="title"
                className="form-input"
                placeholder="e.g. Robot R2 Wheel Motor Grinding Noise"
                value={form.title}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* 3. Source Type */}
            <div className="form-group mb-0">
              <label className="form-label">Report Category *</label>
              <select
                name="type"
                className="form-select"
                value={form.type}
                onChange={handleInputChange}
              >
                <option value="maintenance_report">
                  Maintenance Report (Direct Inspection)
                </option>
                <option value="meeting_note">Meeting Note (Shift Sync / Standup)</option>
              </select>
            </div>
          </div>

          <div className="grid-2 mb-2">
            {/* Operator Handle */}
            <div className="form-group mb-0">
              <label className="form-label">Submitted By (Operator / Tech) *</label>
              <input
                name="submittedBy"
                className="form-input"
                placeholder="e.g. Alice Chen (Lead Engineer)"
                value={form.submittedBy}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* 4. Robot ID When Known */}
            <div className="form-group mb-0">
              <div className="flex-between mb-1">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Robot Unit ID (Optional)
                </label>
                <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Quick chips:
                </span>
              </div>
              <div className="flex gap-1" style={{ alignItems: "center" }}>
                <input
                  name="robotId"
                  className="form-input mono"
                  placeholder="e.g. R2 or RB-04"
                  value={form.robotId}
                  onChange={handleInputChange}
                  style={{ maxWidth: 160 }}
                />
                <div className="chip-group">
                  {ROBOT_SUGGESTIONS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`robot-chip ${form.robotId === id ? "selected" : ""}`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          robotId: prev.robotId === id ? "" : id,
                        }))
                      }
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 1. Paste meeting transcript or maintenance report */}
          <div className="form-group">
            <div className="flex-between mb-1">
              <label className="form-label" style={{ marginBottom: 0 }}>
                Free-Text Transcript or Maintenance Description *
              </label>
              <span className="text-muted mono" style={{ fontSize: "0.72rem" }}>
                {form.rawText.length} characters (min 10)
              </span>
            </div>
            <textarea
              name="rawText"
              className="form-textarea"
              placeholder="Paste or write the report. E.g. During afternoon testing, Robot R2 left wheel motor was making a noticeable grinding noise since Tuesday. Needs immediate inspection and encoder calibration."
              value={form.rawText}
              onChange={handleInputChange}
              required
              rows={4}
            />
          </div>

          <div className="flex-between">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting & Extracting…" : "Submit & Ingest Report"}
            </button>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Raw text is stored immutably in SQLite.
            </span>
          </div>
        </form>
      </div>

      {/* ── 6-8. Reports List & Filtering ── */}
      <div className="card">
        <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 className="card-header-title">Inbox Reports Repository</h3>
            <p className="card-subtitle">
              Browse submitted incident logs, search transcripts, and inspect extracted telemetry
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setLoading(true);
              loadReports();
            }}
          >
            Refresh List
          </button>
        </div>

        {/* 7 & 8. Search & Filters Toolbar */}
        <div className="flex gap-2 mb-3" style={{ flexWrap: "wrap", alignItems: "center" }}>
          {/* 8. Search Input */}
          <div className="search-bar-wrap">
            <span className="search-icon-affix">🔍</span>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search reports by title, transcript text, robot ID, or submitter…"
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

          {/* 7. Category Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Category:
            </span>
            {[
              { key: "all", label: "All" },
              { key: "maintenance_report", label: "Maintenance" },
              { key: "meeting_note", label: "Meeting Notes" },
            ].map((f) => (
              <button
                key={f.key}
                className={`btn btn-sm ${typeFilter === f.key ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTypeFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Status:
            </span>
            {[
              { key: "all", label: "All" },
              { key: "analyzed", label: "Analyzed" },
              { key: "pending", label: "Pending" },
            ].map((f) => (
              <button
                key={f.key}
                className={`btn btn-sm ${statusFilter === f.key ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {listError && <ErrorBanner message={listError} onRetry={loadReports} />}

        {loading ? (
          <LoadingSpinner text="Fetching submitted reports from database…" />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon="📭"
            title={
              searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "No reports match your filters"
                : "No reports in the inbox yet"
            }
            description={
              searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try clearing your search terms or selecting 'All' in the category filters."
                : "Use the intake form above to submit your first maintenance report or meeting note."
            }
            action={
              searchQuery || typeFilter !== "all" || statusFilter !== "all" ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear All Filters
                </button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Report Title & Preview</th>
                  <th>Category</th>
                  <th>Robot ID</th>
                  <th>Submitted By</th>
                  <th>Status & Priority</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="mono font-semibold" style={{ width: 60 }}>
                      #{report.id}
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                        onClick={() => setActiveReportModal(report)}
                        title="Click to read full content"
                      >
                        {report.title}
                      </div>
                      <div
                        className="text-secondary"
                        style={{
                          fontSize: "0.75rem",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {report.cleanBody}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          report.type === "maintenance_report" ? "high" : "low"
                        }`}
                      >
                        {report.type === "maintenance_report"
                          ? "Maintenance"
                          : "Meeting Note"}
                      </span>
                    </td>
                    <td>
                      {report.extracted?.robot_id ? (
                        <span className="mono text-blue font-semibold">
                          {report.extracted.robot_id}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {report.submitted_by}
                    </td>
                    <td>
                      {report.hasIssue ? (
                        <div className="flex gap-1" style={{ alignItems: "center" }}>
                          <span className="badge badge-complete">Analyzed</span>
                          {report.issuePriority && (
                            <PriorityBadge priority={report.issuePriority} />
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-draft">Pending Triage</span>
                      )}
                    </td>
                    <td>
                      <TimeAgo iso={report.created_at} />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {/* 9. Open and read complete content */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveReportModal(report)}
                          title="Read complete raw text"
                        >
                          Read Full
                        </button>
                        {!report.hasIssue && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={analyzingId === report.id}
                            onClick={() => handleAnalyze(report.id)}
                            title="Derive issue record and calculate priority score"
                          >
                            {analyzingId === report.id ? "Analyzing…" : "Analyze"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 9. Read Complete Content Modal ── */}
      {activeReportModal && (
        <div className="modal-backdrop" onClick={() => setActiveReportModal(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-between mb-2">
              <div>
                <span className="mono text-muted" style={{ fontSize: "0.75rem" }}>
                  Report #{activeReportModal.id}
                </span>
                <h3 className="modal-title" style={{ marginTop: 2 }}>
                  {activeReportModal.title}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveReportModal(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="report-detail-modal-body">
              {/* Metadata strip */}
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
                  <span className="text-muted">Category: </span>
                  <span
                    className={`badge badge-${
                      activeReportModal.type === "maintenance_report" ? "high" : "low"
                    }`}
                  >
                    {activeReportModal.type === "maintenance_report"
                      ? "Maintenance Report"
                      : "Meeting Note"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Submitted By: </span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {activeReportModal.submitted_by}
                  </strong>
                </div>
                <div>
                  <span className="text-muted">Created: </span>
                  <TimeAgo iso={activeReportModal.created_at} />
                </div>
              </div>

              {/* Complete Raw Text */}
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
                  Complete Submitted Text (Immutable)
                </span>
                <div className="report-full-text-box">
                  {activeReportModal.cleanBody || activeReportModal.raw_text}
                </div>
              </div>

              {/* Extracted Fields Card */}
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
                  Extracted Structured Fields
                </span>
                <table className="extracted-fields-table">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 140 }}>
                        Target Robot ID
                      </td>
                      <td className="mono text-blue font-semibold">
                        {activeReportModal.extracted?.robot_id || "None detected"}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Component</td>
                      <td className="font-semibold text-primary">
                        {activeReportModal.extracted?.component || "None detected"}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Symptom</td>
                      <td className="font-semibold text-primary">
                        {activeReportModal.extracted?.symptom || "None detected"}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Mentioned Date</td>
                      <td>
                        {activeReportModal.extracted?.date_mentioned || "Not specified"}
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
              {activeReportModal.hasIssue ? (
                <div className="flex gap-1" style={{ alignItems: "center" }}>
                  <span className="badge badge-complete">Issue Created</span>
                  <Link
                    to="/issues"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveReportModal(null)}
                  >
                    View in Issue Intelligence →
                  </Link>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={analyzingId === activeReportModal.id}
                  onClick={() => handleAnalyze(activeReportModal.id)}
                >
                  {analyzingId === activeReportModal.id
                    ? "Deriving Issue…"
                    : "⚡ Analyze into Issue"}
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveReportModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
