from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

#UI Change Log Entry
class UIChangeLogEntry(BaseModel):
    changed_at: datetime
    from_version: str
    to_version: str
    suggested_by_app: bool
    change_rejected: bool
    rolled_back: bool = False

#UI element change that gets tracked fo
class UIElementChange(BaseModel):
    allowed_versions: list[str]
    default_version: str = Field(alias="default")
    active: str
    change_log: list[UIChangeLogEntry]
    time_spent_by_version_seconds: dict[str, int]
    model_config = {"populate_by_name": True}

#UI changes that are tracked for a session of a user 
class UIChanges(BaseModel):
    # extra="ignore" means that any extra keys in the JSON will be ignored
    model_config = ConfigDict(extra="ignore")

    #UI elements that have their changes tracked
    Menu_Dropdown_Button: UIElementChange
    Home_Page_Text_Content: UIElementChange
    Community_Project_Grid: UIElementChange
    Workspace_Left_Buttons: UIElementChange
    Profile_Display_Info: UIElementChange

#User session data that is stored in the database
class UserSessionData(BaseModel):
    id: int
    age: int
    sex: str
    conditions_affect_use: bool = False
    conditions: str
    ui_changes: UIChanges
    total_time_spent_seconds: int

#Request for dwell zoom tracking
class DwellZoomTrackingRequest(BaseModel):
    dwell_time_seconds: float
    zoom_level: float
    zoom_in_threshold: float = 1.15

#Result of dwell zoom tracking
class DwellZoomTrackingResult(BaseModel):
    dwell_threshold_seconds: float
    dwell_time_seconds: float
    zoom_level: float
    dwell_threshold_met: bool
    zoom_in_threshold_met: bool

#Request for adaptation evaluation
class AdaptationEvaluateRequest(BaseModel):
    session_id: int
    event: str
    payload: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)

#Response for adaptation evaluation
class AdaptationEvaluateResponse(BaseModel):
    should_propose: bool
    element_id: str | None = None
    from_version: str | None = None
    to_version: str | None = None
