from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
import datetime
from fastapi import HTTPException
from app.models.closing_checklist import ClosingTask, ClosingTaskCompletion
from app.models.user import User, RoleEnum

async def get_checklist(db: AsyncSession) -> list[ClosingTask]:
    res = await db.execute(select(ClosingTask).order_by(ClosingTask.order_index))
    return list(res.scalars().all())

async def create_task(db: AsyncSession, title: str, description: str, order_index: int, requester: User) -> ClosingTask:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    task = ClosingTask(
        title=title,
        description=description,
        order_index=order_index
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

async def update_task(db: AsyncSession, task_id: str, title: str, description: str, requester: User) -> ClosingTask:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    res = await db.execute(select(ClosingTask).filter(ClosingTask.id == str(task_id)))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.title = title
    task.description = description
    await db.commit()
    await db.refresh(task)
    return task

async def delete_task(db: AsyncSession, task_id: str, requester: User) -> None:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    res = await db.execute(select(ClosingTask).filter(ClosingTask.id == str(task_id)))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()


from typing import Optional
from app.models.shift import ShiftAssignment

async def complete_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    assignment_id: uuid.UUID,
    notes: str,
    requester: Optional[User] = None,
) -> ClosingTaskCompletion:
    if requester is not None and requester.role != RoleEnum.SALON_MANAGER:
        res = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.id == str(assignment_id)))
        assignment = res.scalars().first()
        if not assignment:
            raise HTTPException(status_code=404, detail="שיבוץ לא נמצא")
        if str(assignment.user_id) != str(requester.id):
            raise HTTPException(status_code=403, detail="אין הרשאה לסמן משימות עבור משמרת של משתמש אחר")

    comp = ClosingTaskCompletion(
        task_id=str(task_id),
        shift_assignment_id=str(assignment_id),
        notes=notes
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp

async def get_completions_for_shift(db: AsyncSession, assignment_id: uuid.UUID) -> list[ClosingTaskCompletion]:
    res = await db.execute(select(ClosingTaskCompletion).filter(ClosingTaskCompletion.shift_assignment_id == str(assignment_id)))
    return list(res.scalars().all())
