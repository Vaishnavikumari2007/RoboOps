"""
dashboard.py
------------
Returns aggregated summary counts and recent activity for the Overview Dashboard.

Endpoint:
  GET /dashboard/summary
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
import schemas
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    """
    Returns real counts from the database — no fake or placeholder metrics.
    """
    total_reports     = db.query(models.Report).count()
    open_issues       = db.query(models.Issue).filter(models.Issue.status == "open").count()
    pending_approvals = db.query(models.Task).filter(models.Task.stage == "draft").count()
    completed_tasks   = db.query(models.Task).filter(models.Task.stage == "complete").count()

    # Last 10 audit log entries as "recent activity"
    logs = (
        db.query(models.AuditLog)
        .order_by(desc(models.AuditLog.created_at))
        .limit(10)
        .all()
    )

    recent_activity = [
        schemas.ActivityItem(
            event  = _label(log.event_type),
            detail = log.reason or "",
            time   = log.created_at,
        )
        for log in logs
    ]

    return schemas.DashboardSummary(
        total_reports     = total_reports,
        open_issues       = open_issues,
        pending_approvals = pending_approvals,
        completed_tasks   = completed_tasks,
        recent_activity   = recent_activity,
    )


def _label(event_type: str) -> str:
    """Converts snake_case event types to human-readable labels."""
    return event_type.replace("_", " ").title()
