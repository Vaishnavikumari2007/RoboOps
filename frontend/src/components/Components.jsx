import { useState } from "react";

// ── PriorityBadge ──────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const p = (priority || "medium").toLowerCase();
  return <span className={`badge badge-${p}`}>{p}</span>;
}

// ── StageBadge ────────────────────────────────────────────────
export function StageBadge({ stage }) {
  const labels = {
    draft: "Draft",
    awaiting_approval: "Awaiting Approval",
    dispatched: "Dispatched",
    in_progress: "In Progress",
    complete: "Complete",
  };
  const s = stage || "draft";
  return (
    <span className={`badge badge-${s}`}>
      {labels[s] || s}
    </span>
  );
}

// ── TimeAgo ───────────────────────────────────────────────────
export function TimeAgo({ iso }) {
  const [mountedAt] = useState(() => Date.now());

  let label = "Just now";
  if (iso) {
    try {
      const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
      const diff = Math.floor((mountedAt - d.getTime()) / 1000);
      if (diff < 60) label = `${Math.max(1, diff)}s ago`;
      else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`;
      else if (diff < 86400) label = `${Math.floor(diff / 3600)}h ago`;
      else label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      label = "Recently";
    }
  }

  return <span className="time-ago text-muted" title={iso || ""}>{label}</span>;
}

// ── LoadingSpinner ────────────────────────────────────────────
export function LoadingSpinner({ text = "Loading operations data…" }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <div className="flex gap-1" style={{ alignItems: "center" }}>
        <span className="error-icon">⚠️</span>
        <span className="error-text">{message}</span>
      </div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon = "📭", title = "No data available", description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4 className="empty-title">{title}</h4>
      {description && <p className="empty-desc">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────
export function ConfirmModal({ title, message, children, onConfirm, onCancel, confirmText = "Confirm" }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">{title}</h3>
        {message && <p className="modal-message">{message}</p>}
        {children}
        <div className="modal-actions flex gap-1 mt-3">
          <button className="btn btn-approve" onClick={onConfirm}>
            {confirmText}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
