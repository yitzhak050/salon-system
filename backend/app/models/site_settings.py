from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String(50), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())
