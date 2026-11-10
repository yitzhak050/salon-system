from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
import time
from app.db.session import get_db
from app.schemas.user import UserLogin, Token
from app.services.user_service import authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Brute-force protection: track failed login attempts per (ip, phone)
_FAILED_LOGINS: dict[str, list[float]] = defaultdict(list)
MAX_FAILED_ATTEMPTS = 10
LOCKOUT_WINDOW_SECONDS = 300  # 5 minutes

def _check_rate_limit(key: str) -> None:
    now = time.time()
    attempts = [ts for ts in _FAILED_LOGINS[key] if now - ts < LOCKOUT_WINDOW_SECONDS]
    _FAILED_LOGINS[key] = attempts
    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="נסיונות התחברות רבים מדי. נא להמתין מספר דקות ולנסות שוב."
        )

def _record_failed_attempt(key: str) -> None:
    _FAILED_LOGINS[key].append(time.time())

def _clear_failed_attempts(key: str) -> None:
    _FAILED_LOGINS.pop(key, None)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{(credentials.phone or '').strip()}"
    _check_rate_limit(rate_key)
    try:
        token = await authenticate_user(
            db,
            credentials.phone,
            credentials.password,
            remember_me=credentials.remember_me,
        )
    except HTTPException as exc:
        if exc.status_code in (400, 401):
            _record_failed_attempt(rate_key)
        raise
    _clear_failed_attempts(rate_key)
    return Token(access_token=token)
