from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut, UserResetPassword
from app.models.user import User
from app.dependencies import require_manager
from app.services.user_service import create_user, list_users, deactivate_user, reset_user_password

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user_route(user: UserCreate, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    return await create_user(db, user, requester)

@router.get("", response_model=list[UserOut])
@router.get("/", response_model=list[UserOut])
async def list_users_route(db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    return await list_users(db)

@router.put("/{user_id}/reset-password", response_model=UserOut)
@router.post("/{user_id}/reset-password", response_model=UserOut)
async def reset_password_route(user_id: str, data: UserResetPassword, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    return await reset_user_password(db, user_id, data.password, requester)

@router.delete("/{user_id}", response_model=UserOut)
async def delete_user_route(user_id: str, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    return await deactivate_user(db, user_id, requester)

@router.delete("/{user_id}/hard")
async def hard_delete_user_route(user_id: str, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    from app.services.user_service import hard_delete_user
    return await hard_delete_user(db, user_id, requester)
