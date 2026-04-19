"""
Seed MongoDB with sample user test sessions (random but biased toward a typical profile).

Run from the backend folder (with MongoDB running):
    python sample_data.py

Uses the same URI rules as database.py (MONGO_URL / MONGODB_URI, else localhost
when not on Railway). On Railway, reference the Mongo service URL or rely on
the internal fallback when RAILWAY_* env is set.

Uses Motor (same as database.py), not pymongo.MongoClient directly.
"""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from database import get_mongo_uri
DB_NAME = "testSessions"
COLLECTION_NAME = "userSession"

SAMPLE_SIZE = 1000
TARGET_TOTAL_SECONDS = 600
# Fraction of synthetic change_log rows marked as user-rejected proposals (for analytics)
CHANGE_REJECTION_PROBABILITY = 0.11
# Example session total was 96s; scale per-version times from that snapshot
EXAMPLE_SESSION_TOTAL = 96

MEDICAL_CONDITIONS = [
    "Poor Eyesight",
    "Dyslexia",
    "Color Blind",
    "Carpal Tunnel Syndrome",
    "Arthritis",
    "ADHD",
    "Autism",
    "Hand Injury",
    "Trouble Reading",
]

# Target profile (trend): active versions and rough change_log shape
TARGET_ACTIVE = {
    "Menu_Dropdown_Button": "large",
    "Home_Page_Text_Content": "medium",
    "Community_Project_Grid": "v2",
    "Workspace_Left_Buttons": "v2",
    "Profile_Display_Info": "v2",
}

# Example per-version seconds (before scaling to ~600 session total)
BASE_TIME_BY_ELEMENT = {
    "Menu_Dropdown_Button": {"small": 0, "medium": 0, "large": 0},
    "Home_Page_Text_Content": {"small": 23, "medium": 3, "large": 0},
    "Community_Project_Grid": {"v1": 18, "v2": 8, "v3": 0},
    "Workspace_Left_Buttons": {"v1": 6, "v2": 7},
    "Profile_Display_Info": {"v1": 0, "v2": 0},
}

# Log templates: list of (from_v, to_v, rolled_back) — timestamps filled later
MENU_LOG_TEMPLATE = [
    ("small", "medium", False),
    ("medium", "medium", False),
    ("medium", "large", False),
    ("large", "medium", True),
    ("medium", "large", False),
    ("large", "large", False),
]

HOME_LOG_TEMPLATE = [
    ("small", "medium", False),
    ("medium", "medium", False),
]

GRID_LOG_TEMPLATE = [
    ("v1", "v2", False),
    ("v2", "v2", False),
]

WORKSPACE_LOG_TEMPLATE = [
    ("v1", "v2", False),
    ("v2", "v2", False),
]

