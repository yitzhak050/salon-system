from pydantic import BaseModel, ConfigDict
import datetime

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    message: str
    is_read: bool
    created_at: datetime.datetime

class NotificationCreate(BaseModel):
    user_id: str
    message: str
