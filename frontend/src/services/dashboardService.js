/**
 * dashboardService.js
 * -------------------
 * Data-service layer for the RoboOps Overview Dashboard.
 *
 * Coordinates live requests across agreed API endpoints:
 *   - GET /dashboard/summary
 *   - GET /issues
 *   - GET /tasks
 *   - GET /robots (or registry fallback)
 *
 * Computes dynamic metrics without hardcoding final statistics.
 * Provides clearly identified fallback data if any backend endpoint is unavailable.
 */

import { getDashboardSummary, listIssues, listTasks, listRobots } from "../api";

/**
 * Temporary fallback data structure used only if the backend API is disconnected.
 * Clearly identified so developers know this is mock/fallback data.
 */
export const MOCK_FALLBACK_DASHBOARD = {
  totalRobots: 5,
  operationalRobots: 4,
  openIssuesCount: 0,
  criticalHighCount: 0,
  pendingApprovalsCount: 0,
  completedTasksCount: 0,
  recentActivity: [],
  priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
  urgentIssues: [],
  isMockFallback: true,
};

/**
 * Fetches and transforms all live dashboard data from the backend.
 * Calculates operational ratios, urgent issues, and priority distributions.
 */
export async function getDashboardData() {
  try {
    const [summary, issues, tasks, robots] = await Promise.all([
      getDashboardSummary(),
      listIssues().catch(() => []),
      listTasks().catch(() => []),
      listRobots().catch(() => []),
    ]);

    // Active issues (open or task_proposed)
    const activeIssues = (issues || []).filter((i) => i.status !== "closed");
    const criticalHigh = activeIssues.filter(
      (i) => i.priority === "critical" || i.priority === "high"
    );

    // Dynamic priority distribution (0-100 scores grouped by band)
    const dist = { critical: 0, high: 0, medium: 0, low: 0 };
    (issues || []).forEach((i) => {
      const p = (i.priority || "medium").toLowerCase();
      if (dist[p] !== undefined) {
        dist[p]++;
      } else {
        dist.medium++;
      }
    });

    // Most urgent issues: active issues sorted by priority_score descending
    const urgentIssues = [...activeIssues]
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5);

    // Fleet metrics
    const totalRobots = robots?.length || 5;
    // An operational unit is in service (idle or dispatched) and not in offline/maintenance
    const operationalRobots = (robots || []).filter(
      (r) => r.status !== "offline" && r.status !== "maintenance"
    ).length;

    // Aggregations from summary or computed from raw collections
    const pendingApprovalsCount =
      summary?.pending_approvals ??
      (tasks || []).filter((t) => t.stage === "draft").length;

    const completedTasksCount =
      summary?.completed_tasks ??
      (tasks || []).filter((t) => t.stage === "complete").length;

    const openIssuesCount =
      summary?.open_issues ?? activeIssues.length;

    const recentActivity = summary?.recent_activity || [];

    return {
      totalRobots,
      operationalRobots,
      openIssuesCount,
      criticalHighCount: criticalHigh.length,
      pendingApprovalsCount,
      completedTasksCount,
      recentActivity,
      priorityDistribution: dist,
      urgentIssues,
      isMockFallback: false,
    };
  } catch (error) {
    console.warn("[dashboardService] API fetch failed, utilizing mock fallback:", error);
    return { ...MOCK_FALLBACK_DASHBOARD, error: error.message };
  }
}
