"""
issues.py
---------
Handles issue creation from reports and issue retrieval.

Endpoints:
  GET  /issues                    → List all issues
  GET  /issues/{id}               → Get one issue
  POST /reports/{id}/analyze      → Analyze a report → create an Issue
  POST /issues/{id}/propose-task  → Create a draft Task from an Issue
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from services.issue_matcher import find_related_issues, count_recent_matches
from services.priority_engine import calculate_priority

router = APIRouter(tags=["Issues"])


# ---------------------------------------------------------------------------
# GET /issues
# ---------------------------------------------------------------------------
@router.get("/issues", response_model=List[schemas.IssueOut])
def list_issues(db: Session = Depends(get_db)):
    """Return all issues, newest first."""
    issues = db.query(models.Issue).order_by(models.Issue.created_at.desc()).all()
    return [_to_out(i) for i in issues]


# ---------------------------------------------------------------------------
# GET /issues/{id}
# ---------------------------------------------------------------------------
@router.get("/issues/{issue_id}", response_model=schemas.IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")
    return _to_out(issue)


# ---------------------------------------------------------------------------
# POST /reports/{id}/analyze  →  creates an Issue from the Report
# ---------------------------------------------------------------------------
@router.post("/reports/{report_id}/analyze", response_model=schemas.IssueOut, status_code=201)
def analyze_report(report_id: int, db: Session = Depends(get_db)):
    """
    Analyzes an existing report and creates an Issue record.
    Runs the issue matcher and priority engine automatically.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    # Create a temporary issue object to run matching against
    issue = models.Issue(
        report_id = report.id,
        robot_id  = report.robot_id,
        component = report.component,
        symptom   = report.symptom,
    )
    db.add(issue)
    db.flush()  # gives issue an ID without committing

    # Find related issues and count repeats
    related_ids  = find_related_issues(db, issue)
    repeat_count = count_recent_matches(db, issue)

    # Calculate priority
    priority, score, reason = calculate_priority(
        component    = report.component,
        symptom      = report.symptom,
        repeat_count = repeat_count,
    )

    # Update issue with analysis results
    issue.priority       = priority
    issue.priority_score = score
    issue.reason         = reason
    issue.related_ids    = ",".join(str(i) for i in related_ids)

    db.commit()
    db.refresh(issue)

    # Write audit log
    log = models.AuditLog(
        event_type  = "issue_created",
        entity_type = "issue",
        entity_id   = issue.id,
        actor       = "system",
        reason      = f"Issue created from Report #{report_id}. Priority: {priority}.",
    )
    db.add(log)
    db.commit()

    return _to_out(issue)


# ---------------------------------------------------------------------------
# POST /issues/{id}/propose-task  →  creates a draft Task
# ---------------------------------------------------------------------------
@router.post("/issues/{issue_id}/propose-task", response_model=schemas.TaskOut, status_code=201)
def propose_task(issue_id: int, db: Session = Depends(get_db)):
    """
    Creates a draft Task from an Issue.
    The task starts in 'draft' stage — it cannot proceed until a human approves it.
    """
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found.")

    if issue.status == schemas.IssueStatus.task_proposed:
        raise HTTPException(
            status_code=409,
            detail="A task has already been proposed for this issue.",
        )

    component = issue.component or "unknown component"
    robot     = issue.robot_id  or "unknown robot"

    task = models.Task(
        issue_id    = issue.id,
        robot_id    = issue.robot_id,
        title       = f"Inspect {component} on {robot}",
        description = (
            f"Proposed from Issue #{issue.id}. "
            f"Symptom: {issue.symptom or 'not specified'}. "
            f"Priority: {issue.priority}. "
            f"Reason: {issue.reason}"
        ),
        stage = schemas.TaskStage.draft.value,
    )
    db.add(task)

    # Mark the issue as having a proposed task
    issue.status = schemas.IssueStatus.task_proposed.value
    db.commit()
    db.refresh(task)

    # Write audit log
    log = models.AuditLog(
        event_type  = "task_proposed",
        entity_type = "task",
        entity_id   = task.id,
        actor       = "system",
        reason      = f"Draft task proposed from Issue #{issue_id}. Awaiting human approval.",
    )
    db.add(log)
    db.commit()

    return task


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _to_out(i: models.Issue) -> schemas.IssueOut:
    related = [int(x) for x in i.related_ids.split(",") if x.strip().isdigit()]
    return schemas.IssueOut(
        id               = i.id,
        report_id        = i.report_id,
        robot_id         = i.robot_id,
        component        = i.component,
        symptom          = i.symptom,
        priority         = i.priority,
        priority_score   = i.priority_score,
        reason           = i.reason,
        related_issue_ids = related,
        status           = i.status,
        created_at       = i.created_at,
    )
