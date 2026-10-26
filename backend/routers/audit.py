"""
audit.py
--------
Returns the full immutable audit log of all system events.

Endpoint:
  GET /audit
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=List[schemas.AuditLogOut])
def get_audit_log(db: Session = Depends(get_db)):
    """
    Returns all audit log entries in reverse-chronological order.
    This log is append-only — entries are never deleted or modified.
    """
    logs = (
        db.query(models.AuditLog)
        .order_by(desc(models.AuditLog.created_at))
        .all()
    )
    return logs
