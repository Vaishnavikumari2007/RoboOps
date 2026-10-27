/**
 * api.js
 * ------
 * Centralized API client for the RoboOps FastAPI backend.
 * Base URL is configurable via VITE_API_URL environment variable.
 */

const BASE = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Standard fleet registry used when the backend has not yet implemented
 * the /robots endpoints (per API contract section 4.6).
 */
const DEFAULT_FLEET = [
  { id: "R1", name: "RoboCourier Alpha", model: "TurtleBot 4", status: "idle", battery_level: 94, battery: 94, location: "Bay 1 - Logistics", active_task_id: null, tasks: [] },
  { id: "R2", name: "RoboArm Beta", model: "UR5e Workcell", status: "maintenance", battery_level: 78, battery: 78, location: "Bay 2 - Assembly", active_task_id: 1, tasks: ["Inspect left wheel motor"] },
  { id: "R3", name: "RoboLift Gamma", model: "OTTO 100", status: "idle", battery_level: 89, battery: 89, location: "Bay 3 - Staging", active_task_id: null, tasks: [] },
  { id: "R4", name: "RoboScan Delta", model: "Spot Quadruped", status: "idle", battery_level: 92, battery: 92, location: "Bay 4 - Inspection", active_task_id: null, tasks: [] },
  { id: "R5", name: "RoboWelder Epsilon", model: "KUKA KR CYBERTECH", status: "idle", battery_level: 85, battery: 85, location: "Bay 5 - Fabrication", active_task_id: null, tasks: [] },
];

/**
 * Format error details returned from FastAPI (e.g. 422 validation lists, 409 conflicts)
 */
function formatErrorMessage(detail, statusText, status) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = item.loc && Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
        const msg = item.msg || JSON.stringify(item);
        return field && field !== "body" ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return statusText || `Request failed with status ${status}`;
}

/**
 * Core centralized request handler with consistent error handling
 */
async function request(path, options = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}${cleanPath}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    const err = new Error(
      `Unable to connect to RoboOps backend at ${BASE}. Please verify that the FastAPI server is running.`
    );
    err.isNetworkError = true;
    err.originalError = networkError;
    throw err;
  }

  if (!res.ok) {
    let errPayload = null;
    try {
      errPayload = await res.json();
    } catch {
      errPayload = null;
    }

    const message = formatErrorMessage(errPayload?.detail, res.statusText, res.status);
    const error = new Error(message);
    error.status = res.status;
    error.payload = errPayload;
    throw error;
  }

  return res.json();
}

// ── Reports Domain ─────────────────────────────────────────────
export const submitReport = (body) =>
  request("/reports", { method: "POST", body: JSON.stringify(body) });

export const listReports = () => request("/reports");

export const getReport = (id) => request(`/reports/${id}`);

// ── Issue Intelligence Domain ─────────────────────────────────
export const listIssues = () => request("/issues");

export const getIssue = (id) => request(`/issues/${id}`);

export const analyzeReport = (reportId) =>
  request(`/reports/${reportId}/analyze`, { method: "POST" });

export const proposeTask = (issueId) =>
  request(`/issues/${issueId}/propose-task`, { method: "POST" });

// ── Task Board & Simulation Domain ────────────────────────────
export const listTasks = () => request("/tasks");

export const getTask = (id) => request(`/tasks/${id}`);

export const approveTask = (taskId, approvedBy) =>
  request(`/tasks/${taskId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });

export const advanceTask = (taskId) =>
  request(`/tasks/${taskId}/advance`, { method: "POST" });

// ── Overview Dashboard Domain ─────────────────────────────────
export const getDashboardSummary = () => request("/dashboard/summary");

// ── Evaluation & Audit Domain ─────────────────────────────────
export const getAuditLog = () => request("/audit");

// ── Health & Robot Fleet Domain ───────────────────────────────
export const checkHealth = () => request("/health");

export const listRobots = async () => {
  try {
    return await request("/robots");
  } catch {
    // Graceful fallback to agreed fleet registry when backend hasn't mounted /robots
    return DEFAULT_FLEET;
  }
};

export const getRobot = async (robotId) => {
  try {
    return await request(`/robots/${robotId}`);
  } catch {
    const found = DEFAULT_FLEET.find((r) => r.id === robotId);
    if (found) return found;
    throw new Error(`Robot ${robotId} not found.`);
  }
};
export { BASE };

