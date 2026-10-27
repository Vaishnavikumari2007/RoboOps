/**
 * reportService.js
 * ----------------
 * Data service layer for the Reports Inbox.
 *
 * Coordinates live communication with the backend:
 *   - POST /reports
 *   - GET  /reports
 *   - POST /reports/{id}/analyze
 *   - GET  /issues (to correlate analysis status)
 *
 * Encapsulates input formatting, title extraction, and issue correlation.
 */

import { listReports, submitReport, analyzeReport, listIssues } from "../api";

/**
 * Extracts a human-friendly title from a report's raw text.
 */
export function getReportTitle(report) {
  if (!report || !report.raw_text) return "Untitled Report";
  
  // Check for explicit [Title: ...] tag
  const tagMatch = report.raw_text.match(/\[Title:\s*(.*?)\]/i);
  if (tagMatch && tagMatch[1]) {
    return tagMatch[1].trim();
  }

  // Fallback to first line
  const clean = report.raw_text.replace(/\[Title:\s*.*?\]/gi, "").trim();
  const firstLine = clean.split("\n")[0].trim();
  if (firstLine.length > 65) {
    return firstLine.slice(0, 65) + "…";
  }
  return firstLine || `Report #${report.id}`;
}

/**
 * Strips the internal [Title: ...] tag from the raw text for display.
 */
export function getCleanReportBody(rawText) {
  if (!rawText) return "";
  return rawText.replace(/\[Title:\s*.*?\]\n*/gi, "").trim();
}

/**
 * Loads all reports and cross-references with existing issues
 * to determine which reports have already been analyzed.
 */
export async function fetchReportsWithStatus() {
  const [reports, issues] = await Promise.all([
    listReports(),
    listIssues().catch(() => []),
  ]);

  const issueReportMap = new Map();
  (issues || []).forEach((issue) => {
    if (issue.report_id) {
      issueReportMap.set(issue.report_id, issue);
    }
  });

  return (reports || []).map((report) => {
    const matchedIssue = issueReportMap.get(report.id);
    return {
      ...report,
      title: getReportTitle(report),
      cleanBody: getCleanReportBody(report.raw_text),
      hasIssue: !!matchedIssue,
      issueId: matchedIssue?.id || null,
      issuePriority: matchedIssue?.priority || null,
    };
  });
}

/**
 * Formats and submits a new report to the backend.
 * Incorporates title and robot ID into the immutable free-text payload.
 */
export async function createNewReport({ title, type, submittedBy, robotId, rawText }) {
  let text = rawText.trim();

  // If a specific robot ID was provided and not already in the text, include it
  if (robotId && robotId.trim()) {
    const rid = robotId.trim().toUpperCase();
    if (!text.toUpperCase().includes(rid)) {
      text = `Robot ${rid}: ${text}`;
    }
  }

  // Prepend title tag if provided
  if (title && title.trim()) {
    text = `[Title: ${title.trim()}]\n${text}`;
  }

  const payload = {
    type,
    submitted_by: submittedBy.trim(),
    raw_text: text,
  };

  return await submitReport(payload);
}

/**
 * Analyzes a report and derives an Issue record via the backend.
 */
export async function triggerReportAnalysis(reportId) {
  return await analyzeReport(reportId);
}
