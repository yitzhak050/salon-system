import uuid
import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, ForeignKey, Integer
import enum
from sqlalchemy.types import Enum
from app.db.base import Base

class ShiftSlotEnum(str, enum.Enum):
    MORNING = "MORNING"    # 10:00-14:00
    AFTERNOON = "AFTERNOON"  # 14:00-18:00
    EVENING = "EVENING"    # 18:00-22:00

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date, nullable=False)
    slot = Column(Enum(ShiftSlotEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    max_volunteers = Column(Integer, default=1, nullable=False)
    title = Column(String, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shift_id = Column(String(36), ForeignKey("shifts.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    hours_logged = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
