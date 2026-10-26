"""
models.py
---------
SQLAlchemy ORM models — one class = one database table.

Tables:
  Report    → stores raw submitted text + extracted fields
  Issue     → analysis result derived from a Report
  Task      → a maintenance task proposed from an Issue
  AuditLog  → immutable event log for every important action
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
class Report(Base):
    __tablename__ = "reports"

    id           = Column(Integer, primary_key=True, index=True)
    type         = Column(String(50), nullable=False)          # meeting_note | maintenance_report
    submitted_by = Column(String(100), nullable=False)
    raw_text     = Column(Text, nullable=False)                # original text — never modified

    # Extracted fields (may be None if extraction found nothing)
    robot_id      = Column(String(50),  nullable=True)
    component     = Column(String(100), nullable=True)
    symptom       = Column(String(200), nullable=True)
    date_mentioned = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=utcnow)

    # Relationships
    issues = relationship("Issue", back_populates="report")


# ---------------------------------------------------------------------------
# Issue
# ---------------------------------------------------------------------------
class Issue(Base):
    __tablename__ = "issues"

    id             = Column(Integer, primary_key=True, index=True)
    report_id      = Column(Integer, ForeignKey("reports.id"), nullable=False)
    robot_id       = Column(String(50),  nullable=True)
    component      = Column(String(100), nullable=True)
    symptom        = Column(String(200), nullable=True)
    priority       = Column(String(20),  default="medium")     # low | medium | high | critical
    priority_score = Column(Float,       default=50.0)         # 0–100
    reason         = Column(Text,        nullable=True)        # rule-based explanation
    related_ids    = Column(Text,        default="")           # comma-separated Issue IDs
    status         = Column(String(30),  default="open")       # open | task_proposed | closed
    created_at     = Column(DateTime,    default=utcnow)

    # Relationships
    report = relationship("Report", back_populates="issues")
    tasks  = relationship("Task",   back_populates="issue")


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------
class Task(Base):
    __tablename__ = "tasks"

    id          = Column(Integer, primary_key=True, index=True)
    issue_id    = Column(Integer, ForeignKey("issues.id"), nullable=False)
    robot_id    = Column(String(50),  nullable=True)
    title       = Column(String(200), nullable=False)
    description = Column(Text,        nullable=True)

    # Workflow stage — ordered list defined in schemas.py
    stage = Column(String(50), default="draft")
    # draft → awaiting_approval → dispatched → in_progress → complete

    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime,    nullable=True)
    created_at  = Column(DateTime,    default=utcnow)
    updated_at  = Column(DateTime,    default=utcnow, onupdate=utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="tasks")


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    event_type  = Column(String(100), nullable=False)   # e.g. "report_submitted"
    entity_type = Column(String(50),  nullable=True)    # "report" | "issue" | "task"
    entity_id   = Column(Integer,     nullable=True)
    actor       = Column(String(100), nullable=True)    # who triggered it
    reason      = Column(Text,        nullable=True)    # human-readable explanation
    created_at  = Column(DateTime,    default=utcnow)
