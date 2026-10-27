"""
priority_engine.py
------------------
Assigns a priority level and score (0–100) to an issue.
All rules are explicit — no AI, no guessing.

Scoring factors:
  - Component criticality (motor > sensor > casing, etc.)
  - Symptom severity   (sparking > noise > slow response, etc.)
  - Repetition count   (more recent occurrences → higher score)
"""

from typing import Tuple

# ---------------------------------------------------------------------------
# Lookup tables — each returns a base score contribution (0–30)
# ---------------------------------------------------------------------------
COMPONENT_SCORES = {
    "motor":            30,
    "left wheel motor": 28,
    "right wheel motor":28,
    "wheel motor":      28,
    "actuator":         25,
    "servo":            22,
    "controller":       22,
    "encoder":          20,
    "battery":          20,
    "joint":            18,
    "arm":              18,
    "gripper":          16,
    "lidar":            16,
    "gyroscope":        15,
    "camera":           14,
    "sensor":           14,
    "wheel":            12,
    "chassis":          10,
    "casing":           8,
}

SYMPTOM_SCORES = {
    "sparking":          40,
    "burning smell":     38,
    "power failure":     36,
    "low voltage":       32,
    "overheating":       30,
    "not responding":    28,
    "connection lost":   26,
    "calibration error": 24,
    "grinding noise":    22,
    "vibrating":         20,
    "vibration":         20,
    "jerky movement":    18,
    "stuck":             18,
    "loose":             14,
    "misaligned":        14,
    "drifting":          12,
    "slow response":     10,
    "unusual noise":     10,
    "worn out":           8,
    "leaking":            8,
    "damaged":           16,
    "broken":            20,
}

REPETITION_BONUS = {
    0: 0,
    1: 8,
    2: 16,
    3: 24,
}  # capped at 3+


def _score_to_priority(score: float) -> str:
    if score >= 75:
        return "critical"
    elif score >= 55:
        return "high"
    elif score >= 35:
        return "medium"
    else:
        return "low"


def _build_reason(component: str, symptom: str, repeat_count: int, score: float) -> str:
    """Builds a transparent, factual explanation of why this priority was assigned."""
    parts = []

    if component:
        c_score = COMPONENT_SCORES.get(component, 0)
        parts.append(f"Component '{component}' has a criticality score of {c_score}/30.")

    if symptom:
        s_score = SYMPTOM_SCORES.get(symptom, 0)
        parts.append(f"Symptom '{symptom}' has a severity score of {s_score}/40.")

    if repeat_count > 0:
        parts.append(
            f"This combination appeared {repeat_count} more time(s) in the past 14 days "
            f"(+{REPETITION_BONUS.get(min(repeat_count, 3), 24)} repetition bonus)."
        )

    parts.append(f"Total priority score: {score:.0f}/100.")
    return " ".join(parts)


def calculate_priority(
    component: str | None,
    symptom:   str | None,
    repeat_count: int = 0,
) -> Tuple[str, float, str]:
    """
    Returns (priority_label, score, reason_text).

    All inputs default gracefully — a report with no component or symptom
    gets a low score rather than an error.
    """
    c_score = COMPONENT_SCORES.get(component or "", 0)
    s_score = SYMPTOM_SCORES.get(symptom or "", 0)
    r_bonus = REPETITION_BONUS.get(min(repeat_count, 3), 24)

    # Normalise: max possible = 30 + 40 + 24 = 94 → scale to 100
    raw = c_score + s_score + r_bonus
    score = min(round((raw / 94) * 100, 1), 100.0)

    priority = _score_to_priority(score)
    reason   = _build_reason(component or "", symptom or "", repeat_count, score)

    return priority, score, reason
