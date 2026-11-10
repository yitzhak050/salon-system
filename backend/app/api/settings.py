from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict
import re
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

ALLOWED_SETTING_KEYS = set(DEFAULT_SETTINGS.keys())

_SAFE_DATA_IMAGE_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$", re.IGNORECASE)
_SAFE_HTTP_URL_RE = re.compile(r"^https?://[^\s\"'()<>\\;]+$", re.IGNORECASE)

def sanitize_logo_url(raw_url: str) -> str:
    """Validate logo URL to prevent XSS (javascript:, data:image/svg+xml) and CSS url() injection."""
    if not raw_url:
        return ""
    val = raw_url.strip()
    if not val:
        return ""
    if _SAFE_DATA_IMAGE_RE.match(val):
        return re.sub(r"\s+", "", val)
    if _SAFE_HTTP_URL_RE.match(val):
        return val
    return ""

class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, str]

@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Public endpoint for login screen: ONLY exposes logo_url, never sensitive Wi-Fi passwords or internal phones."""
    result = await db.execute(select(SiteSetting).filter(SiteSetting.key == "logo_url"))
    row = result.scalars().first()
    logo_val = row.value if (row and row.value) else DEFAULT_SETTINGS["logo_url"]
    return {"logo_url": sanitize_logo_url(logo_val)}

@router.get("")
@router.get("/")
async def get_all_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Authenticated endpoint: returns notice board and site settings for logged-in volunteers and managers."""
    result = await db.execute(select(SiteSetting))
    rows = result.scalars().all()

    settings_dict = dict(DEFAULT_SETTINGS)
    for row in rows:
        if row.key in ALLOWED_SETTING_KEYS:
            settings_dict[row.key] = row.value if row.value is not None else ""

    settings_dict["logo_url"] = sanitize_logo_url(settings_dict.get("logo_url", ""))
    return settings_dict

@router.put("")
@router.put("/")
async def update_settings(
    req: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: update site settings."""
    if current_user.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="רק מנהל רשאי לעדכן את הגדרות האתר")

    for key, value in req.settings.items():
        if key not in ALLOWED_SETTING_KEYS:
            continue
        clean_val = value or ""
        if key == "logo_url" and clean_val.strip():
            clean_val = sanitize_logo_url(clean_val)
            if not clean_val:
                raise HTTPException(
                    status_code=400,
                    detail="כתובת הלוגו אינה תקינה או מכילה פורמט לא מאובטח (מותרים קבצי PNG/JPG/WEBP/GIF או קישור HTTPS תקין)"
                )

        result = await db.execute(select(SiteSetting).filter(SiteSetting.key == key))
        setting_obj = result.scalars().first()
        if setting_obj:
            setting_obj.value = clean_val
        else:
            setting_obj = SiteSetting(key=key, value=clean_val)
            db.add(setting_obj)
            
    await db.commit()
    return {"message": "ההגדרות עודכנו בהצלחה"}
