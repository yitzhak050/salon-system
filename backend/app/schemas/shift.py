from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional
import datetime
from app.models.shift import ShiftSlotEnum

class ShiftAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shift_id: str
    user_id: str
    user_name: Optional[str] = None
    clock_in: Optional[datetime.datetime] = None
    clock_out: Optional[datetime.datetime] = None
    hours_logged: Optional[float] = None
    notes: Optional[str] = None

class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    date: datetime.date
    slot: ShiftSlotEnum
    is_active: bool
    max_volunteers: int = 1
    title: Optional[str] = None
    assignment_count: int = 0
    assignments: list[ShiftAssignmentOut] = []

class MonthlyShiftsRequest(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2024)

class CreateShiftRequest(BaseModel):
    date: datetime.date
    slot: ShiftSlotEnum
    title: Optional[str] = None
    max_volunteers: int = Field(default=1, ge=1, le=10)

class UpdateShiftRequest(BaseModel):
    title: Optional[str] = None
    max_volunteers: Optional[int] = Field(default=None, ge=1, le=10)
    is_active: Optional[bool] = None

class CustomSignupRequest(BaseModel):
    date: datetime.date
    slot: Optional[ShiftSlotEnum] = None
    start_time: str = "10:00"
    end_time: str = "14:00"
    notes: Optional[str] = None

class AssignRequest(BaseModel):
    shift_id: str = Field(validation_alias=AliasChoices('shift_id', 'shiftId'))
    user_id: Optional[str] = Field(default=None, validation_alias=AliasChoices('user_id', 'userId'))
    notes: Optional[str] = None

class ClockRequest(BaseModel):
    shift_id: str = Field(validation_alias=AliasChoices('shift_id', 'shiftId'))
    user_id: Optional[str] = Field(default=None, validation_alias=AliasChoices('user_id', 'userId'))

class BatchShiftsRequest(BaseModel):
    shift_ids: list[str] = Field(validation_alias=AliasChoices('shift_ids', 'shiftIds'))

class BatchAssignRequest(BaseModel):
    shift_ids: list[str] = Field(validation_alias=AliasChoices('shift_ids', 'shiftIds'))
    user_id: str = Field(validation_alias=AliasChoices('user_id', 'userId'))



