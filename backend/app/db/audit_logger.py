import datetime
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt
from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.audit_log import AuditLog
import asyncio

class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware שרושם פעולות POST/PUT/DELETE לטבלת audit_logs.
    לא קורא את ה-body (כדי לא לפגוע בעיבוד ה-request),
    אלא רושם method + path + user_id בלבד.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method not in ("POST", "PUT", "DELETE"):
            return response

        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id = payload.get("user_id")
            except Exception:
                pass

        if user_id:
            action_type = f"{request.method} {request.url.path}"
            asyncio.create_task(self._log(user_id, action_type))

        return response

    @staticmethod
    async def _log(user_id: str, action_type: str) -> None:
        try:
            async with AsyncSessionLocal() as session:
                log = AuditLog(
                    user_id=str(user_id),
                    action_type=action_type,
                    timestamp=datetime.datetime.now(datetime.UTC),
                )
                session.add(log)
                await session.commit()
        except Exception:
            pass  # לא לאפשר לאודיט לשבור את הבקשה
