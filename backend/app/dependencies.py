from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.config import settings
from app.db.session import get_db
from app.models.user import User, RoleEnum
from app.services.user_service import get_password_signature

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        token_pwd_sig = payload.get("pwd_sig")
    except JWTError:
        raise credentials_exception

    # user_id is stored as String(36) — compare directly as string
    result = await db.execute(select(User).filter(User.id == str(user_id)))
    user = result.scalars().first()
    if user is None or not user.is_active or user.deleted_at is not None:
        raise credentials_exception

    # If the token includes a password signature, verify the password hasn't been changed/reset since login
    if token_pwd_sig and token_pwd_sig != get_password_signature(user.hashed_password):
        raise credentials_exception

    return user


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

def require_operator_or_above(current_user: User = Depends(get_current_user)) -> User:
    # SALON_OPERATOR has volunteer permissions; only SALON_MANAGER is authorized for management
    if current_user.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