PROFILE_LOG_TEMPLATE = [
    ("v1", "v2", False),
    ("v2", "v2", False),
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _random_conditions() -> tuple[bool, str]:
    """Trend toward no conditions; if yes, one or more labels from MEDICAL_CONDITIONS."""
    if random.random() < 0.62:
        return False, "None"
    n = random.randint(1, 3)
    chosen = random.sample(MEDICAL_CONDITIONS, n)
    return True, ", ".join(sorted(chosen))


def _noise_factor() -> float:
    return random.uniform(0.88, 1.12)


def _scale_total_around_target() -> int:
    return max(1, int(random.gauss(TARGET_TOTAL_SECONDS, 12)))


def _build_time_spent(element_key: str, active: str, scale: float) -> dict[str, int]:
    base = BASE_TIME_BY_ELEMENT[element_key]
    keys = list(base.keys())
    out: dict[str, int] = {}
    for k in keys:
        v = max(0, int(round(base[k] * scale * _noise_factor())))
        out[k] = v
    # Nudge so active version holds most of the mass when possible
    if active in out and sum(out.values()) > 0:
        s = sum(out.values())
        bump = int(s * random.uniform(0.05, 0.2))
        out[active] = out.get(active, 0) + bump
    return out


def _log_entries(
    template: list[tuple[str, str, bool]],
    base_time: datetime,
) -> list[dict]:
    entries = []
    t = base_time
    for from_v, to_v, rolled_back in template:
        t += timedelta(seconds=random.uniform(0.3, 2.5))
        entries.append(
            {
                "changed_at": t,
                "from_version": from_v,
                "to_version": to_v,
                "suggested_by_app": True,
                "change_rejected": False,
                "rolled_back": rolled_back,
            }
        )
    return entries


def _sprinkle_change_rejections(entries: list[dict]) -> None:
    """Mark some log rows as rejected so analytics and DB reflect real 'No' outcomes."""
    for entry in entries:
        if random.random() < CHANGE_REJECTION_PROBABILITY:
            entry["change_rejected"] = True


def _pick_active(allowed: list[str], preferred: str, adherence: float) -> str:
    if random.random() < adherence:
        return preferred if preferred in allowed else allowed[0]
    return random.choice(allowed)


def build_ui_changes(session_total: int) -> dict:
    """Random UI state biased toward TARGET_ACTIVE; times scaled from example ~ session_total."""
    scale = (session_total / EXAMPLE_SESSION_TOTAL) * _noise_factor()
    adherence = random.uniform(0.68, 0.92)

    base_time = _utc_now() - timedelta(
        seconds=random.randint(120, session_total + 400),
        microseconds=random.randint(0, 999_999),
    )

    menu_active = _pick_active(["small", "medium", "large"], TARGET_ACTIVE["Menu_Dropdown_Button"], adherence)
    home_active = _pick_active(["small", "medium", "large"], TARGET_ACTIVE["Home_Page_Text_Content"], adherence)
    grid_active = _pick_active(["v1", "v2", "v3"], TARGET_ACTIVE["Community_Project_Grid"], adherence)
    workspace_active = _pick_active(["v1", "v2"], TARGET_ACTIVE["Workspace_Left_Buttons"], adherence)
    profile_active = _pick_active(["v1", "v2"], TARGET_ACTIVE["Profile_Display_Info"], adherence)

    menu_log = _log_entries(MENU_LOG_TEMPLATE, base_time)
    home_log = _log_entries(HOME_LOG_TEMPLATE, base_time + timedelta(seconds=random.randint(20, 90)))
    grid_log = _log_entries(GRID_LOG_TEMPLATE, base_time + timedelta(seconds=random.randint(10, 60)))
    workspace_log = _log_entries(WORKSPACE_LOG_TEMPLATE, base_time + timedelta(seconds=random.randint(40, 120)))
    profile_log = _log_entries(PROFILE_LOG_TEMPLATE, base_time + timedelta(seconds=random.randint(5, 50)))

    for log in (menu_log, home_log, grid_log, workspace_log, profile_log):
        _sprinkle_change_rejections(log)

    return {
        "Menu_Dropdown_Button": {
            "allowed_versions": ["small", "medium", "large"],
            "default": "small",
            "active": menu_active,
            "change_log": menu_log,
            "time_spent_by_version_seconds": _build_time_spent(
                "Menu_Dropdown_Button", menu_active, scale
            ),
        },
        "Home_Page_Text_Content": {
            "allowed_versions": ["small", "medium", "large"],
            "default": "small",
            "active": home_active,
            "change_log": home_log,
            "time_spent_by_version_seconds": _build_time_spent(
                "Home_Page_Text_Content", home_active, scale
            ),
        },
        "Community_Project_Grid": {
            "allowed_versions": ["v1", "v2", "v3"],
            "default": "v1",
            "active": grid_active,
            "change_log": grid_log,
            "time_spent_by_version_seconds": _build_time_spent(
                "Community_Project_Grid", grid_active, scale
            ),
        },
        "Workspace_Left_Buttons": {
            "allowed_versions": ["v1", "v2"],
            "default": "v1",
            "active": workspace_active,
            "change_log": workspace_log,
            "time_spent_by_version_seconds": _build_time_spent(
                "Workspace_Left_Buttons", workspace_active, scale
            ),
        },
        "Profile_Display_Info": {
            "allowed_versions": ["v1", "v2"],
            "default": "v1",
            "active": profile_active,
            "change_log": profile_log,
            "time_spent_by_version_seconds": _build_time_spent(
                "Profile_Display_Info", profile_active, scale
            ),
        },
    }


def build_document(doc_id: int) -> dict:
    conditions_affect_use, conditions = _random_conditions()
    session_total = _scale_total_around_target()
    # Keep total_time_spent_seconds aligned with target band (~600)
    session_total = max(560, min(640, session_total))

    age = int(random.gauss(28, 6))
    age = max(18, min(45, age))

    sex = random.choices(
        ["male", "female", "other"],
        weights=[0.58, 0.38, 0.04],
        k=1,
    )[0]

    return {
        "id": doc_id,
        "age": age,
        "sex": sex,
        "conditions_affect_use": conditions_affect_use,
        "conditions": conditions,
        "ui_changes": build_ui_changes(session_total),
        "total_time_spent_seconds": session_total,
    }


async def main() -> None:
    random.seed()
    client = AsyncIOMotorClient(get_mongo_uri())
    try:
        coll = client[DB_NAME][COLLECTION_NAME]

        existing = await coll.find_one(sort=[("id", -1)], projection={"id": 1})
        start_id = (existing["id"] + 1) if existing else 1

        docs = [build_document(start_id + i) for i in range(SAMPLE_SIZE)]
        result = await coll.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} documents into {DB_NAME}.{COLLECTION_NAME}")
        print(f"id range: {start_id} .. {start_id + SAMPLE_SIZE - 1}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())