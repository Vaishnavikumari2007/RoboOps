"""
schemas.py
----------
Pydantic models that define the shape of API request bodies and responses.
Think of these as contracts: if the data doesn't match, FastAPI rejects it.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------
class ReportType(str, Enum):
    meeting_note        = "meeting_note"
    maintenance_report  = "maintenance_report"


class Priority(str, Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


class IssueStatus(str, Enum):
    open            = "open"
    task_proposed   = "task_proposed"
    closed          = "closed"


class TaskStage(str, Enum):
    draft              = "draft"
    awaiting_approval  = "awaiting_approval"
    dispatched         = "dispatched"
    in_progress        = "in_progress"
    complete           = "complete"


# Ordered list used by the simulator to find the next stage
STAGE_ORDER: List[TaskStage] = [
    TaskStage.draft,
    TaskStage.awaiting_approval,
    TaskStage.dispatched,
    TaskStage.in_progress,
    TaskStage.complete,
]


# ---------------------------------------------------------------------------
# Report schemas
# ---------------------------------------------------------------------------
class ReportCreate(BaseModel):
    type:         ReportType
    submitted_by: str = Field(..., min_length=1, max_length=100)
    raw_text:     str = Field(..., min_length=10)


class ExtractedFields(BaseModel):
    robot_id:       Optional[str] = None
    component:      Optional[str] = None
    symptom:        Optional[str] = None
    date_mentioned: Optional[str] = None


class ReportOut(BaseModel):
    id:           int
    type:         str
    submitted_by: str
    raw_text:     str
    extracted:    ExtractedFields
    created_at:   datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Issue schemas
# ---------------------------------------------------------------------------
class IssueOut(BaseModel):
    id:              int
    report_id:       int
    robot_id:        Optional[str]
    component:       Optional[str]
    symptom:         Optional[str]
    priority:        str
    priority_score:  float
    reason:          Optional[str]
    related_issue_ids: List[int]
    status:          str
    created_at:      datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Task schemas
# ---------------------------------------------------------------------------
class TaskOut(BaseModel):
    id:          int
    issue_id:    int
    robot_id:    Optional[str]
    title:       str
    description: Optional[str]
    stage:       str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


class ApproveTaskRequest(BaseModel):
    approved_by: str = Field(..., min_length=1, max_length=100)


# ---------------------------------------------------------------------------
# Dashboard schema
# ---------------------------------------------------------------------------
class ActivityItem(BaseModel):
    event:  str
    detail: str
    time:   datetime


class DashboardSummary(BaseModel):
    total_reports:     int
    open_issues:       int
    pending_approvals: int
    completed_tasks:   int
    recent_activity:   List[ActivityItem]


# ---------------------------------------------------------------------------
# Audit schema
# ---------------------------------------------------------------------------
class AuditLogOut(BaseModel):
    id:          int
    event_type:  str
    entity_type: Optional[str]
    entity_id:   Optional[int]
    actor:       Optional[str]
    reason:      Optional[str]
    created_at:  datetime

    class Config:
        from_attributes = True
