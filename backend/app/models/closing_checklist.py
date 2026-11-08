import uuid
import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from app.db.base import Base
from app.utils.timezone import now_il_naive

class ClosingTask(Base):
    __tablename__ = "closing_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)

class ClosingTaskCompletion(Base):
    __tablename__ = "closing_task_completions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("closing_tasks.id"), nullable=False)
    shift_assignment_id = Column(String(36), ForeignKey("shift_assignments.id"), nullable=False)
    completed_at = Column(DateTime, default=now_il_naive)
    notes = Column(String, nullable=True)
