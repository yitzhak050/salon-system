from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import bcrypt
from jose import jwt
import datetime
from fastapi import HTTPException
from app.models.user import User, RoleEnum
from app.schemas.user import UserCreate
from app.config import settings

# bcrypt 5.x — direct calls (passlib not compatible with bcrypt>=5.0)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def create_user(db: AsyncSession, user_data: UserCreate, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can create users")

    result = await db.execute(select(User).filter(User.phone == user_data.phone))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = User(
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, phone: str, password: str) -> str:
    result = await db.execute(select(User).filter(User.phone == phone))
    user = result.scalars().first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return create_access_token(data={
        "sub": str(user.id),
        "user_id": str(user.id),
        "role": user.role.value,
        "name": user.name
    })


async def list_users(db: AsyncSession) -> list:
    result = await db.execute(select(User).filter(User.deleted_at == None))
    return list(result.scalars().all())

async def deactivate_user(db: AsyncSession, user_id: str, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can change user status")

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Toggle active status - does NOT delete the user
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return user

async def reset_user_password(db: AsyncSession, user_id: str, new_password: str, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can reset passwords")

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    await db.refresh(user)
    return user

async def hard_delete_user(db: AsyncSession, user_id: str, requester: User) -> dict:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete users")
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # First: delete all shift assignments for this user (past and future)
    from app.models.shift import ShiftAssignment
    assignments_res = await db.execute(
        select(ShiftAssignment).filter(ShiftAssignment.user_id == user_id)
    )
    for assignment in assignments_res.scalars().all():
        await db.delete(assignment)
    
    await db.flush()  # flush assignments deletion before deleting user
    
    # Then permanently delete the user
    await db.delete(user)
    await db.commit()
    return {"message": "User and all their shift assignments deleted permanently"}
