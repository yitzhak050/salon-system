from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.session import engine
from app.db.base import Base
from app.db.audit_logger import AuditMiddleware
from app.api import auth, users, shifts, notifications, reports, checklist
from app.config import settings

from app.db.session import engine, AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.services.user_service import get_password_hash
from sqlalchemy.future import select
from fastapi import Request
import logging
import time

# Configure application-wide logging
logging.basicConfig(
    filename='salon_backend.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # In dev, create all tables. In prod, use Alembic migrations.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS max_volunteers INTEGER DEFAULT 1;"))
            await conn.execute(text("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS title VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR;"))
        except Exception:
            pass

    # Seed first admin user if DB is empty or phone not present
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).filter(User.phone == settings.FIRST_ADMIN_PHONE)
        )
        existing_admin = result.scalars().first()
        if not existing_admin:
            admin = User(
                name=settings.FIRST_ADMIN_NAME,
                phone=settings.FIRST_ADMIN_PHONE,
                role=RoleEnum.SALON_MANAGER,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD)
            )
            session.add(admin)
            await session.commit()
            print(f"✨ Default admin created: Phone={settings.FIRST_ADMIN_PHONE}")

    yield


app = FastAPI(title="מערכת ניהול התנדבות", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(AuditMiddleware)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = None
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Request error: {request.method} {request.url.path} - {str(e)}", exc_info=True)
        raise
    finally:
        process_time = time.time() - start_time
        status_code = response.status_code if response else 500
        # Don't log spammy endpoints if needed, but for now log everything
        logger.info(f"{request.method} {request.url.path} - Status: {status_code} - Time: {process_time:.4f}s")
    return response

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(shifts.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(checklist.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Volunteer Salon Management API"}
