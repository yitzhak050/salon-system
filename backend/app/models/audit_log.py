import uuid
import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.db.base import Base
from app.utils.timezone import now_il_naive

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    action_type = Column(String, nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=now_il_naive)
