from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import datetime
from app.models.shift import ShiftSlotEnum

class VolunteerStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    user_name: str
    total_hours: float = 0.0
    shift_count: int = 0
    goal_hours: float = 60.0
    progress_pct: float = 0.0
    year: Optional[int] = None

class AttendanceShiftItem(BaseModel):
    assignment_id: str
    shift_id: str
    date: datetime.date
    day_of_week: str
    slot: str
    hours_range: str
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    hours_logged: float = 0.0
    status: str
    notes: Optional[str] = None

class VolunteerAttendanceReport(BaseModel):
    user_id: str
    user_name: str
    year: Optional[int] = None
    period_label: Optional[str] = None
    total_hours: float
    shift_count: int
    records: List[AttendanceShiftItem]

class ShiftGap(BaseModel):
    date: datetime.date
    slot: ShiftSlotEnum

class AdminStats(BaseModel):
    month: int
    year: int
    shifts_with_gap: List[ShiftGap]
    volunteer_stats: List[VolunteerStats]

