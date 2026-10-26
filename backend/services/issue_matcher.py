"""
issue_matcher.py
----------------
Finds issues in the database that are related to a newly created issue.
Matching is done by comparing robot_id, component, and symptom fields —
purely rule-based, no AI involved.
"""

from typing import List
from sqlalchemy.orm import Session
import models


def find_related_issues(db: Session, new_issue: models.Issue) -> List[int]:
    """
    Returns a list of Issue IDs that share at least one of:
      - same robot_id
      - same component
      - same symptom

    The new issue itself is excluded from the results.
    """
    if not any([new_issue.robot_id, new_issue.component, new_issue.symptom]):
        return []

    all_issues = (
        db.query(models.Issue)
        .filter(models.Issue.id != new_issue.id)
        .all()
    )

    related_ids = []
    for existing in all_issues:
        score = 0
        if new_issue.robot_id  and existing.robot_id  == new_issue.robot_id:
            score += 1
        if new_issue.component and existing.component == new_issue.component:
            score += 2   # component match is weighted higher
        if new_issue.symptom   and existing.symptom   == new_issue.symptom:
            score += 2

        if score >= 1:
            related_ids.append(existing.id)

    return related_ids


def count_recent_matches(db: Session, issue: models.Issue, days: int = 14) -> int:
    """
    Count how many issues with the same robot_id + component exist
    in the last `days` days. Used by the priority engine.
    """
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    query = db.query(models.Issue).filter(
        models.Issue.id != issue.id,
        models.Issue.created_at >= cutoff,
    )
    if issue.robot_id:
        query = query.filter(models.Issue.robot_id == issue.robot_id)
    if issue.component:
        query = query.filter(models.Issue.component == issue.component)

    return query.count()
