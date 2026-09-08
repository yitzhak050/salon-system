from pydantic import BaseModel, ConfigDict
import datetime
from app.models.user import RoleEnum

class UserCreate(BaseModel):
    name: str
    phone: str
    role: RoleEnum
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
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

