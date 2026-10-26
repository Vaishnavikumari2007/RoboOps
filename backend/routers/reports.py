"""
reports.py
----------
Handles report submission and retrieval.

Endpoints:
  POST /reports          → Submit a new report (triggers extraction)
  GET  /reports          → List all reports
  GET  /reports/{id}     → Get one report with extracted fields
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from services.extractor import extract_fields

router = APIRouter(prefix="/reports", tags=["Reports"])


# ---------------------------------------------------------------------------
# POST /reports
# ---------------------------------------------------------------------------
@router.post("", response_model=schemas.ReportOut, status_code=201)
def submit_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    """
    Submit a new meeting note or maintenance report.
    The system immediately extracts structured fields from the raw text.
    The raw text is stored as-is and never modified.
    """
    # Extract structured fields from free text
    extracted = extract_fields(payload.raw_text)

    # Persist the report
    report = models.Report(
        type         = payload.type,
        submitted_by = payload.submitted_by,
        raw_text     = payload.raw_text,
        robot_id     = extracted["robot_id"],
        component    = extracted["component"],
        symptom      = extracted["symptom"],
        date_mentioned = extracted["date_mentioned"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Write audit log
    log = models.AuditLog(
        event_type  = "report_submitted",
        entity_type = "report",
        entity_id   = report.id,
        actor       = payload.submitted_by,
        reason      = f"Report of type '{payload.type}' submitted.",
    )
    db.add(log)
    db.commit()

    return _to_out(report)


# ---------------------------------------------------------------------------
# GET /reports
# ---------------------------------------------------------------------------
@router.get("", response_model=List[schemas.ReportOut])
def list_reports(db: Session = Depends(get_db)):
    """Return all reports, newest first."""
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    return [_to_out(r) for r in reports]


# ---------------------------------------------------------------------------
# GET /reports/{id}
# ---------------------------------------------------------------------------
@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Return a single report by ID."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return _to_out(report)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _to_out(r: models.Report) -> schemas.ReportOut:
    return schemas.ReportOut(
        id           = r.id,
        type         = r.type,
        submitted_by = r.submitted_by,
        raw_text     = r.raw_text,
        extracted    = schemas.ExtractedFields(
            robot_id       = r.robot_id,
            component      = r.component,
            symptom        = r.symptom,
            date_mentioned = r.date_mentioned,
        ),
        created_at = r.created_at,
    )
