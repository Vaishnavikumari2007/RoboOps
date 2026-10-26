"""
simulator.py
------------
Advances a Task through its workflow stages.

Stage order:
  draft → awaiting_approval → dispatched → in_progress → complete

IMPORTANT:
  - Tasks can only be advanced AFTER a human approves them (stage must be past 'draft').
  - This never calls any external system — it only updates the database.
  - 'awaiting_approval' → 'dispatched' requires human approval first (enforced in the router).
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
import models
from schemas import STAGE_ORDER, TaskStage


def get_next_stage(current_stage: str) -> str | None:
    """
    Returns the next stage name, or None if already at 'complete'.
    """
    try:
        idx = STAGE_ORDER.index(TaskStage(current_stage))
    except ValueError:
        return None

    if idx + 1 >= len(STAGE_ORDER):
        return None  # already complete

    return STAGE_ORDER[idx + 1].value


def advance_task(db: Session, task: models.Task, actor: str = "system") -> models.Task:
    """
    Moves a task to the next stage and writes an AuditLog entry.
    Returns the updated task.
    Raises ValueError if the task cannot be advanced.
    """
    next_stage = get_next_stage(task.stage)

    if next_stage is None:
        raise ValueError(f"Task {task.id} is already at final stage '{task.stage}'.")

    # Guard: tasks must be approved before moving past awaiting_approval
    if task.stage == TaskStage.draft.value:
        raise ValueError(
            "Task must be approved by a human before it can be dispatched. "
            "Use POST /tasks/{id}/approve first."
        )

    previous_stage = task.stage
    task.stage      = next_stage
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # Write audit log
    log = models.AuditLog(
        event_type  = "task_advanced",
        entity_type = "task",
        entity_id   = task.id,
        actor       = actor,
        reason      = f"Task advanced from '{previous_stage}' to '{next_stage}' by {actor}.",
    )
    db.add(log)
    db.commit()
    db.refresh(task)
    return task
