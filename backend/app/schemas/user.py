from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime
from app.models.user import RoleEnum

class UserCreate(BaseModel):
    name: str
    phone: str
    role: RoleEnum = RoleEnum.EVENT_VOLUNTEER
    password: str
    email: Optional[str] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
    email: Optional[str] = None
    role: RoleEnum
    is_active: bool
    created_at: datetime.datetime

class UserLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: str
    role: RoleEnum

class UserResetPassword(BaseModel):
    password: str

class UserProfileUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

class UserVerifyPassword(BaseModel):
    old_password: str

class BulkImportResult(BaseModel):
    created_count: int
    skipped_count: int
    created_users: List[str]
    skipped_users: List[str]


