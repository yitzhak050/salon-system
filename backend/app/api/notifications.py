from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.notification import NotificationOut
from app.models.user import User
from app.dependencies import get_current_user
from app.services.notification_service import get_notifications, mark_notification_as_read, mark_all_as_read

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=list[NotificationOut])
@router.get("/", response_model=list[NotificationOut])
async def get_my_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await get_notifications(db, current_user.id)


@router.put("/{notification_id}/read", response_model=NotificationOut)
async def read_notification(notification_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await mark_notification_as_read(db, notification_id, current_user.id)

@router.put("/read-all")
async def read_all_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = await mark_all_as_read(db, current_user.id)
    return {"updated": count}
