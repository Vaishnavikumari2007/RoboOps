/**
 * taskService.js
 * --------------
 * Data-service layer for the RoboOps Task Board.
 *
 * Coordinates live calls:
 *   - GET  /tasks
 *   - GET  /issues (to correlate linked issue priority, symptom, component)
 *   - POST /tasks/{id}/approve
 *   - POST /tasks/{id}/advance
 */

import { listTasks, listIssues, approveTask, advanceTask } from "../api";

/**
 * Calculates an estimated due date based on priority.
 */
export function calculateDueDate(createdAtIso, priority = "medium") {
  if (!createdAtIso) return null;
  const d = new Date(createdAtIso.endsWith("Z") ? createdAtIso : createdAtIso + "Z");
  const p = (priority || "medium").toLowerCase();
  
  const hoursMap = {
    critical: 24,
    high: 48,
    medium: 120, // 5 days
    low: 336,    // 14 days
  };

  const addHours = hoursMap[p] || 120;
  return new Date(d.getTime() + addHours * 3600 * 1000);
}

/**
 * Loads all tasks enriched with linked issue priority, component, symptom,
 * and calculated due dates.
 */
export async function fetchEnrichedTasks() {
  const [tasks, issues] = await Promise.all([
    listTasks(),
    listIssues().catch(() => []),
  ]);

  const issueMap = new Map();
  (issues || []).forEach((i) => {
    issueMap.set(i.id, i);
  });

  return (tasks || []).map((task) => {
    const linkedIssue = issueMap.get(task.issue_id) || null;
    const priority = linkedIssue?.priority || "medium";
    const dueDate = calculateDueDate(task.created_at, priority);

    return {
      ...task,
      linkedIssue,
      priority,
      priorityScore: linkedIssue?.priority_score || 50,
      component: linkedIssue?.component || null,
      symptom: linkedIssue?.symptom || null,
      dueDate,
      canApprove: task.stage === "draft",
      canAdvance: ["awaiting_approval", "dispatched", "in_progress"].includes(task.stage),
      isComplete: task.stage === "complete",
    };
  });
}

/**
 * Approves a task with the authorized signatory name.
 */
export async function authorizeTaskApproval(taskId, approvedBy) {
  if (!approvedBy || !approvedBy.trim()) {
    throw new Error("Approver name or signature is required.");
  }
  return await approveTask(taskId, approvedBy.trim());
}

/**
 * Advances a task to its next simulation workflow stage.
 */
export async function advanceTaskStage(taskId) {
  return await advanceTask(taskId);
}
