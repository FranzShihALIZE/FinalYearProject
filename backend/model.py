from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UIChangeLogEntry(BaseModel):
    changed_at: datetime
    from_version: str
    to_version: str
    suggested_by_app: bool
    change_rejected: bool
    rolled_back: bool = False


class UIElementChange(BaseModel):
    allowed_versions: list[str]
    default_version: str = Field(alias="default")
    active: str
    change_log: list[UIChangeLogEntry]
    time_spent_by_version_seconds: dict[str, int]

    model_config = {"populate_by_name": True}


class UIChanges(BaseModel):
    """Tracked UI elements only. Legacy docs may include removed keys; those are ignored."""

    model_config = ConfigDict(extra="ignore")

    Menu_Dropdown_Button: UIElementChange
    Home_Page_Text_Content: UIElementChange
    Community_Project_Grid: UIElementChange
    Workspace_Left_Buttons: UIElementChange
    Profile_Display_Info: UIElementChange


class UserSessionData(BaseModel):
    id: int
    age: int
    sex: str
    conditions_affect_use: bool = False
    conditions: str
    ui_changes: UIChanges
    total_time_spent_seconds: int


class DwellZoomTrackingRequest(BaseModel):
    dwell_time_seconds: float
    zoom_level: float
    zoom_in_threshold: float = 1.15


class DwellZoomTrackingResult(BaseModel):
    dwell_threshold_seconds: float
    dwell_time_seconds: float
    zoom_level: float
    dwell_threshold_met: bool
    zoom_in_threshold_met: bool


class AdaptationEvaluateRequest(BaseModel):
    """Client sends raw metrics + event type; server decides whether to open a proposal."""

    session_id: int
    event: str
    payload: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)


class AdaptationEvaluateResponse(BaseModel):
    should_propose: bool
    element_id: str | None = None
    from_version: str | None = None
    to_version: str | None = None
