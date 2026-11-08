import uuid
import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from app.db.base import Base
from app.utils.timezone import now_il_naive

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_il_naive)
