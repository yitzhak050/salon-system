from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from pydantic import BaseModel
from app.db.session import get_db
from app.models.user import User
from app.dependencies import require_manager, get_current_user
from app.services.checklist_service import get_checklist, update_task, complete_task, get_completions_for_shift

router = APIRouter(prefix="/checklist", tags=["checklist"])

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    order_index: int = 0

class TaskUpdate(BaseModel):
    title: str
    description: str

class TaskComplete(BaseModel):
    task_id: uuid.UUID
    assignment_id: uuid.UUID
    notes: str = None

@router.get("")
@router.get("/")
async def get_checklist_route(db: AsyncSession = Depends(get_db)):
    return await get_checklist(db)

@router.post("")
@router.post("/")
async def create_task_route(req: TaskCreate, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    from app.services.checklist_service import create_task
    return await create_task(db, req.title, req.description, req.order_index, requester)

@router.put("/{task_id}")
async def update_task_route(task_id: str, req: TaskUpdate, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    return await update_task(db, task_id, req.title, req.description, requester)

@router.delete("/{task_id}")
async def delete_task_route(task_id: str, db: AsyncSession = Depends(get_db), requester: User = Depends(require_manager)):
    from app.services.checklist_service import delete_task
    await delete_task(db, task_id, requester)
    return {"status": "ok"}

@router.post("/complete")
async def complete_task_route(req: TaskComplete, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await complete_task(db, req.task_id, req.assignment_id, req.notes)

@router.get("/shift/{assignment_id}")
async def get_completions_route(assignment_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await get_completions_for_shift(db, assignment_id)

