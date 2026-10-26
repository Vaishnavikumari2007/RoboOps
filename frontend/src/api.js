/**
 * api.js
 * ------
 * All fetch() calls to the FastAPI backend in one place.
 * If the base URL changes, only this file needs to be updated.
 */

const BASE = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Reports ───────────────────────────────────────────────────
export const submitReport = (body) =>
  request("/reports", { method: "POST", body: JSON.stringify(body) });

export const listReports = () => request("/reports");

export const getReport = (id) => request(`/reports/${id}`);

// ── Issues ────────────────────────────────────────────────────
export const listIssues = () => request("/issues");

export const getIssue = (id) => request(`/issues/${id}`);

export const analyzeReport = (reportId) =>
  request(`/reports/${reportId}/analyze`, { method: "POST" });

export const proposeTask = (issueId) =>
  request(`/issues/${issueId}/propose-task`, { method: "POST" });

// ── Tasks ─────────────────────────────────────────────────────
export const listTasks = () => request("/tasks");

export const getTask = (id) => request(`/tasks/${id}`);

export const approveTask = (taskId, approvedBy) =>
  request(`/tasks/${taskId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });

export const advanceTask = (taskId) =>
  request(`/tasks/${taskId}/advance`, { method: "POST" });

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardSummary = () => request("/dashboard/summary");

// ── Audit ─────────────────────────────────────────────────────
export const getAuditLog = () => request("/audit");
