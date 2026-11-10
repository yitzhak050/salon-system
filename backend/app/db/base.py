from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import models so Alembic sees them
from app.models.user import User
from app.models.shift import Shift, ShiftAssignment
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.closing_checklist import ClosingTask, ClosingTaskCompletion
from app.models.site_settings import SiteSetting
