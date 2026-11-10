from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict
from pydantic import BaseModel

from app.db.session import get_db
from app.models.site_settings import SiteSetting
from app.models.user import User, RoleEnum
from app.dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "logo_url": "",
    "important_phones": "יוסי (רכז מתנדבים): 050-1234567\nמוקד חירום: 100",
    "wifi_info": "רשת: OutForChange_Guest\nסיסמה: Welcome2026!",
    "daily_instructions": "ברוכים הבאים לסלון!\nנא לוודא פתיחת חלונות, בדיקת עמדת קפה וכיבוד, וסיוע למבקרים לפי הצורך.",
    "important_links": "אתר יוצאים לשינוי: https://www.outforchange.org.il",
}

class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, str]

@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Get all site settings (logo, notice board) - public for all users and login page."""
    result = await db.execute(select(SiteSetting))
    rows = result.scalars().all()
    
    settings_dict = dict(DEFAULT_SETTINGS)
    for row in rows:
        settings_dict[row.key] = row.value if row.value is not None else ""
        
    return settings_dict

@router.put("")
async def update_settings(
    req: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: update site settings."""
    if current_user.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="רק מנהל רשאי לעדכן את הגדרות האתר")

    for key, value in req.settings.items():
        result = await db.execute(select(SiteSetting).filter(SiteSetting.key == key))
        setting_obj = result.scalars().first()
        if setting_obj:
            setting_obj.value = value
        else:
            setting_obj = SiteSetting(key=key, value=value)
            db.add(setting_obj)
            
    await db.commit()
    return {"message": "ההגדרות עודכנו בהצלחה"}
