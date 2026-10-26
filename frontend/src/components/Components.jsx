// Shared small components used across multiple pages

// ── PriorityBadge ──────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

// ── StageBadge ────────────────────────────────────────────────
export function StageBadge({ stage }) {
  const labels = {
    draft:             "Draft",
    awaiting_approval: "Awaiting Approval",
    dispatched:        "Dispatched",
    in_progress:       "In Progress",
    complete:          "Complete",
  };
  return (
    <span className={`badge badge-${stage}`}>
      {labels[stage] || stage}
    </span>
  );
}

// ── TimeAgo ───────────────────────────────────────────────────
export function TimeAgo({ iso }) {
  const d = new Date(iso + "Z");
  const diff = Math.floor((Date.now() - d) / 1000);
  let label;
  if (diff < 60)        label = `${diff}s ago`;
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400)label = `${Math.floor(diff / 3600)}h ago`;
  else                  label = d.toLocaleDateString();
  return <span className="text-muted" title={d.toLocaleString()}>{label}</span>;
}

// ── LoadingSpinner ────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
      <div className="skeleton" style={{ width: "60%", margin: "0 auto 1rem" }} />
      <div className="skeleton" style={{ width: "40%", margin: "0 auto" }} />
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────
export function ErrorBanner({ message }) {
  return (
    <div style={{
      background: "rgba(255,69,96,0.1)",
      border: "1px solid rgba(255,69,96,0.3)",
      borderRadius: "8px",
      padding: "1rem",
      color: "var(--accent-red)",
      fontSize: "0.875rem",
      marginBottom: "1rem",
    }}>
      {message}
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}>
      <div className="card" style={{ maxWidth: 400, width: "90%" }}>
        <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>{title}</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          {message}
        </p>
        <div className="flex gap-1">
          <button className="btn btn-approve" onClick={onConfirm}>Confirm</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
