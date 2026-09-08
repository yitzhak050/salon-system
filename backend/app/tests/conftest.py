import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
import uuid
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User, RoleEnum
from app.services.user_service import get_password_hash, create_access_token

engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(autouse=True)
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest_asyncio.fixture
async def manager_token():
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            name="מנהל ראשי",
            phone="0501234567",
            role=RoleEnum.SALON_MANAGER,
            hashed_password=get_password_hash("password123")
        )
        session.add(user)
        await session.commit()
        return create_access_token({"user_id": user.id, "role": user.role.value})

@pytest_asyncio.fixture
async def volunteer_token():
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            name="ישראל ישראלי",
            phone="0507654321",
            role=RoleEnum.EVENT_VOLUNTEER,
            hashed_password=get_password_hash("password123")
        )
        session.add(user)
        await session.commit()
        return create_access_token({"user_id": user.id, "role": user.role.value})

@pytest_asyncio.fixture
async def volunteer2_token():
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            name="מתנדב שני",
            phone="0509999999",
            role=RoleEnum.EVENT_VOLUNTEER,
            hashed_password=get_password_hash("password123")
        )
        session.add(user)
        await session.commit()
        return create_access_token({"user_id": user.id, "role": user.role.value})

@pytest_asyncio.fixture
async def operator_token():
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            name="מפעיל סלון",
            phone="0508888888",
            role=RoleEnum.SALON_OPERATOR,
            hashed_password=get_password_hash("password123")
        )
        session.add(user)
        await session.commit()
        return create_access_token({"user_id": user.id, "role": user.role.value})


