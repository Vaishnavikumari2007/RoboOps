/**
 * AuditLog.jsx
 * ───────────────────────────────────────────────────────────────
 * Standalone Audit Log page.
 *
 * Displays every recorded application event in chronological order
 * with full context: event type, timestamp, actor, related entity,
 * and a human-readable description.
 *
 * Features:
 *   - Full-text search across reason / actor / entity fields
 *   - Event-type filter chips
 *   - Date-range quick filters (last hour, 24 h, 7 days, all time)
 *   - Pagination (50 records per page)
 *   - Summary stats bar
 *   - Honest empty state when no events exist
 *   - No fake entries; all data sourced from the /audit API
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { getAuditLog } from "../api";
import {
  LoadingSpinner,
  ErrorBanner,
  EmptyState,
  TimeAgo,
} from "../components/Components";

// ── Event configuration ──────────────────────────────────────────
const EVENT_META = {
  report_submitted: {
    icon: "📋",
    label: "Report Submitted",
    color: "var(--accent-blue)",
    bg: "var(--accent-blue-light)",
    entityRoute: "/reports",
    entityLabel: "Report",
    summary: (log) =>
      log.reason ??
      `New report ingested${log.actor ? ` by ${log.actor}` : ""}.`,
  },
  issue_created: {
    icon: "🔍",
    label: "Issue Identified",
    color: "var(--priority-high)",
    bg: "var(--priority-high-bg)",
    entityRoute: "/issues",
    entityLabel: "Issue",
    summary: (log) =>
      log.reason ??
      "Automated NLP rule engine extracted an issue from a submitted report.",
  },
  task_proposed: {
    icon: "📝",
    label: "Task Proposed",
    color: "var(--accent-indigo)",
    bg: "var(--accent-indigo-light)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) =>
      log.reason ?? "Maintenance task generated for identified issue.",
  },
  task_approved: {
    icon: "✅",
    label: "Task Approved",
    color: "var(--priority-low)",
    bg: "var(--priority-low-bg)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) =>
      log.reason ??
      `Task approved${log.actor ? ` by operator ${log.actor}` : ""}.`,
  },
  task_rejected: {
    icon: "❌",
    label: "Task Rejected",
    color: "var(--priority-critical)",
    bg: "var(--priority-critical-bg)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) =>
      log.reason ?? `Task rejected${log.actor ? ` by ${log.actor}` : ""}.`,
  },
  task_assigned: {
    icon: "👤",
    label: "Task Assigned",
    color: "var(--accent-teal)",
    bg: "var(--accent-teal-light)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) =>
      log.reason ?? `Task assigned${log.actor ? ` to ${log.actor}` : ""}.`,
  },
  task_advanced: {
    icon: "⚙️",
    label: "Stage Advanced",
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) => log.reason ?? "Task progressed to next workflow stage.",
  },
  task_completed: {
    icon: "🏁",
    label: "Task Completed",
    color: "var(--priority-low)",
    bg: "var(--priority-low-bg)",
    entityRoute: "/tasks",
    entityLabel: "Task",
    summary: (log) => log.reason ?? "Task marked as complete.",
  },
  robot_dispatched: {
    icon: "🤖",
    label: "Robot Dispatched",
    color: "var(--accent-teal)",
    bg: "var(--accent-teal-light)",
    entityRoute: "/fleet",
    entityLabel: "Robot",
    summary: (log) =>
      log.reason ?? "Simulated robot dispatched to task destination.",
  },
  status_changed: {
    icon: "🔄",
    label: "Status Changed",
    color: "var(--accent-indigo)",
    bg: "var(--accent-indigo-light)",
    entityRoute: null,
    entityLabel: "Entity",
    summary: (log) => log.reason ?? "Entity status updated.",
  },
};

function getMeta(eventType) {
  const m = EVENT_META[eventType];
  if (m) return m;
  return {
    icon: "●",
    label: (eventType ?? "event").replace(/_/g, " "),
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
    entityRoute: null,
    entityLabel: "Entity",
    summary: (log) => log.reason ?? (eventType ?? "System event recorded."),
  };
}

// ── Date-range helpers ───────────────────────────────────────────
const DATE_RANGES = [
  { key: "all", label: "All Time" },
  { key: "7d",  label: "Last 7 Days" },
  { key: "24h", label: "Last 24 h" },
  { key: "1h",  label: "Last Hour" },
];

function isWithinRange(isoString, rangeKey) {
  if (rangeKey === "all" || !isoString) return true;
  const ms = { "7d": 7 * 86400000, "24h": 86400000, "1h": 3600000 };
  const cutoff = Date.now() - (ms[rangeKey] ?? 0);
  const ts = new Date(
    isoString.endsWith("Z") ? isoString : isoString + "Z"
  ).getTime();
  return ts >= cutoff;
}

function fmtTimestamp(iso) {
  if (!iso) return "";
  try {
    return new Date(iso.endsWith("Z") ? iso : iso + "Z").toLocaleString(
      undefined,
      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    );
  } catch {
    return iso;
  }
}

// ── Stats bar ────────────────────────────────────────────────────
function AuditStats({ logs }) {
  const counts = useMemo(() => {
    const c = {};
    logs.forEach((l) => { c[l.event_type] = (c[l.event_type] ?? 0) + 1; });
    return c;
  }, [logs]);

  const topTypes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const statCards = [
    { label: "Total Events",     value: logs.length,                   color: "var(--accent-blue)" },
    { label: "Reports Ingested", value: counts.report_submitted ?? 0,  color: "var(--accent-teal)" },
    { label: "Issues Identified",value: counts.issue_created ?? 0,     color: "var(--priority-high)" },
    { label: "Tasks Approved",   value: counts.task_approved ?? 0,     color: "var(--priority-low)" },
  ];

  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
      {statCards.map((s) => (
        <div key={s.label} className="stat-card" style={{ flex: "1 1 150px" }}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value" style={{ color: s.color, fontSize: "1.65rem" }}>
            {s.value}
          </div>
        </div>
      ))}

      {topTypes.length > 0 && (
        <div className="stat-card" style={{ flex: "2 1 220px" }}>
          <div className="stat-label" style={{ marginBottom: "0.4rem" }}>
            Top Event Types
          </div>
          {topTypes.map(([type, count]) => {
            const m = getMeta(type);
            const pct = logs.length > 0
              ? Math.round((count / logs.length) * 100)
              : 0;
            return (
              <div key={type} style={{ marginBottom: "0.35rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.72rem",
                    marginBottom: "0.12rem",
                  }}
                >
                  <span style={{ color: m.color }}>
                    {m.icon}{" "}
                    {typeof m.label === "string"
                      ? m.label
                      : type.replace(/_/g, " ")}
                  </span>
                  <span className="mono">{count} ({pct}%)</span>
                </div>
                <div className="eval-progress-track">
                  <div
                    className="eval-progress-fill"
                    style={{ width: `${pct}%`, background: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single event row ─────────────────────────────────────────────
function AuditEventRow({ log }) {
  const meta = getMeta(log.event_type);
  const label =
    typeof meta.label === "string"
      ? meta.label
      : (log.event_type ?? "event").replace(/_/g, " ");
  const description =
    typeof meta.summary === "function" ? meta.summary(log) : (log.reason ?? "");

  return (
    <div className="audit-event-row">
      {/* Icon column */}
      <div className="audit-event-icon-col">
        <div
          className="audit-event-icon"
          style={{
            background: meta.bg,
            borderColor: meta.color,
            color: meta.color,
          }}
          title={label}
        >
          {meta.icon}
        </div>
      </div>

      {/* Content column */}
      <div className="audit-event-body">
        <div className="audit-event-header">
          <span
            className="audit-event-type-badge"
            style={{ background: meta.bg, color: meta.color }}
          >
            {label}
          </span>

          {log.entity_type && log.entity_id && (
            meta.entityRoute ? (
              <Link
                to={meta.entityRoute}
                className="audit-entity-chip"
                title={`View ${meta.entityLabel} #${log.entity_id}`}
              >
                {meta.entityLabel} #{log.entity_id}
              </Link>
            ) : (
              <span className="audit-entity-chip-plain">
                {log.entity_type} #{log.entity_id}
              </span>
            )
          )}

          <span className="audit-event-time">
            <TimeAgo iso={log.created_at} />
            <span
              className="mono text-muted"
              style={{ fontSize: "0.67rem", marginLeft: "0.4rem" }}
            >
              {fmtTimestamp(log.created_at)}
            </span>
          </span>
        </div>

        <p className="audit-event-description">{description}</p>

        {log.actor && (
          <div className="audit-event-actor">
            <span style={{ marginRight: "0.3rem" }}>👤</span>
            <span>{log.actor}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────
const PAGE_SIZE = 50;

function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  const withEllipsis = pages.reduce((acc, p, i, arr) => {
    if (i > 0 && arr[i - 1] !== p - 1) acc.push("…");
    acc.push(p);
    return acc;
  }, []);

  return (
    <div className="audit-pagination">
      <span className="text-muted" style={{ fontSize: "0.78rem" }}>
        Showing{" "}
        {Math.min((page - 1) * PAGE_SIZE + 1, total)}–
        {Math.min(page * PAGE_SIZE, total)} of {total} events
      </span>
      <div className="flex gap-1">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          ← Prev
        </button>
        {withEllipsis.map((p, i) =>
          p === "…" ? (
            <span key={`el-${i}`} className="text-muted" style={{ padding: "0 0.2rem" }}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────
export default function AuditLog() {
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [search, setSearch]         = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [dateRange, setDateRange]   = useState("all");
  const [page, setPage]             = useState(1);

  const refreshCount = useRef(0);
  const [trigger, setTrigger]   = useState(0);

  const reload = () => { refreshCount.current += 1; setTrigger(refreshCount.current); };

  useEffect(() => {
    let cancelled = false;
    getAuditLog()
      .then((data) => {
        if (!cancelled) {
          setAllLogs(Array.isArray(data) ? data : []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const eventTypes = useMemo(
    () => ["all", ...new Set(allLogs.map((l) => l.event_type).filter(Boolean))],
    [allLogs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allLogs.filter((log) => {
      if (eventFilter !== "all" && log.event_type !== eventFilter) return false;
      if (!isWithinRange(log.created_at, dateRange)) return false;
      if (q) {
        const hay = [
          log.event_type,
          log.actor,
          log.reason,
          log.entity_type,
          String(log.entity_id ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLogs, eventFilter, dateRange, search]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage   = Math.min(page, totalPages);
  const paginated     = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const resetFilters = () => {
    setSearch("");
    setEventFilter("all");
    setDateRange("all");
    setPage(1);
  };

  const applyAndReset = (fn) => { fn(); setPage(1); };

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {/* Integrity notice */}
      <div className="info-banner mb-3">
        <div className="info-banner-icon">🛡️</div>
        <div style={{ fontSize: "0.8rem" }}>
          <strong style={{ color: "var(--accent-teal)" }}>
            Immutable Audit Ledger —{" "}
          </strong>
          All entries are append-only and timestamped at the moment of creation.
          No record can be edited, backdated, or deleted. This log reflects every
          automated rule evaluation and human operator decision since system
          initialisation.
        </div>
      </div>

      {/* Stats bar */}
      {!loading && allLogs.length > 0 && <AuditStats logs={allLogs} />}

      {/* Search + filters toolbar */}
      <div className="card mb-3">
        <div className="audit-toolbar">
          <div className="search-bar-wrap" style={{ flex: 2, minWidth: "200px" }}>
            <span className="search-icon-affix">🔎</span>
            <input
              id="audit-log-search"
              type="text"
              className="form-input search-input"
              placeholder="Search events, actors, reasons, entity IDs…"
              value={search}
              onChange={(e) => applyAndReset(() => setSearch(e.target.value))}
            />
            {search && (
              <button
                className="search-clear-btn"
                onClick={() => applyAndReset(() => setSearch(""))}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                className={`btn btn-sm ${
                  dateRange === r.key ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => applyAndReset(() => setDateRange(r.key))}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setLoading(true); reload(); }}
            style={{ flexShrink: 0 }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Event-type chips */}
        <div className="flex gap-1 mt-2" style={{ flexWrap: "wrap" }}>
          {eventTypes.map((type) => {
            const m = type === "all" ? null : getMeta(type);
            const chipLabel =
              type === "all"
                ? `All (${allLogs.length})`
                : typeof m?.label === "string"
                ? m.label
                : type.replace(/_/g, " ");
            const chipCount =
              type === "all"
                ? null
                : filtered.filter((l) => l.event_type === type).length;

            return (
              <button
                key={type}
                className={`audit-type-chip ${
                  eventFilter === type ? "active" : ""
                }`}
                style={
                  eventFilter === type && m
                    ? {
                        borderColor: m.color,
                        background: m.bg,
                        color: m.color,
                      }
                    : {}
                }
                onClick={() => applyAndReset(() => setEventFilter(type))}
              >
                {m && <span style={{ marginRight: "0.2rem" }}>{m.icon}</span>}
                {chipLabel}
                {chipCount !== null && (
                  <span className="audit-chip-count">{chipCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner text="Loading audit ledger…" />
      ) : filtered.length === 0 ? (
        allLogs.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="No audit events recorded yet"
            description="Operational events are logged automatically as reports, issues, and tasks flow through the system. Submit a report in the Reports Inbox to begin building the audit trail."
            action={
              <Link to="/reports" className="btn btn-primary btn-sm mt-2">
                Go to Reports Inbox
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon="🔎"
            title="No events match your filters"
            description="Try broadening the search term, selecting a different event type, or changing the date range."
            action={
              <button
                className="btn btn-ghost btn-sm mt-2"
                onClick={resetFilters}
              >
                Clear all filters
              </button>
            }
          />
        )
      ) : (
        <>
          <div className="card" style={{ padding: "0 1.5rem" }}>
            {paginated.map((log, idx) => (
              <div
                key={log.id ?? `log-${idx}`}
                className={idx < paginated.length - 1 ? "audit-event-divider" : ""}
              >
                <AuditEventRow log={log} />
              </div>
            ))}
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}
