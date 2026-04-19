from __future__ import annotations

from typing import Any

from model import AdaptationEvaluateResponse, DwellZoomTrackingResult

DEFAULT_ZOOM_IN_THRESHOLD = 1.15
ADAPT_DWELL_THRESHOLD_SECONDS = 60.0

MENU_NEAR_MISS_THRESHOLD = 2
WORKSPACE_RAPID_THRESHOLD = 3
PROFILE_STRUGGLE_THRESHOLD = 3

MENU_ELEMENT_ID = "Menu_Dropdown_Button"
HOME_ELEMENT_ID = "Home_Page_Text_Content"
GRID_ELEMENT_ID = "Community_Project_Grid"
WORKSPACE_ELEMENT_ID = "Workspace_Left_Buttons"
PROFILE_DISPLAY_ELEMENT_ID = "Profile_Display_Info"

#No proposal response
def _no_proposal() -> AdaptationEvaluateResponse:
    return AdaptationEvaluateResponse(should_propose=False)

#Evaluate the dwell zoom track
def evaluate_dwell_zoom_track(
    dwell_time_seconds: float,
    zoom_level: float,
    zoom_in_threshold: float = DEFAULT_ZOOM_IN_THRESHOLD,
) -> DwellZoomTrackingResult:
    return DwellZoomTrackingResult(
        dwell_threshold_seconds=ADAPT_DWELL_THRESHOLD_SECONDS,
        dwell_time_seconds=dwell_time_seconds,
        zoom_level=zoom_level,
        dwell_threshold_met=dwell_time_seconds >= ADAPT_DWELL_THRESHOLD_SECONDS,
        zoom_in_threshold_met=zoom_level >= zoom_in_threshold,
    )

#Check if a change log entry has been rejected
def _change_log_entry_rejected(
    element: dict[str, Any], from_version: str, to_version: str
) -> bool:
    for entry in element.get("change_log") or []:
        if not isinstance(entry, dict):
            continue
        if (
            entry.get("from_version") == from_version
            and entry.get("to_version") == to_version
            and entry.get("change_rejected") is True
        ):
            return True
    return False

#Try to get the next allowed version
def try_next_version_proposal(element: dict[str, Any] | None) -> tuple[str | None, str | None]:
    """If the user can step to the next allowed version, return (from_version, to_version)."""
    if not element:
        return None, None

    allowed = element.get("allowed_versions") or []
    active = element.get("active")
    if active not in allowed:
        return None, None

    from_index = allowed.index(active)
    if from_index >= len(allowed) - 1:
        return None, None

    from_v = active
    to_v = allowed[from_index + 1]

    #Check if the change log entry has been rejected
    if _change_log_entry_rejected(element, from_v, to_v):
        return None, None

    return from_v, to_v

#Response to propose a new version
def _response_propose(element_id: str, element: dict[str, Any] | None) -> AdaptationEvaluateResponse:
    from_v, to_v = try_next_version_proposal(element)
    if from_v is None or to_v is None:
        return AdaptationEvaluateResponse(should_propose=False)
    return AdaptationEvaluateResponse(
        should_propose=True,
        element_id=element_id,
        from_version=from_v,
        to_version=to_v,
    )

#Get the UI element
def _get_ui_element(ui_changes: Any, element_id: str) -> dict[str, Any] | None:
    if not ui_changes:
        return None
    if hasattr(ui_changes, "model_dump"):
        ui_changes = ui_changes.model_dump(by_alias=True)
    if not isinstance(ui_changes, dict):
        return None
    raw = ui_changes.get(element_id)
    if raw is None:
        return None
    if hasattr(raw, "model_dump"):
        return raw.model_dump(by_alias=True)
    return dict(raw) if isinstance(raw, dict) else None

#Check if the dwell zoom is allowed
def _dwell_zoom_allowed(element_id: str | None, page: Any) -> bool:
    if element_id == HOME_ELEMENT_ID:
        return page == "home"
    if element_id == GRID_ELEMENT_ID:
        return page == "search"
    return False

#Evaluate the adaptation event
def evaluate_adaptation_event(
    event: str,
    payload: dict[str, Any],
    context: dict[str, Any],
    session: dict[str, Any],
) -> AdaptationEvaluateResponse:
    """
    Central adaptation rules: same semantics as the former App.js proposeNextVersion + triggers.
    """
    ui_changes = session.get("ui_changes")
    page = (context or {}).get("page")

    if event == "dwell_zoom":
        element_id = payload.get("element_id")
        if element_id not in (HOME_ELEMENT_ID, GRID_ELEMENT_ID):
            return _no_proposal()

        if not _dwell_zoom_allowed(element_id, page):
            return _no_proposal()

        zoom_in_threshold = float(payload.get("zoom_in_threshold", DEFAULT_ZOOM_IN_THRESHOLD))
        dwell = float(payload.get("dwell_time_seconds", 0))
        zoom_level = float(payload.get("zoom_level", 1))
        dz = evaluate_dwell_zoom_track(dwell, zoom_level, zoom_in_threshold)
        if not dz.dwell_threshold_met and not dz.zoom_in_threshold_met:
            return _no_proposal()

        return _response_propose(element_id, _get_ui_element(ui_changes, element_id))

    if event == "menu_linger_complete":
        return _response_propose(MENU_ELEMENT_ID, _get_ui_element(ui_changes, MENU_ELEMENT_ID))

    if event == "menu_near_miss":
        count = int(payload.get("count", 0))
        if count < MENU_NEAR_MISS_THRESHOLD:
            return _no_proposal()
        return _response_propose(MENU_ELEMENT_ID, _get_ui_element(ui_changes, MENU_ELEMENT_ID))

    if event == "workspace_linger":
        if page != "workspace":
            return _no_proposal()
        return _response_propose(
            WORKSPACE_ELEMENT_ID, _get_ui_element(ui_changes, WORKSPACE_ELEMENT_ID)
        )

    if event == "workspace_rapid_switch":
        if page != "workspace":
            return _no_proposal()
            
        count = int(payload.get("count", 0))
        if count < WORKSPACE_RAPID_THRESHOLD:
            return _no_proposal()

        return _response_propose(
            WORKSPACE_ELEMENT_ID, _get_ui_element(ui_changes, WORKSPACE_ELEMENT_ID)
        )

    if event == "profile_struggle":
        if page != "profile":
            return _no_proposal()

        count = int(payload.get("count", 0))
        if count < PROFILE_STRUGGLE_THRESHOLD:
            return _no_proposal()

        return _response_propose(
            PROFILE_DISPLAY_ELEMENT_ID,
            _get_ui_element(ui_changes, PROFILE_DISPLAY_ELEMENT_ID),
        )

    return _no_proposal()
