import uuid
import datetime
from sqlalchemy import Column, String, Boolean, DateTime
import enum
from sqlalchemy.types import Enum
from app.db.base import Base
from app.utils.timezone import now_il_naive

class RoleEnum(str, enum.Enum):
    SALON_MANAGER = "SALON_MANAGER"
    SALON_OPERATOR = "SALON_OPERATOR"
    EVENT_VOLUNTEER = "EVENT_VOLUNTEER"

class User(Base):
    __tablename__ = "users"

    # String(36) stores UUID as text — works with both PostgreSQL and SQLite (tests)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_il_naive)
    deleted_at = Column(DateTime, nullable=True)
