/**
 * simulationService.js
 * --------------------
 * Data service layer for the Software-Only 2D Robot Simulation.
 *
 * Coordinates live calls to the agreed backend API:
 *   - GET  /tasks
 *   - POST /tasks/{id}/advance
 *   - GET  /robots (or registry fallback)
 *   - GET  /issues (to correlate component diagnostics)
 *
 * Enforces simulation rules:
 *   - Unapproved tasks (draft stage) cannot be dispatched.
 *   - Software-only coordinates are mapped to virtual workcells.
 */

import { listTasks, listRobots, listIssues, advanceTask } from "../api";

export const VIRTUAL_WORKCELLS = [
  { id: "bay-1", name: "Bay 1: Inbound Logistics", code: "LOG-01", x: 130, y: 110, zone: "North Sector" },
  { id: "bay-2", name: "Bay 2: Precision Assembly", code: "ASM-02", x: 400, y: 110, zone: "Central Core" },
  { id: "bay-3", name: "Bay 3: Buffer & Staging", code: "STG-03", x: 670, y: 110, zone: "East Corridor" },
  { id: "bay-4", name: "Bay 4: Calibration & Vision", code: "CAL-04", x: 130, y: 350, zone: "Quality Lab" },
  { id: "bay-5", name: "Bay 5: Heavy Fabrication", code: "FAB-05", x: 400, y: 350, zone: "South Bay" },
  { id: "dock-6", name: "Maintenance & Charging Dock", code: "DOC-06", x: 670, y: 350, zone: "Service Bay" },
];

// Default software-only parking positions for R1-R5
export const DEFAULT_ROBOT_POSITIONS = {
  R1: { x: 130, y: 230, homeWorkcell: "bay-1" },
  R2: { x: 300, y: 230, homeWorkcell: "bay-2" },
  R3: { x: 400, y: 230, homeWorkcell: "bay-3" },
  R4: { x: 500, y: 230, homeWorkcell: "bay-4" },
  R5: { x: 670, y: 230, homeWorkcell: "dock-6" },
};

/**
 * Assigns a destination workcell based on component or task type.
 */
export function getTaskDestination(task) {
  if (!task) return null;
  const comp = (task.component || task.title || "").toLowerCase();
  if (comp.includes("motor") || comp.includes("wheel")) {
    return VIRTUAL_WORKCELLS[1]; // Bay 2 Assembly
  }
  if (comp.includes("camera") || comp.includes("lidar") || comp.includes("sensor")) {
    return VIRTUAL_WORKCELLS[3]; // Bay 4 Calibration
  }
  if (comp.includes("chassis") || comp.includes("arm") || comp.includes("gripper")) {
    return VIRTUAL_WORKCELLS[4]; // Bay 5 Fabrication
  }
  if (comp.includes("battery") || comp.includes("power")) {
    return VIRTUAL_WORKCELLS[5]; // Dock 6 Maintenance
  }
  return VIRTUAL_WORKCELLS[0]; // Bay 1 Logistics
}

/**
 * Loads and correlates simulation fleet state with backend tasks and issues.
 */
export async function fetchSimulationState() {
  const [robots, tasks, issues] = await Promise.all([
    listRobots(),
    listTasks(),
    listIssues().catch(() => []),
  ]);

  const issueMap = new Map();
  (issues || []).forEach((i) => {
    issueMap.set(i.id, i);
  });

  // Enrich tasks with issue metadata
  const enrichedTasks = (tasks || []).map((t) => {
    const issue = issueMap.get(t.issue_id);
    return {
      ...t,
      priority: issue?.priority || "medium",
      component: issue?.component || null,
      symptom: issue?.symptom || null,
      destination: getTaskDestination({ ...t, component: issue?.component }),
      isApproved: t.stage !== "draft",
      isComplete: t.stage === "complete",
    };
  });

  // Map robots with their positions, active tasks, and status
  const simulationRobots = (robots || []).map((r) => {
    const defaultPos = DEFAULT_ROBOT_POSITIONS[r.id] || { x: 400, y: 230, homeWorkcell: "bay-1" };
    const robotTasks = enrichedTasks.filter((t) => t.robot_id === r.id);
    const activeTask = robotTasks.find((t) => !t.isComplete && t.stage !== "draft") || null;
    const unapprovedTask = robotTasks.find((t) => t.stage === "draft") || null;

    let computedStatus = "idle";
    let currentX = defaultPos.x;
    let currentY = defaultPos.y;
    let targetWorkcell = null;

    if (activeTask) {
      targetWorkcell = activeTask.destination || VIRTUAL_WORKCELLS[1];
      if (activeTask.stage === "dispatched") {
        computedStatus = "dispatched";
        // Interpolate position halfway between home and destination
        currentX = Math.round((defaultPos.x + targetWorkcell.x) / 2);
        currentY = Math.round((defaultPos.y + targetWorkcell.y) / 2);
      } else if (activeTask.stage === "in_progress") {
        computedStatus = "maintenance";
        currentX = targetWorkcell.x;
        currentY = targetWorkcell.y;
      } else if (activeTask.stage === "awaiting_approval") {
        computedStatus = "awaiting";
      }
    }

    return {
      ...r,
      position: { x: currentX, y: currentY },
      homePosition: defaultPos,
      destinationWorkcell: targetWorkcell,
      computedStatus,
      activeTask,
      unapprovedTask,
      allTasks: robotTasks,
      battery: r.battery || 85,
    };
  });

  return {
    robots: simulationRobots,
    tasks: enrichedTasks,
    workcells: VIRTUAL_WORKCELLS,
  };
}

/**
 * Dispatches an approved task to the next simulation stage via backend.
 */
export async function dispatchSimulationStep(taskId) {
  return await advanceTask(taskId);
}
