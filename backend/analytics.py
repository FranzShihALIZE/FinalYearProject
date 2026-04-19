from __future__ import annotations

import asyncio
from collections import Counter, defaultdict
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

# Match backend/database.py and sample_data.py
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "testSessions"
COLLECTION_NAME = "userSession"

UI_ELEMENT_KEYS = [
    "Menu_Dropdown_Button",
    "Home_Page_Text_Content",
    "Community_Project_Grid",
    "Workspace_Left_Buttons",
    "Profile_Display_Info",
]


def _empty_counters_per_element() -> dict[str, Counter[str]]:
    return {k: Counter() for k in UI_ELEMENT_KEYS}


def bracket_sort_key(label: str) -> int:
    """Sort age labels like '23-27' by their lower bound."""
    return int(label.split("-", 1)[0])


def age_bracket_label(age: int, max_age: int = 45) -> str:
    """5-year brackets from 18, capped at max_age (default 45)."""
    if age < 18 or age > max_age:
        return "other"
    lo = ((age - 18) // 5) * 5 + 18
    hi = min(lo + 4, max_age)
    return f"{lo}-{hi}"


def fingerprint_final_versions(ui_changes: dict[str, Any] | None) -> tuple[str, ...] | None:
    if not ui_changes:
        return None
    parts = []
    for key in UI_ELEMENT_KEYS:
        block = ui_changes.get(key)
        if not isinstance(block, dict):
            return None
        active = block.get("active")
        if active is None:
            return None
        parts.append(str(active))
    return tuple(parts)


def count_rejected_in_session(ui_changes: dict[str, Any] | None) -> int:
    if not ui_changes:
        return 0
    n = 0
    for key in UI_ELEMENT_KEYS:
        block = ui_changes.get(key)
        if not isinstance(block, dict):
            continue
        for entry in block.get("change_log") or []:
            if isinstance(entry, dict) and entry.get("change_rejected") is True:
                n += 1
    return n


async def run_analytics() -> None:
    client = AsyncIOMotorClient(MONGO_URI)
    try:
        coll = client[DB_NAME][COLLECTION_NAME]

        # Per element: version -> count (across sessions, final `active`)
        version_counts: dict[str, Counter[str]] = {k: Counter() for k in UI_ELEMENT_KEYS}
        total_rejected = 0
        # bracket label -> element id -> Counter(version)
        bracket_element_versions: dict[str, dict[str, Counter[str]]] = defaultdict(_empty_counters_per_element)
        fingerprint_counter: Counter[tuple[str, ...]] = Counter()

        n_docs = 0
        projection = {"age": 1, "ui_changes": 1}
        async for doc in coll.find({}, projection):
            n_docs += 1
            age = doc.get("age")
            ui_changes = doc.get("ui_changes")

            if isinstance(age, int):
                bl = age_bracket_label(age)
                if bl != "other":
                    for key in UI_ELEMENT_KEYS:
                        block = ui_changes.get(key) if isinstance(ui_changes, dict) else None
                        if isinstance(block, dict):
                            av = block.get("active")
                            if av is not None:
                                bracket_element_versions[bl][key][str(av)] += 1

            if isinstance(ui_changes, dict):
                total_rejected += count_rejected_in_session(ui_changes)
                for key in UI_ELEMENT_KEYS:
                    block = ui_changes.get(key)
                    if not isinstance(block, dict):
                        continue
                    av = block.get("active")
                    if av is not None:
                        version_counts[key][str(av)] += 1

            fp = fingerprint_final_versions(ui_changes if isinstance(ui_changes, dict) else None)
            if fp is not None:
                fingerprint_counter[fp] += 1

        print("=" * 72)
        print(f"User session analytics ({DB_NAME}.{COLLECTION_NAME})")
        print(f"Sessions loaded: {n_docs}")
        print("=" * 72)

        if n_docs == 0:
            print("No documents found.")
            return

        print("\n--- Per UI element: most & least common final `active` version ---\n")
        for key in UI_ELEMENT_KEYS:
            c = version_counts[key]
            if not c:
                print(f"  {key}: (no data)")
                continue
            most_common = c.most_common()
            max_count = most_common[0][1]
            least_count = most_common[-1][1]
            most_versions = [v for v, cnt in most_common if cnt == max_count]
            least_versions = [v for v, cnt in most_common if cnt == least_count]
            print(f"  {key}")
            print(f"    Most common:   {', '.join(most_versions)} (n={max_count})")
            print(f"    Least common:  {', '.join(least_versions)} (n={least_count})")

        print("\n--- Total change_log entries with change_rejected == true ---\n")
        print(f"  {total_rejected}")

        print("\n--- Most common final `active` version per UI element, by age bracket (5y, 18–45) ---\n")

        sorted_brackets = sorted(bracket_element_versions.keys(), key=bracket_sort_key)
        for br in sorted_brackets:
            print(f"  Age {br}")
            for key in UI_ELEMENT_KEYS:
                bc = bracket_element_versions[br][key]
                if not bc:
                    print(f"    {key}: (no sessions in bracket)")
                    continue
                top_v, top_n = bc.most_common(1)[0]
                print(f"    {key}: {top_v} (n={top_n})")
            print()

        print("--- Top 3 combined final UI fingerprints (all tracked elements, in order) ---\n")
        print("  Order:", " | ".join(UI_ELEMENT_KEYS))
        for i, (fp, cnt) in enumerate(fingerprint_counter.most_common(3), start=1):
            print(f"  #{i}  count={cnt}")
            print("      " + " | ".join(fp))

        print("\n" + "=" * 72)
    finally:
        client.close()


def main() -> None:
    asyncio.run(run_analytics())


if __name__ == "__main__":
    main()