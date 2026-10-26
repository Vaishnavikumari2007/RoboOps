"""
tasks.py
--------
Handles task retrieval, human approval, and simulation advancement.

Endpoints:
  GET  /tasks              → List all tasks
  GET  /tasks/{id}         → Get one task
  POST /tasks/{id}/approve → Human approves a draft task
  POST /tasks/{id}/advance → Advance task to next simulation stage
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

import models
import schemas
from database import get_db
from services.simulator import advance_task

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ---------------------------------------------------------------------------
# GET /tasks
# ---------------------------------------------------------------------------
@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db)):
    """Return all tasks, newest first."""
    return db.query(models.Task).order_by(models.Task.created_at.desc()).all()


# ---------------------------------------------------------------------------
# GET /tasks/{id}
# ---------------------------------------------------------------------------
@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")
    return task


# ---------------------------------------------------------------------------
# POST /tasks/{id}/approve  (human approval gate)
# ---------------------------------------------------------------------------
@router.post("/{task_id}/approve", response_model=schemas.TaskOut)
def approve_task(
    task_id: int,
    payload: schemas.ApproveTaskRequest,
    db: Session = Depends(get_db),
):
    """
    A human explicitly approves a draft task.
    This is the only way to move a task out of 'draft' stage.
    After approval the task moves to 'awaiting_approval' → ready for simulation.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    if task.stage != schemas.TaskStage.draft.value:
        raise HTTPException(
            status_code=409,
            detail=f"Task is already in stage '{task.stage}' — only 'draft' tasks can be approved.",
        )

    task.stage       = schemas.TaskStage.awaiting_approval.value
    task.approved_by = payload.approved_by
    task.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    task.updated_at  = task.approved_at
    db.commit()
    db.refresh(task)

    # Write audit log
    log = models.AuditLog(
        event_type  = "task_approved",
        entity_type = "task",
        entity_id   = task.id,
        actor       = payload.approved_by,
        reason      = f"Task #{task_id} approved by {payload.approved_by}. Ready for simulation.",
    )
    db.add(log)
    db.commit()

    return task


# ---------------------------------------------------------------------------
# POST /tasks/{id}/advance  (simulation step)
# ---------------------------------------------------------------------------
@router.post("/{task_id}/advance", response_model=schemas.TaskOut)
def advance_task_stage(
    task_id: int,
    db: Session = Depends(get_db),
):
    """
    Advances a task to the next workflow stage (simulation only).
    The task must have been approved first.
    Stage order: draft → awaiting_approval → dispatched → in_progress → complete
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    try:
        task = advance_task(db, task, actor="system")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return task
