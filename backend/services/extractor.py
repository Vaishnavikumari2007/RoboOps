"""
extractor.py
------------
Pulls structured fields out of free-text reports using regex and keyword rules.

IMPORTANT: This uses ONLY pattern matching — it never guesses or invents values.
If a field can't be found, it returns None for that field.
"""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Keyword lists for component and symptom detection
# ---------------------------------------------------------------------------
COMPONENT_KEYWORDS = [
    "wheel motor", "left wheel motor", "right wheel motor",
    "motor", "servo", "sensor", "camera", "battery", "arm",
    "gripper", "chassis", "casing", "joint", "actuator",
    "encoder", "controller", "gyroscope", "lidar", "wheel",
]

SYMPTOM_KEYWORDS = [
    "grinding noise", "overheating", "not responding", "stuck",
    "vibrating", "vibration", "loose", "misaligned", "drifting", "calibration error",
    "low voltage", "power failure", "connection lost", "jerky movement",
    "slow response", "unusual noise", "sparking", "burning smell",
    "leaking", "damaged", "worn out", "broken",
]

# Days and relative terms commonly written in reports
DATE_PATTERNS = [
    r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b",
    r"\b(yesterday|today|last week|this week|last month)\b",
    r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b",   # e.g. 10/24 or 10-24-2026
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b",
]


def extract_robot_id(text: str) -> Optional[str]:
    """
    Looks for patterns like R1, R2, Robot-3, robot 4, RB-01.
    Returns the first match found, or None.
    """
    pattern = r"\b(?:Robot[-\s]?)?([Rr][Bb]?[-]?\d{1,3})\b"
    match = re.search(pattern, text)
    if match:
        return match.group(1).upper()
    return None


def extract_component(text: str) -> Optional[str]:
    """
    Searches the text for known component keywords (longest match first).
    Returns the first match, or None.
    """
    text_lower = text.lower()
    # Sort by length descending so "left wheel motor" beats "motor"
    for keyword in sorted(COMPONENT_KEYWORDS, key=len, reverse=True):
        if keyword in text_lower:
            return keyword
    return None


def extract_symptom(text: str) -> Optional[str]:
    """
    Searches the text for known symptom keywords (longest match first).
    Returns the first match, or None.
    """
    text_lower = text.lower()
    for keyword in sorted(SYMPTOM_KEYWORDS, key=len, reverse=True):
        if keyword in text_lower:
            return keyword
    return None


def extract_date_mentioned(text: str) -> Optional[str]:
    """
    Looks for common date/day references in the text.
    Returns the first match found, or None.
    """
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(0)
    return None


def extract_fields(raw_text: str) -> dict:
    """
    Master extractor — runs all sub-extractors and returns a dict.
    All values may be None if nothing was found.
    """
    return {
        "robot_id":       extract_robot_id(raw_text),
        "component":      extract_component(raw_text),
        "symptom":        extract_symptom(raw_text),
        "date_mentioned": extract_date_mentioned(raw_text),
    }
