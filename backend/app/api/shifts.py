from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import datetime
from app.db.session import get_db
from app.schemas.shift import (
    ShiftOut, MonthlyShiftsRequest, AssignRequest, ClockRequest,
    ShiftAssignmentOut, BatchShiftsRequest, CreateShiftRequest,
    UpdateShiftRequest, CustomSignupRequest
)
from app.models.user import User
from app.dependencies import require_manager, get_current_user
from app.services.shift_service import (
    generate_monthly_shifts, get_shifts_for_month,
    assign_volunteer_to_shift, unassign_volunteer,
    clock_in_shift, clock_out_shift,
    create_shift, update_shift, custom_shift_signup
)

router = APIRouter(prefix="/shifts", tags=["shifts"])

@router.post("", response_model=ShiftOut)
@router.post("/", response_model=ShiftOut)
async def create_shift_route(
    req: CreateShiftRequest,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    return await create_shift(db, req, requester)

@router.patch("/{shift_id}", response_model=ShiftOut)
async def update_shift_route(
    shift_id: str,
    req: UpdateShiftRequest,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    return await update_shift(db, shift_id, req, requester)

@router.post("/custom-signup", response_model=ShiftAssignmentOut)
async def custom_signup_route(
    req: CustomSignupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await custom_shift_signup(db, req, current_user)

@router.post("/generate", response_model=list[str])
async def generate_shifts_route(
    req: MonthlyShiftsRequest,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    ids = await generate_monthly_shifts(db, req.month, req.year, requester)
    return [str(i) for i in ids]

@router.get("", response_model=list[ShiftOut])
@router.get("/", response_model=list[ShiftOut])
async def get_shifts_route(month: int, year: int, db: AsyncSession = Depends(get_db)):
    return await get_shifts_for_month(db, month, year)

@router.post("/assign", response_model=ShiftAssignmentOut)
async def assign_volunteer_route(
    req: AssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = req.user_id if req.user_id else current_user.id
    return await assign_volunteer_to_shift(db, req.shift_id, target_user, notes=req.notes)


@router.delete("/assign/{assignment_id}")
async def unassign_volunteer_route(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await unassign_volunteer(db, assignment_id, current_user)
    return {"status": "ok"}

@router.post("/clock-in", response_model=ShiftAssignmentOut)
async def clock_in_route(
    req: ClockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = req.user_id if req.user_id else current_user.id
    return await clock_in_shift(db, req.shift_id, target_user, datetime.datetime.now(datetime.UTC))

@router.post("/clock-out", response_model=ShiftAssignmentOut)
async def clock_out_route(
    req: ClockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = req.user_id if req.user_id else current_user.id
    return await clock_out_shift(db, req.shift_id, target_user, datetime.datetime.now(datetime.UTC))

@router.delete("/{shift_id}")
async def delete_shift_route(
    shift_id: str,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    from app.services.shift_service import delete_shift
    await delete_shift(db, shift_id, requester)
    return {"status": "ok"}

@router.post("/batch-delete")
async def batch_delete_shifts_route(
    req: BatchShiftsRequest,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    from app.services.shift_service import batch_delete_shifts
    count = await batch_delete_shifts(db, req.shift_ids, requester)
    return {"deleted": count}

@router.post("/delete-weekends")
async def delete_weekends_route(
    month: int,
    year: int,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    from app.services.shift_service import delete_weekend_shifts
    count = await delete_weekend_shifts(db, month, year, requester)
    return {"deleted_weekends": count}

@router.post("/batch-unassign")
async def batch_unassign_shifts_route(
    req: BatchShiftsRequest,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager)
):
    from app.services.shift_service import batch_unassign_shifts
    count = await batch_unassign_shifts(db, req.shift_ids, requester)
    return {"unassigned": count}

