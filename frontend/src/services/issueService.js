/**
 * issueService.js
 * ---------------
 * Data-service layer for Issue Intelligence.
 *
 * Coordinates live calls:
 *   - GET  /issues
 *   - GET  /reports (to correlate evidence sentences and source report metadata)
 *   - POST /issues/{id}/propose-task
 *   - POST /reports/{id}/analyze (for requesting re-analysis or initial analysis)
 */

import { listIssues, listReports, proposeTask, analyzeReport } from "../api";

/**
 * Extracts sentences from the source report that contain the component,
 * symptom, or robot ID as evidence.
 */
export function extractEvidenceSentences(rawText, component, symptom, robotId) {
  if (!rawText) return [];
  // Split into sentences (by period, exclamation, question mark, or newline)
  const sentences = rawText
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const targets = [component, symptom, robotId]
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  const matched = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return targets.some((target) => lower.includes(target));
  });

  // If none matched, return the first sentence as fallback
  if (matched.length === 0 && sentences.length > 0) {
    return [sentences[0]];
  }
  return matched;
}

/**
 * Derives a readable title for the issue based on component and robot.
 */
export function deriveIssueTitle(issue) {
  const comp = issue.component
    ? issue.component.charAt(0).toUpperCase() + issue.component.slice(1)
    : "Robotics Component";
  const robot = issue.robot_id ? ` on ${issue.robot_id}` : "";
  const symp = issue.symptom ? ` (${issue.symptom})` : "";
  return `${comp}${robot}${symp}`;
}

/**
 * Fetches all issues enriched with source report context, evidence quotes,
 * occurrence counts, and relation classifications (confirmed duplicates vs potentially related).
 */
export async function fetchEnrichedIssues() {
  const [issues, reports] = await Promise.all([
    listIssues(),
    listReports().catch(() => []),
  ]);

  const reportMap = new Map();
  (reports || []).forEach((r) => {
    reportMap.set(r.id, r);
  });

  // Enrich each issue
  const enriched = (issues || []).map((issue) => {
    const sourceReport = reportMap.get(issue.report_id) || null;
    const evidence = sourceReport
      ? extractEvidenceSentences(
          sourceReport.raw_text,
          issue.component,
          issue.symptom,
          issue.robot_id
        )
      : [];

    // Calculate occurrences among all issues:
    // Occurrences = issues sharing the exact same robot_id and component
    const matchingOccurrences = (issues || []).filter((other) => {
      if (!issue.component) return false;
      const sameRobot = issue.robot_id && other.robot_id === issue.robot_id;
      const sameComp =
        other.component &&
        other.component.toLowerCase() === issue.component.toLowerCase();
      return sameRobot && sameComp;
    });

    // Distinguish Confirmed Duplicates vs Potentially Related
    // Confirmed Duplicate: exact same robot + component + symptom
    const confirmedDuplicates = (issues || []).filter((other) => {
      if (other.id === issue.id) return false;
      const sameRobot = issue.robot_id && other.robot_id === issue.robot_id;
      const sameComp =
        issue.component &&
        other.component &&
        other.component.toLowerCase() === issue.component.toLowerCase();
      const sameSymptom =
        issue.symptom &&
        other.symptom &&
        other.symptom.toLowerCase() === issue.symptom.toLowerCase();
      return sameRobot && sameComp && sameSymptom;
    });

    // Potentially Related: matches robot OR component, but not an exact duplicate
    const potentiallyRelated = (issues || []).filter((other) => {
      if (other.id === issue.id) return false;
      if (confirmedDuplicates.some((d) => d.id === other.id)) return false;
      const sameRobot = issue.robot_id && other.robot_id === issue.robot_id;
      const sameComp =
        issue.component &&
        other.component &&
        other.component.toLowerCase() === issue.component.toLowerCase();
      return sameRobot || sameComp;
    });

    return {
      ...issue,
      title: deriveIssueTitle(issue),
      sourceReport,
      evidenceSentences: evidence,
      occurrenceCount: Math.max(1, matchingOccurrences.length),
      confirmedDuplicates,
      potentiallyRelated,
      hasDuplicates: confirmedDuplicates.length > 0,
      hasRelated: potentiallyRelated.length > 0,
    };
  });

  return enriched;
}

/**
 * Creates a draft maintenance task from the issue.
 */
export async function proposeMaintenanceTask(issueId) {
  return await proposeTask(issueId);
}

/**
 * Triggers re-analysis for a report if supported.
 */
export async function reanalyzeReport(reportId) {
  return await analyzeReport(reportId);
}
