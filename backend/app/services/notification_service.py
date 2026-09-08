from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from app.models.notification import Notification
from fastapi import HTTPException

async def create_in_app_notification(db: AsyncSession, user_id: str, message: str) -> Notification:
    notif = Notification(user_id=str(user_id), message=message, is_read=False)
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif

async def get_notifications(db: AsyncSession, user_id: str) -> list:
    result = await db.execute(
        select(Notification)
        .filter(Notification.user_id == str(user_id))
        .order_by(Notification.created_at.desc())
    )
    return list(result.scalars().all())

async def mark_notification_as_read(db: AsyncSession, notification_id: str, user_id: str) -> Notification:
    result = await db.execute(
        select(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == str(user_id)
        )
    )
    notif = result.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif

async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == str(user_id))
        .where(Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount

def send_sms_stub(phone: str, message: str) -> None:
    # TODO: חבר כאן ספק SMS (Inforu, Twilio וכו')
    print(f"[SMS STUB → {phone}]: {message}")
