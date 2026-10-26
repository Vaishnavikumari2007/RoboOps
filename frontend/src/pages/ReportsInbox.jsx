import { useEffect, useState } from "react";
import { listReports, submitReport, analyzeReport } from "../api";
import { LoadingSpinner, ErrorBanner, TimeAgo } from "../components/Components";

function SubmitForm({ onSubmitted }) {
  const [form, setForm] = useState({ type: "maintenance_report", submitted_by: "", raw_text: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      await submitReport(form);
      setForm({ type: "maintenance_report", submitted_by: "", raw_text: "" });
      onSubmitted();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-3">
      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>Submit New Report</h3>
      {err && <ErrorBanner message={err} />}
      <form onSubmit={submit}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select name="type" className="form-select" value={form.type} onChange={handle}>
              <option value="maintenance_report">Maintenance Report</option>
              <option value="meeting_note">Meeting Note</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              name="submitted_by" className="form-input"
              placeholder="e.g. Alice" required
              value={form.submitted_by} onChange={handle}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Report Text</label>
          <textarea
            name="raw_text" className="form-textarea"
            placeholder="Describe the issue or meeting outcome in plain text. Mention robot ID (e.g. R2), component, and symptom if applicable."
            required minLength={10}
            value={form.raw_text} onChange={handle}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}

function ReportRow({ report, onAnalyze }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const analyze = async () => {
    setAnalyzing(true); setErr(null);
    try {
      await analyzeReport(report.id);
      setDone(true);
      onAnalyze();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const ex = report.extracted;
  const hasExtracted = ex && (ex.robot_id || ex.component || ex.symptom);

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
        <td>#{report.id}</td>
        <td>
          <span className={`badge badge-${report.type === "maintenance_report" ? "high" : "low"}`}>
            {report.type === "maintenance_report" ? "Maintenance" : "Meeting Note"}
          </span>
        </td>
        <td>{report.submitted_by}</td>
        <td style={{ maxWidth: 300 }}>
          <span className="text-muted">{report.raw_text.slice(0, 80)}{report.raw_text.length > 80 ? "…" : ""}</span>
        </td>
        <td><TimeAgo iso={report.created_at} /></td>
        <td>
          {done ? (
            <span className="badge badge-complete">Analyzed</span>
          ) : (
            <button className="btn btn-primary" disabled={analyzing}
              onClick={(e) => { e.stopPropagation(); analyze(); }}>
              {analyzing ? "…" : "Analyze"}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ background: "var(--bg-surface)", padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <p className="card-title mb-1">Original Text</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {report.raw_text}
                </p>
              </div>
              <div>
                <p className="card-title mb-1">Extracted Fields</p>
                {hasExtracted ? (
                  <table style={{ fontSize: "0.78rem" }}>
                    <tbody>
                      {[["Robot ID", ex.robot_id], ["Component", ex.component], ["Symptom", ex.symptom], ["Date Mentioned", ex.date_mentioned]]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ color: "var(--text-muted)", paddingRight: 12 }}>{k}</td>
                            <td className="mono text-cyan">{v}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    No structured fields detected in this report.
                  </p>
                )}
              </div>
            </div>
            {err && <ErrorBanner message={err} />}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReportsInbox() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    listReports()
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h2>Reports Inbox</h2>
        <p>Submit and review meeting notes and maintenance reports</p>
      </div>

      <SubmitForm onSubmitted={load} />

      <div className="card">
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700 }}>All Reports</h3>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>
        {error && <ErrorBanner message={error} />}
        {loading ? <LoadingSpinner /> : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No reports yet. Use the form above to submit the first one.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Type</th><th>Submitted By</th>
                  <th>Preview</th><th>When</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <ReportRow key={r.id} report={r} onAnalyze={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
